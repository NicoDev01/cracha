export function GET() {
  return Response.json({ release: process.env.NEXT_PUBLIC_BUILD_SHA || 'development' }, { headers: { 'Cache-Control': 'no-store' } })
}
