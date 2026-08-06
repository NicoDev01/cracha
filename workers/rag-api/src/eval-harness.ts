import { instanceIdFor, retrieve } from './search'
import type { Env } from './types'

/**
 * Local-only entry point for `evals/evaluate.py`.
 *
 * It runs the production `retrieve` against the real AI Search index without
 * the query secret, so a change can be measured on a live knowledge base
 * before it is deployed. It is never the worker's `main` and therefore never
 * reachable in production.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname !== '/query') {
      return Response.json({ error: 'only /query' }, { status: 404 })
    }
    try {
      const body = await request.json<{ tenant_id: string; question: string; top_k?: number }>()
      const instance = env.AI_SEARCH.get(await instanceIdFor(body.tenant_id))
      const started = Date.now()
      const { context, blocks, sources, searchQuery } = await retrieve(
        instance,
        body.question,
        body.top_k ?? 8,
      )
      return Response.json({
        context,
        blocks,
        sources,
        search_query: searchQuery,
        usage: { latency_ms: Date.now() - started },
      })
    } catch (error) {
      return Response.json({
        error: error instanceof Error ? `${error.name}: ${error.message}` : 'unknown',
        stack: error instanceof Error ? error.stack : undefined,
      }, { status: 500 })
    }
  },
}
