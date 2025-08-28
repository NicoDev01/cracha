import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const config = await request.json() as CrawlConfig
    
    // Validate required fields
    if (!config.url || !config.tenant_id || !config.user_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: url, tenant_id, user_id' },
        { status: 400 }
      )
    }

    console.log('🐍 Starting Python crawl with config:', config)

    // Build Python command arguments
    const args = buildPythonArgs(config)
    
    // Execute Python script via venv
    const result = await executePythonScript(args)

    if (result.success) {
      // Parse output for job information
      const jobInfo = {
        job_id: `python_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenant_id: config.tenant_id,
        status: 'completed',
        source_url: config.url,
        total_chunks: extractNumberFromOutput(result.output || '', 'chunks'),
        processed_chunks: extractNumberFromOutput(result.output || '', 'chunks'),
        estimated_cost: extractCostFromOutput(result.output || ''),
        created_at: Date.now() - parseInt(result.duration?.replace('ms', '') || '0'),
        completed_at: Date.now()
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Python crawl completed successfully',
        job_id: jobInfo.job_id,
        job: jobInfo,
        output: result.output,
        duration: result.duration
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error,
        output: result.output,
        duration: result.duration
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Python Crawl API Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

interface CrawlConfig {
  url: string;
  tenant_id: string;
  user_id?: string;
  type?: string;
  embedding_model?: string;
  max_depth?: number;
  limit?: number;
  max_concurrent?: number;
  cleanup?: boolean;
  generate_summaries?: boolean;
  ultra_fast?: boolean;
  exclude_external?: boolean;
  exclude_social_media?: boolean;
  include_patterns?: string | string[];
  exclude_domains?: string | string[];
  include_domains?: string | string[];
  url_filter?: string;
}

function buildPythonArgs(config: CrawlConfig): string[] {
  const args = [
    'crawl',
    '--url', config.url,
    '--tenant-id', config.tenant_id,
    '--user-id', config.user_id || 'default_user',
    '--type', config.type || 'single',
    '--embedding-model', config.embedding_model || 'gemini-768',
    '--force' // Skip cost confirmation
  ]

  // Add optional parameters
  if (config.max_depth) args.push('--max-depth', config.max_depth.toString())
  if (config.limit) args.push('--limit', config.limit.toString())
  if (config.max_concurrent) args.push('--max-concurrent', config.max_concurrent.toString())

  // Add boolean flags
  if (config.cleanup !== false) args.push('--cleanup')
  if (config.generate_summaries !== false) args.push('--generate-summaries')
  if (config.ultra_fast !== false) args.push('--ultra-fast')
  if (config.exclude_external) args.push('--exclude-external')
  if (config.exclude_social_media !== false) args.push('--exclude-social-media')

  // Add array parameters
  if (config.include_patterns?.length) {
    const patterns = Array.isArray(config.include_patterns) 
      ? config.include_patterns 
      : config.include_patterns.split('\n').filter((p: string) => p.trim())
    args.push('--include-patterns', ...patterns)
  }
  
  if (config.exclude_domains?.length) {
    const domains = Array.isArray(config.exclude_domains) 
      ? config.exclude_domains 
      : config.exclude_domains.split('\n').filter((d: string) => d.trim())
    args.push('--exclude-domains', ...domains)
  }
  
  if (config.include_domains?.length) {
    const domains = Array.isArray(config.include_domains) 
      ? config.include_domains 
      : config.include_domains.split(' ').filter((d: string) => d.trim())
    args.push('--include-domains', ...domains)
  }
  
  if (config.url_filter) {
    args.push('--url-filter', config.url_filter)
  }

  return args
}

async function executePythonScript(args: string[]): Promise<{
  success: boolean
  output?: string
  error?: string
  duration?: string
}> {
  return new Promise((resolve) => {
    const startTime = Date.now()
    
    // Path to Python venv and script (use ASCII version for Windows compatibility)
    const pythonPath = path.join(process.cwd(), 'python', 'venv', 'Scripts', 'python.exe')
    const scriptPath = path.join(process.cwd(), 'python', 'main_ascii.py')
    
    console.log('🐍 Python path:', pythonPath)
    console.log('📄 Script path:', scriptPath)
    console.log('🔧 Args:', args)

    // Spawn Python process
    const child = spawn(pythonPath, [scriptPath, ...args], {
      cwd: path.join(process.cwd(), 'python'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONPATH: path.join(process.cwd(), 'python'),
        PYTHONUNBUFFERED: '1',
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1'
      }
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (data) => {
      const output = data.toString()
      stdout += output
      console.log('🐍 STDOUT:', output.trim())
    })

    child.stderr?.on('data', (data) => {
      const output = data.toString()
      stderr += output
      console.log('🐍 STDERR:', output.trim())
    })

    child.on('close', (code) => {
      const duration = `${Date.now() - startTime}ms`
      console.log(`🐍 Python process finished with code: ${code}`)
      
      if (code === 0) {
        resolve({
          success: true,
          output: stdout,
          duration
        })
      } else {
        resolve({
          success: false,
          error: stderr || `Process exited with code ${code}`,
          output: stdout,
          duration
        })
      }
    })

    child.on('error', (error) => {
      const duration = `${Date.now() - startTime}ms`
      console.error('🐍 Python process error:', error)
      resolve({
        success: false,
        error: error.message,
        duration
      })
    })

    // Set timeout (10 minutes)
    setTimeout(() => {
      child.kill()
      resolve({
        success: false,
        error: 'Python script timeout after 10 minutes',
        duration: `${Date.now() - startTime}ms`
      })
    }, 10 * 60 * 1000)
  })
}

// Helper functions to extract information from Python CLI output
function extractNumberFromOutput(output: string, type: 'chunks' | 'pages'): number {
  const patterns = {
    chunks: /Created (\d+) chunks/i,
    pages: /Pages Processed: (\d+)/i
  }
  
  const match = output.match(patterns[type])
  return match ? parseInt(match[1], 10) : 0
}

function extractCostFromOutput(output: string): number {
  const costMatch = output.match(/Total Cost: \$([0-9.]+)/i)
  return costMatch ? parseFloat(costMatch[1]) : 0
}