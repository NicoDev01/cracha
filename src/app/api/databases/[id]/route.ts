import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Database ID is required' },
        { status: 400 }
      )
    }

    // Mock database details - in production this would query the database registry
    const mockDatabase = {
      id: id,
      name: id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '),
      description: `Database for ${id}`,
      url: `https://example.com/${id}`,
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T10:30:00Z',
      chunks_count: 1250,
      pages_count: 85,
      status: 'active',
      settings: {
        embedding_model: 'gemini-768',
        chunk_size: 800,
        chunk_overlap: 120
      },
      urls: [
        `https://example.com/${id}/page1`,
        `https://example.com/${id}/page2`,
        `https://example.com/${id}/page3`
      ]
    }

    return NextResponse.json({
      success: true,
      database: mockDatabase
    })

  } catch (error) {
    console.error('Database details API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch database details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Database ID is required' },
        { status: 400 }
      )
    }

    // In production, this would:
    // 1. Delete from database registry
    // 2. Delete from vector database
    // 3. Clean up associated files

    return NextResponse.json({
      success: true,
      message: `Database ${id} deleted successfully`
    })

  } catch (error) {
    console.error('Database deletion error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Database ID is required' },
        { status: 400 }
      )
    }

    // In production, this would update the database registry
    const updatedDatabase = {
      id: id,
      name: body.name || id,
      description: body.description || `Database for ${id}`,
      updated_at: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      database: updatedDatabase
    })

  } catch (error) {
    console.error('Database update error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}