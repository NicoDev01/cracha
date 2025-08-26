import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
  }

  try {
    // Lazy import to avoid build-time issues
    const { supabaseAdmin } = await import('@/lib/supabase/admin')
    
    if (!supabaseAdmin) {
      return NextResponse.json({ 
        error: 'Supabase admin client not available. Please check environment variables.' 
      }, { status: 500 })
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Find user by email
    const { data: users, error: findError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (findError) {
      throw findError
    }

    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Confirm the user
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    )

    if (error) {
      throw error
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User confirmed successfully',
      user: data.user 
    })

  } catch (error) {
    console.error('Error confirming user:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}