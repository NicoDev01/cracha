import 'server-only'

import { getCloudflareContext } from '@opennextjs/cloudflare'

export function getWorkerEnv(): CloudflareEnv {
  try {
    return getCloudflareContext().env
  } catch {
    throw new Error('Cloudflare-Bindings sind in dieser Umgebung nicht verfügbar.')
  }
}

/**
 * Keeps the Worker alive until `work` settles, even after the reader has
 * disconnected. Outside a Worker the promise simply runs on.
 */
export function keepAlive(work: Promise<unknown>): void {
  try {
    getCloudflareContext().ctx.waitUntil(work)
  } catch {
    // Not in a Worker.
  }
}
