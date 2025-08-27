import { NextRequest, NextResponse } from 'next/server'

// Mock database data - in production this would come from the database registry
const mockDatabases = [
  {
    id: 'nextjs-docs',
    name: 'Next.js Documentation',
    description: 'Official Next.js documentation',
    url: 'https://nextjs.org/docs',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    chunks_count: 1250,
    pages_count: 85,
    status: 'active'
  },
  {
    id: 'react-docs',
    name: 'React Documentation',
    description: 'Official React documentation',
    url: 'https://react.dev',
    created_at: '2024-01-10T14:20:00Z',
    updated_at: '2024-01-10T14:20:00Z',
    chunks_count: 890,
    pages_count: 62,
    status: 'active'
  }
]

export async function GET() {
  try {
    // In production, this would:
    // 1. Get user from authentication
    // 2. Query database registry for user's databases
    // 3. Return actual database list
    
    // For now, return mock data
    return NextResponse.json({
      success: true,
      databases: mockDatabases
    })

  } catch (error) {
    console.error('Database API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch databases',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(_request: NextRequest) {
  try {
    const body = await _request.json()
    
    // Validate required fields
    if (!body.name || !body.url) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, url' },
        { status: 400 }
      )
    }

    // In production, this would create a new database entry
    const newDatabase = {
      id: body.name.toLowerCase().replace(/\s+/g, '-'),
      name: body.name,
      description: body.description || `Database for ${body.url}`,
      url: body.url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      chunks_count: 0,
      pages_count: 0,
      status: 'pending'
    }

    return NextResponse.json({
      success: true,
      database: newDatabase
    })

  } catch (error) {
    console.error('Database creation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}