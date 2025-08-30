'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AuthDebug() {
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(message)
  }

  const testSupabaseConnection = async () => {
    setIsLoading(true)
    addLog('🔄 Testing Supabase connection...')
    
    try {
      const supabase = createClient()
      
      // Test basic connection
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        addLog(`❌ Session error: ${error.message}`)
      } else {
        addLog(`✅ Supabase connection successful`)
        addLog(`📊 Current session: ${data.session ? 'Active' : 'None'}`)
      }
      
      // Test environment variables
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      addLog(`🔧 Supabase URL: ${supabaseUrl?.substring(0, 30)}...`)
      addLog(`🔧 Anon Key length: ${supabaseKey?.length} characters`)
      
    } catch (error) {
      addLog(`❌ Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    setIsLoading(false)
  }

  const testGoogleAuth = async () => {
    setIsLoading(true)
    addLog('🔄 Testing Google OAuth...')
    
    try {
      const supabase = createClient()
      
      addLog(`🌐 Current origin: ${window.location.origin}`)
      addLog(`🔗 Redirect URL: ${window.location.origin}/auth/callback`)
      
      // Test if we can reach the callback route
      try {
        const response = await fetch('/auth/callback', { method: 'HEAD' })
        addLog(`📡 Callback route status: ${response.status}`)
      } catch (e) {
        addLog(`⚠️ Callback route test failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      
      if (error) {
        addLog(`❌ Google OAuth error: ${error.message}`)
        addLog(`🔍 Error details: ${JSON.stringify(error, null, 2)}`)
      } else {
        addLog(`✅ Google OAuth initiated successfully`)
        addLog(`📊 OAuth URL: ${data.url}`)
        addLog(`🚀 Redirecting to Google...`)
        // Don't set loading to false here as we're redirecting
      }
      
    } catch (error) {
      addLog(`❌ Google OAuth test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsLoading(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🔧 Auth Debug Console</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={testSupabaseConnection}
            disabled={isLoading}
            variant="outline"
          >
            Test Supabase Connection
          </Button>
          <Button 
            onClick={testGoogleAuth}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            Test Google OAuth
          </Button>
          <Button 
            onClick={clearLogs}
            variant="ghost"
          >
            Clear Logs
          </Button>
        </div>
        
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet. Click a button to start testing.</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
        
        <div className="text-sm text-gray-600">
          <p><strong>Instructions:</strong></p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>First test the Supabase connection to ensure basic setup is working</li>
            <li>Then test Google OAuth - this should redirect you to Google&apos;s login page</li>
            <li>Check the browser console for additional debug information</li>
            <li>Verify your Supabase project has Google OAuth enabled with correct redirect URLs</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}