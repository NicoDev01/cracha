import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getWorkerEnv } from '@/lib/server/cloudflare'
import { creditsAdmin, settleCrawlCredits } from '@/lib/server/credits'
import { coordinatorCommand } from '@/lib/server/database-registry'

const bodySchema = z.object({
  hold_reference: z.string().uuid(),
  status: z.enum(['completed', 'failed', 'cancelled']),
  indexed_pages: z.number().int().min(0).max(500),
})

export async function POST(request: NextRequest) {
  const secret = getWorkerEnv().CRAWLER_API_SECRET
  const supplied = request.headers.get('authorization') ?? ''
  if (!secret || supplied !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid settlement' }, { status: 400 })
  try {
    const { data, error } = await creditsAdmin().from('credit_holds').select('user_id,database_id').eq('reference', parsed.data.hold_reference).maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ settled: true }) // Replayed callback.
    if (parsed.data.status !== 'completed' && data.database_id) {
      await coordinatorCommand(data.database_id, 'cancel-job', {
        jobId: parsed.data.hold_reference,
        reason: parsed.data.status === 'cancelled' ? 'Vom Benutzer abgebrochen.' : 'Crawl konnte nicht abgeschlossen werden.',
      })
    }
    await settleCrawlCredits(parsed.data.hold_reference, parsed.data.status === 'completed' ? parsed.data.indexed_pages : 0)
    return NextResponse.json({ settled: true })
  } catch {
    console.error(JSON.stringify({ event: 'crawl_settlement_failed', reference: parsed.data.hold_reference }))
    return NextResponse.json({ error: 'Settlement unavailable' }, { status: 503 })
  }
}
