import type { Env } from './types'

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export function json(
  _request: Request,
  _env: Env,
  body: unknown,
  status = 200,
): Response {
  return Response.json(body, { status })
}

export async function readJson<T>(request: Request): Promise<T> {
  const contentType = request.headers.get('Content-Type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new HttpError(415, 'Content-Type application/json ist erforderlich.')
  }

  try {
    return (await request.json()) as T
  } catch {
    throw new HttpError(400, 'Ungültiger JSON-Request.')
  }
}

export function assertText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${field} ist erforderlich.`)
  }

  const result = value.trim()
  if (result.length > maxLength) {
    throw new HttpError(400, `${field} ist zu lang.`)
  }
  return result
}
