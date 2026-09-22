import { KnowledgeBaseCoordinator } from '../src/coordinator'
import type { Env } from '../src/types'

/** Test-only DO routing. KV is deliberately uninstrumented. Storage clones values
 * so tests cannot accidentally mutate durable state through object references. */
export function createTestCoordinatorNamespace(env: Env) {
  const stores = new Map<string, Map<string, unknown>>()
  const actors = new Map<string, KnowledgeBaseCoordinator>()
  /** Fault injection for durable storage writes, e.g. to simulate a failed commit. */
  const faults: { beforePut?: (key: string, value: unknown) => void | Promise<void> } = {}
  const id = (name: string) => ({ name, toString: () => name, equals: (other: DurableObjectId) => other.toString() === name }) as DurableObjectId
  const namespace = {
    idFromName: id,
    get(objectId: DurableObjectId) {
      const name = objectId.toString()
      if (!actors.has(name)) {
        const data = stores.get(name) ?? new Map<string, unknown>()
        stores.set(name, data)
        const storage = {
          get: async (key: string) => structuredClone(data.get(key)),
          put: async (key: string, value: unknown) => { await faults.beforePut?.(key, value); data.set(key, structuredClone(value)) },
        } as unknown as DurableObjectStorage
        actors.set(name, new KnowledgeBaseCoordinator({ id: objectId, storage } as DurableObjectState, env))
      }
      const actor = actors.get(name)!
      return { fetch: (req: Request) => actor.fetch(req) } as unknown as DurableObjectStub
    },
  } as unknown as DurableObjectNamespace
  env.COORDINATOR = namespace
  return { namespace, stores, faults, restart: () => actors.clear() }
}
