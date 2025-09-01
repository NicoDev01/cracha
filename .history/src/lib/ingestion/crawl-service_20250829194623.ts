import { spawn } from 'child_process'
import path from 'path'

export interface CrawlConfig {
  url: string
  tenant_id: string
  user_id: string
  type: 'single' | 'recursive' | 'sitemap' | 'batch'
  embedding_model: string
  max_depth?: number
  limit?: number
  include_patterns?: string[]
  exclude_domains?: string[]
  include_domains?: string[]
  url_filter?: string
  exclude_external?: boolean
  generate_summaries?: boolean
  ultra_fast?: boolean
  max_concurrent?: number
  force?: boolean
  cleanup?: boolean
  exclude_social_media?: boolean
}

export interface CrawlResult {
  success: boolean
  job_id: string
  message?: string
  error?: string
  output?: string
  duration?: string
  status?: string
}

export interface CrawlStatus {
  success: boolean
  job_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress?: number
  created_at?: string
  updated_at?: string
  completed_at?: string
  error?: string
  result?: unknown
}

export class CrawlService {
  private static instance: CrawlService
  
  public static getInstance(): CrawlService {
    if (!CrawlService.instance) {
      CrawlService.instance = new CrawlService()
    }
    return CrawlService.instance
  }

  async executeCrawl(config: CrawlConfig): Promise<CrawlResult> {
    const startTime = Date.now()
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      // Build command arguments
      const args = this.buildCrawlArgs(config)
      
      // Determine the correct Python command and path
      const { command, cwd } = this.getPythonCommand()
      
      console.log('Executing crawl:', { command, args, cwd })

      // Execute the crawl command
      const result = await this.executeCommand(command, args, cwd)
      
      const duration = Date.now() - startTime

      return {
        success: true,
        job_id: jobId,
        message: 'Crawl completed successfully',
        output: result.stdout,
        duration: `${duration}ms`
      }

    } catch (error) {
      const duration = Date.now() - startTime
      console.error('Crawl execution failed:', error)

      return {
        success: false,
        job_id: jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      }
    }
  }

  private buildCrawlArgs(config: CrawlConfig): string[] {
    const args = [
      'main.py',
      'crawl',
      '--url', config.url,
      '--tenant-id', config.tenant_id,
      '--user-id', config.user_id,
      '--type', config.type,
      '--embedding-model', config.embedding_model
    ]

    // Add optional parameters
    if (config.max_depth) args.push('--max-depth', config.max_depth.toString())
    if (config.limit) args.push('--limit', config.limit.toString())
    if (config.max_concurrent) args.push('--max-concurrent', config.max_concurrent.toString())
    
    // Add boolean flags
    if (config.force) args.push('--force')
    if (config.cleanup) args.push('--cleanup')
    if (config.generate_summaries) args.push('--generate-summaries')
    if (config.ultra_fast) args.push('--ultra-fast')
    if (config.exclude_external) args.push('--exclude-external')
    if (config.exclude_social_media) args.push('--exclude-social-media')

    // Add array parameters
    if (config.include_patterns?.length) {
      args.push('--include-patterns', ...config.include_patterns)
    }
    if (config.exclude_domains?.length) {
      args.push('--exclude-domains', ...config.exclude_domains)
    }
    if (config.include_domains?.length) {
      args.push('--include-domains', ...config.include_domains)
    }
    if (config.url_filter) {
      args.push('--url-filter', config.url_filter)
    }

    return args
  }

  private getPythonCommand(): { command: string; cwd: string } {
    const isWindows = process.platform === 'win32'
    const ingestionPath = path.join(process.cwd(), 'src', 'ingestion')

    if (isWindows) {
      // Try WSL first, then fallback to Windows Python
      return {
        command: 'wsl',
        cwd: ingestionPath
      }
    } else {
      // Unix/Linux/macOS
      return {
        command: 'python',
        cwd: ingestionPath
      }
    }
  }

  private async executeCommand(command: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      let finalArgs: string[]
      
      if (command === 'wsl') {
        // Convert Windows path to WSL path
        const wslPath = cwd.replace(/\\/g, '/').replace(/^C:/, '/mnt/c')
        
        // Try multiple Python environment activation strategies
        const pythonCommands = [
          // Try conda first
          `cd ${wslPath} && source ~/.bashrc && conda activate cracha && python ${args.join(' ')}`,
          // Try conda with different path
          `cd ${wslPath} && source ~/miniconda3/etc/profile.d/conda.sh && conda activate cracha && python ${args.join(' ')}`,
          // Try direct python3
          `cd ${wslPath} && python3 ${args.join(' ')}`,
          // Try direct python
          `cd ${wslPath} && python ${args.join(' ')}`
        ]
        
        // Use the first command for now, we'll implement fallback logic
        finalArgs = ['-e', 'bash', '-c', pythonCommands[0]]
      } else {
        finalArgs = args
      }

      const child = spawn(command, finalArgs, {
        cwd: command === 'wsl' ? undefined : cwd,
        stdio: ['pipe', 'pipe', 'pipe']
      })

      let stdout = ''
      let stderr = ''

      child.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr })
        } else {
          // If conda command failed, try fallback
          if (command === 'wsl' && (stderr.includes('conda: command not found') || code === 127)) {
            console.log('Conda not found, trying fallback Python commands...')
            this.tryFallbackCommands(cwd, args).then(resolve).catch(reject)
          } else {
            reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`))
          }
        }
      })

      child.on('error', (error) => {
        reject(error)
      })

      // Set timeout
      setTimeout(() => {
        child.kill()
        reject(new Error('Command timeout after 10 minutes'))
      }, 10 * 60 * 1000)
    })
  }

  private async tryFallbackCommands(cwd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    const wslPath = cwd.replace(/\\/g, '/').replace(/^C:/, '/mnt/c')
    
    const fallbackCommands = [
      // Try conda with different initialization
      `cd ${wslPath} && source ~/miniconda3/etc/profile.d/conda.sh && conda activate cracha && python ${args.join(' ')}`,
      // Try conda with anaconda path
      `cd ${wslPath} && source ~/anaconda3/etc/profile.d/conda.sh && conda activate cracha && python ${args.join(' ')}`,
      // Try direct python3
      `cd ${wslPath} && python3 ${args.join(' ')}`,
      // Try direct python
      `cd ${wslPath} && python ${args.join(' ')}`,
      // Try with explicit PATH
      `cd ${wslPath} && PATH=$PATH:/usr/bin:/usr/local/bin python3 ${args.join(' ')}`
    ]

    for (const cmd of fallbackCommands) {
      try {
        console.log(`Trying fallback command: ${cmd}`)
        const result = await this.executeSingleCommand('wsl', ['-e', 'bash', '-c', cmd])
        console.log('Fallback command succeeded!')
        return result
      } catch (error) {
        console.log(`Fallback command failed: ${error}`)
        continue
      }
    }

    throw new Error('All fallback commands failed. Please ensure Python is installed in WSL or install Python on Windows.')
  }

  private async executeSingleCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      })

      let stdout = ''
      let stderr = ''

      child.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr })
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`))
        }
      })

      child.on('error', (error) => {
        reject(error)
      })

      // Shorter timeout for fallback commands
      setTimeout(() => {
        child.kill()
        reject(new Error('Fallback command timeout'))
      }, 2 * 60 * 1000) // 2 minutes
    })
  }
}