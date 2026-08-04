import { HttpError } from './http'
import type { Env } from './types'

function bearerToken(request: Request): string {
  const authorization = request.headers.get('Authorization') ?? ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  if (!match) throw new HttpError(401, 'Authentifizierung erforderlich.')
  return match[1]
}

async function digest(value: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
}

function equalBytes(left: ArrayBuffer, right: ArrayBuffer): boolean {
  const a = new Uint8Array(left)
  const b = new Uint8Array(right)
  if (a.length !== b.length) return false

  let mismatch = 0
  for (let index = 0; index < a.length; index += 1) mismatch |= a[index] ^ b[index]
  return mismatch === 0
}

async function authenticateService(request: Request, expected: string): Promise<void> {
  const supplied = bearerToken(request)
  const [actualHash, expectedHash] = await Promise.all([
    digest(supplied),
    digest(expected),
  ])
  if (!equalBytes(actualHash, expectedHash)) throw new HttpError(401, 'Ungültiger Service-Token.')
}

export function authenticateIngest(request: Request, env: Env): Promise<void> {
  return authenticateService(request, env.INGEST_SECRET)
}

export function authenticateQuery(request: Request, env: Env): Promise<void> {
  return authenticateService(request, env.QUERY_SECRET)
}
