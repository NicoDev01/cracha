// Simple test script to verify Supabase authentication
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ncfrgsqfnccjfyezxjsj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZnJnc3FmbmNjamZ5ZXp4anNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NTg0NDAsImV4cCI6MjA3MDQzNDQ0MH0.Q3OaTFVoPtcC1VLYI1hZAJrDtXLNaMnfjCPx9bvogmk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAuth() {
  console.log('Testing Supabase connection...')
  
  try {
    // Test 1: Check if we can connect
    const { data, error } = await supabase.auth.getSession()
    console.log('Current session:', data.session ? 'Found' : 'None', error ? error.message : '')
    
    // Test 2: Try to create test user
    console.log('Creating test user...')
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'test123456'
    })
    
    if (signUpError && !signUpError.message.includes('already registered')) {
      console.error('Signup error:', signUpError.message)
    } else {
      console.log('Test user created or already exists')
    }
    
    // Test 3: Try to login
    console.log('Testing login...')
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'test123456'
    })
    
    if (loginError) {
      console.error('Login error:', loginError.message)
    } else {
      console.log('Login successful:', loginData.user?.email)
      console.log('Session token:', loginData.session?.access_token?.substring(0, 20) + '...')
    }
    
  } catch (error) {
    console.error('Test failed:', error.message)
  }
}

testAuth()