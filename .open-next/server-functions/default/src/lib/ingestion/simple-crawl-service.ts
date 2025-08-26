import { spawn } from 'child_process'
import { CrawlConfig, CrawlResult } from './crawl-service'

export class SimpleCrawlService {
  private static instance: SimpleCrawlService

  public static getInstance(): SimpleCrawlService {
    if (!SimpleCrawlService.instance) {
      SimpleCrawlService.instance = new SimpleCrawlService()
    }
    return SimpleCrawlService.instance
  }

  async executeCrawl(config: CrawlConfig): Promise<CrawlResult> {
    const startTime = Date.now()
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      // Build command arguments
      const args = this.buildCrawlArgs(config)

      console.log('Executing simple WSL crawl:', args)

      // Execute via WSL with direct path to original ingestion directory
      const result = await this.executeWSLCommand(args)

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
      console.error('Simple crawl execution failed:', error)

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
      'python', 'main.py', 'crawl',
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

  private async executeWSLCommand(args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      // Get the project root and build WSL path
      const projectRoot = process.cwd().replace(/\\/g, '/').replace(/^C:/, '/mnt/c')
      const ingestionPath = projectRoot.replace('/cracha-frontend', '') + '/ingestion'

      // Based on Perplexity solution: Use login shell and proper conda initialization
      const wslCommands = [
        // Solution 1: Use login shell with proper conda initialization
        `set -e
cd '${ingestionPath}'
if [ -f "$HOME/.bashrc" ]; then
  . "$HOME/.bashrc"
fi
if [ -f "$HOME/miniconda3/etc/profile.d/conda.sh" ]; then
  . "$HOME/miniconda3/etc/profile.d/conda.sh"
fi
conda activate cracha
python ${args.slice(1).join(' ')}`,

        // Solution 2: Direct path to conda environment python
        `cd ${ingestionPath} && /home/ocin/miniconda3/envs/cracha/bin/python ${args.slice(1).join(' ')}`,

        // Solution 3: Find conda and use conda run
        `cd ${ingestionPath} && $(which conda) run -n cracha python ${args.slice(1).join(' ')}`,

        // Solution 4: Alternative conda paths
        `cd ${ingestionPath} && ~/miniconda3/bin/conda run -n cracha python ${args.slice(1).join(' ')}`,

        // Fallback: system python3
        `cd ${ingestionPath} && python3 ${args.slice(1).join(' ')}`
      ]

      const wslCommand = wslCommands[0] // Start with first command

      console.log('WSL Command:', wslCommand)

      // Use login shell (-l) to ensure conda initialization
      const child = spawn('wsl', ['-e', 'bash', '-lc', wslCommand], {
        stdio: ['pipe', 'pipe', 'pipe']
      })

      let stdout = ''
      let stderr = ''

      child.stdout?.on('data', (data) => {
        stdout += data.toString()
        console.log('STDOUT:', data.toString())
      })

      child.stderr?.on('data', (data) => {
        stderr += data.toString()
        console.log('STDERR:', data.toString())
      })

      child.on('close', (code) => {
        console.log('WSL command finished with code:', code)
        if (code === 0) {
          resolve({ stdout, stderr })
        } else {
          // Try fallback commands if conda not found
          if (stderr.includes('conda: command not found') || code === 127) {
            console.log('Conda not found, trying fallback commands...')
            this.tryFallbackWSLCommands(wslCommands.slice(1), ingestionPath, args).then(resolve).catch(reject)
          } else {
            reject(new Error(`WSL command failed with code ${code}: ${stderr || stdout}`))
          }
        }
      })

      child.on('error', (error) => {
        console.error('WSL spawn error:', error)
        reject(error)
      })

      // Set timeout
      setTimeout(() => {
        child.kill()
        reject(new Error('WSL command timeout after 10 minutes'))
      }, 10 * 60 * 1000)
    })
  }

  private async tryFallbackWSLCommands(commands: string[], ingestionPath: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    for (const cmd of commands) {
      try {
        console.log(`Trying fallback WSL command: ${cmd}`)
        const result = await this.executeSingleWSLCommand(cmd)
        console.log('Fallback WSL command succeeded!')
        return result
      } catch (error) {
        console.log(`Fallback WSL command failed: ${error}`)
        continue
      }
    }

    throw new Error('All WSL fallback commands failed. Please ensure Python is installed in WSL or use mock service.')
  }

  private async executeSingleWSLCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      // Use login shell (-l) to ensure conda initialization
      const child = spawn('wsl', ['-e', 'bash', '-lc', command], {
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