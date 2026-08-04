import { NextRequest, NextResponse } from 'next/server'

import { getWorkerEnv } from '@/lib/server/cloudflare'
import { generateGroundedAnswer } from '@/lib/server/generation'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import type { Source } from '@/types/chat'

export const dynamic = 'force-dynamic'

interface ChatBody {
  question?: string
  tenant_id?: string
  top_k?: number
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
}

interface RetrievalResponse {
  context?: string
  sources?: Array<{ id: string; title: string; url: string; snippet: string; score: number; chunk_index: string }>
  usage?: { latency_ms?: number }
  error?: string
}

export async function POST(request: NextRequest) {
  const started = Date.now()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Authentifizierung erforderlich.' }, { status: 401 })

  const body = await request.json().catch(() => null) as ChatBody | null
  const question = body?.question?.trim()
  const tenantId = body?.tenant_id?.trim()
  if (!question || question.length > 4_000 || !tenantId || tenantId.length > 160) {
    return NextResponse.json({ error: 'Frage oder Wissensbasis-ID ist ungültig.' }, { status: 400 })
  }
  const messages = Array.isArray(body?.messages)
    ? body.messages.filter((message) => (message.role === 'user' || message.role === 'assistant') && message.content.trim()).slice(-12).map((message) => ({ role: message.role, content: message.content.trim().slice(0, 2_000) }))
    : []

  const env = getWorkerEnv()
  const retrievalResponse = await env.RAG_API.fetch('https://cracha-rag.internal/query', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RAG_QUERY_SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, tenant_id: tenantId, user_id: user.id, top_k: body?.top_k ?? 6, messages }),
  })
  const retrieval = await retrievalResponse.json().catch(() => ({})) as RetrievalResponse
  if (!retrievalResponse.ok) {
    return NextResponse.json({ error: retrieval.error ?? 'Suche in der Wissensbasis fehlgeschlagen.' }, { status: retrievalResponse.status })
  }

  const sources: Source[] = (retrieval.sources ?? []).map((source) => ({
    id: source.id,
    title: source.title,
    url: source.url,
    snippet: source.snippet,
    relevance_score: source.score,
  }))
  if (!retrieval.context || sources.length === 0) {
    return NextResponse.json({
      answer: 'Ich konnte in dieser Wissensbasis keine ausreichend relevanten Informationen finden.',
      sources: [],
      usage: { latency_ms: Date.now() - started, llm_tokens: 0 },
      model: 'Cloudflare AI Search',
    })
  }

  try {
    const generated = await generateGroundedAnswer({
      ai: env.AI,
      model: env.GENERATION_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      question,
      history: messages,
      context: retrieval.context,
      sources,
    })
    return NextResponse.json({
      answer: generated.answer,
      sources,
      usage: { latency_ms: Date.now() - started, retrieval_ms: retrieval.usage?.latency_ms ?? 0, llm_tokens: generated.tokens },
      model: `${generated.model} + Cloudflare AI Search`,
    })
  } catch (error) {
    console.error(JSON.stringify({ event: 'chat_generation_failed', error: error instanceof Error ? error.message : 'unknown' }))
    return NextResponse.json({ error: 'Die Antwort konnte nicht erzeugt werden.' }, { status: 502 })
  }
}
