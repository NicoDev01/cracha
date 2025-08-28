import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🧪 Test route accessed')
  return NextResponse.json({ 
    message: 'Test route working',
    timestamp: new Date().toISOString(),
    url: request.url
  })
}