import 'server-only'

import { getCloudflareContext } from '@opennextjs/cloudflare'

export function getWorkerEnv(): CloudflareEnv {
  try {
    return getCloudflareContext().env
  } catch {
    throw new Error('Cloudflare-Bindings sind in dieser Umgebung nicht verfügbar.')
  }
}
