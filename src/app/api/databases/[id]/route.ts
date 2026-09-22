import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/supabase/server'
import { getWorkerEnv } from '@/lib/server/cloudflare'
import { getOwnedDatabase, releaseDatabase, saveDatabase, coordinatorCommand } from '@/lib/server/database-registry'
import { claimDatabaseDeletion, deallocateDatabaseSlot, deleteCrawlAccess, getActiveDeletionClaim, hasUnsettledCrawl } from '@/lib/server/credits'

export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Context) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: 'Authentifizierung erforderlich.' }, { status: 401 })
  const { id } = await params
  const database = await getOwnedDatabase(id, user.id)
  if (!database) return NextResponse.json({ success: false, error: 'Wissensbasis nicht gefunden.' }, { status: 404 })
  return NextResponse.json({ success: true, database })
}

export async function PUT(request: NextRequest, { params }: Context) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: 'Authentifizierung erforderlich.' }, { status: 401 })
  const { id } = await params
  const database = await getOwnedDatabase(id, user.id)
  if (!database) return NextResponse.json({ success: false, error: 'Wissensbasis nicht gefunden.' }, { status: 404 })
  if (database.status === 'deleting') {
    return NextResponse.json({ success: false, error: 'Wissensbasis wird derzeit gelöscht.' }, { status: 409 })
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const current = await getOwnedDatabase(id, user.id)
  if (!current) return NextResponse.json({ success: false, error: 'Wissensbasis nicht gefunden.' }, { status: 404 })
  if (current.status === 'deleting') {
    return NextResponse.json({ success: false, error: 'Wissensbasis wird derzeit gelöscht.' }, { status: 409 })
  }

  const result = await coordinatorCommand<{ database: typeof current }>(id, 'update-metadata', {
    user_id: user.id, name: body?.name, description: body?.description,
  })
  return NextResponse.json({ success: true, database: result.database })
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: 'Authentifizierung erforderlich.' }, { status: 401 })
  const { id } = await params
  const database = await getOwnedDatabase(id, user.id)

  if (!database) {
    // If the database was already released from KV during a prior partial delete,
    // check if there is an in-progress deletion claim for this user in PostgreSQL that can be completed.
    let activeClaim: { database_id: string; user_id: string; claimed_at: string } | null
    try {
      activeClaim = await getActiveDeletionClaim(user.id, id)
    } catch (err) {
      console.error(JSON.stringify({ event: 'get_active_deletion_claim_failed', databaseId: id, error: String(err) }))
      return NextResponse.json(
        { success: false, error: 'Datenbank-Löschung konnte nicht koordiniert werden.' },
        { status: 503 },
      )
    }

    if (!activeClaim) {
      return NextResponse.json({ success: false, error: 'Wissensbasis nicht gefunden.' }, { status: 404 })
    }

    const env = getWorkerEnv()
    let response: Response
    try {
      response = await env.RAG_API.fetch(
        `https://cracha-rag.internal/databases/${encodeURIComponent(id)}?user_id=${encodeURIComponent(user.id)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${env.RAG_QUERY_SECRET}` },
        },
      )
    } catch (err) {
      console.error(JSON.stringify({ event: 'rag_delete_retry_network_failed', databaseId: id, error: String(err) }))
      return NextResponse.json(
        { success: false, error: 'RAG-Dienst nicht erreichbar.' },
        { status: 503 },
      )
    }

    const result = (await response.json().catch(() => ({}))) as { error?: string }
    if (!response.ok && response.status !== 404) {
      return NextResponse.json(
        { success: false, error: result.error ?? 'Löschen fehlgeschlagen.' },
        { status: response.status },
      )
    }

    try {
      await deleteCrawlAccess(id, user.id)
      await releaseDatabase(user.id, id)
      await deallocateDatabaseSlot(user.id, id)
      return NextResponse.json({ success: true })
    } catch (cleanupErr) {
      console.error(JSON.stringify({ event: 'database_cleanup_retry_failed', databaseId: id, error: String(cleanupErr) }))
      return NextResponse.json(
        { success: false, error: 'Wissensbasis wurde gelöscht, aber die Bereinigung ist fehlgeschlagen.' },
        { status: 500 },
      )
    }
  }

  if (database.status === 'crawling' || (await hasUnsettledCrawl(user.id, id))) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Die Wissensbasis kann während eines laufenden oder noch nicht abgerechneten Crawls nicht gelöscht werden.',
      },
      { status: 409 },
    )
  }

  // Atomically claim deletion in PostgreSQL to prevent a concurrent crawl from starting
  const claim = await claimDatabaseDeletion(user.id, id).catch((err) => {
    console.error(JSON.stringify({ event: 'claim_deletion_failed', databaseId: id, error: String(err) }))
    return null
  })
  if (!claim) {
    return NextResponse.json(
      { success: false, error: 'Datenbank-Löschung konnte nicht koordiniert werden.' },
      { status: 503 },
    )
  }
  if (!claim.allowed) {
    if (claim.reason === 'not_found') {
      return NextResponse.json({ success: false, error: 'Wissensbasis nicht gefunden.' }, { status: 404 })
    }
    return NextResponse.json(
      {
        success: false,
        error:
          'Die Wissensbasis kann während eines laufenden oder noch nicht abgerechneten Crawls nicht gelöscht werden.',
      },
      { status: 409 },
    )
  }

  // Mark database status as deleting in KV immediately to reject in-flight ingest/status requests
  await saveDatabase({ ...database, status: 'deleting', updated_at: new Date().toISOString() })

  const env = getWorkerEnv()
  let response: Response
  try {
    response = await env.RAG_API.fetch(`https://cracha-rag.internal/databases/${encodeURIComponent(id)}?user_id=${encodeURIComponent(user.id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${env.RAG_QUERY_SECRET}` },
    })
  } catch (err) {
    console.error(JSON.stringify({ event: 'rag_delete_network_failed', databaseId: id, error: String(err) }))
    return NextResponse.json(
      { success: false, error: 'RAG-Dienst nicht erreichbar.' },
      { status: 503 },
    )
  }
  const result = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok && response.status !== 404) {
    return NextResponse.json({ success: false, error: result.error ?? 'Löschen fehlgeschlagen.' }, { status: response.status })
  }

  try {
    await deleteCrawlAccess(id, user.id)
    await releaseDatabase(user.id, id)
    await deallocateDatabaseSlot(user.id, id)
  } catch (cleanupErr) {
    console.error(JSON.stringify({ event: 'database_cleanup_failed', databaseId: id, error: String(cleanupErr) }))
    return NextResponse.json(
      { success: false, error: 'Wissensbasis wurde gelöscht, aber die Bereinigung ist fehlgeschlagen.' },
      { status: 500 },
    )
  }

  // Nothing to book. What the crawl cost was charged when it ran and is a row
  // in the ledger; deleting the knowledge base does not undo the fetching and
  // indexing that was paid for. The old model had to write a marker here,
  // because it counted pages by looking at the records that still existed.
  return NextResponse.json({ success: true })
}
