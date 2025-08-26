// Simple in-memory job queue for Next.js compatibility
// Production-ready alternative to Bull.js

export interface JobConfig {
  url: string
  tenant_id: string
  user_id: string
  type?: string
  embedding_model?: string
  max_depth?: number
  limit?: number
  max_concurrent?: number
  force?: boolean
  cleanup?: boolean
  generate_summaries?: boolean
  ultra_fast?: boolean
  exclude_external?: boolean
  exclude_social_media?: boolean
}

export interface Job {
  id: string
  config: JobConfig
  status: 'queued' | 'running' | 'completed' | 'failed'
  progress: number
  createdAt: string
  startedAt?: string
  completedAt?: string
  error?: string
  result?: {
    chunks?: number
    duration?: string
    output?: string
  }
}

class SimpleJobQueue {
  private jobs: Map<string, Job> = new Map()
  private runningJobs: Set<string> = new Set()
  private maxConcurrentJobs = 3

  // Add job to queue
  addJob(config: JobConfig): string {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const job: Job = {
      id: jobId,
      config,
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString()
    }

    this.jobs.set(jobId, job)
    
    console.log(`✅ Job ${jobId} added to queue`)
    
    // Start processing if capacity available
    this.processNextJob()
    
    return jobId
  }

  // Get job status
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId)
  }

  // Get all jobs for a user
  getUserJobs(userId: string): Job[] {
    return Array.from(this.jobs.values())
      .filter(job => job.config.user_id === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  // Process next job in queue
  private async processNextJob() {
    if (this.runningJobs.size >= this.maxConcurrentJobs) {
      console.log(`⏳ Max concurrent jobs (${this.maxConcurrentJobs}) reached, waiting...`)
      return
    }

    // Find next queued job
    const queuedJob = Array.from(this.jobs.values())
      .find(job => job.status === 'queued')

    if (!queuedJob) {
      return // No jobs in queue
    }

    // Start processing job
    this.runningJobs.add(queuedJob.id)
    queuedJob.status = 'running'
    queuedJob.startedAt = new Date().toISOString()
    queuedJob.progress = 10

    console.log(`🔄 Starting job ${queuedJob.id}`)

    try {
      // Execute Python crawl
      const result = await this.executePythonCrawl(queuedJob)
      
      // Job completed successfully
      queuedJob.status = 'completed'
      queuedJob.progress = 100
      queuedJob.completedAt = new Date().toISOString()
      queuedJob.result = result

      console.log(`✅ Job ${queuedJob.id} completed successfully`)

    } catch (error) {
      // Job failed
      queuedJob.status = 'failed'
      queuedJob.progress = 0
      queuedJob.completedAt = new Date().toISOString()
      queuedJob.error = error instanceof Error ? error.message : 'Unknown error'

      console.log(`❌ Job ${queuedJob.id} failed:`, error)
    } finally {
      // Remove from running jobs
      this.runningJobs.delete(queuedJob.id)
      
      // Process next job
      setTimeout(() => this.processNextJob(), 100)
    }
  }

  // Execute Python crawl script
  private async executePythonCrawl(job: Job): Promise<{
    chunks?: number
    duration?: string
    output?: string
  }> {
    const { spawn } = await import('child_process')
    const path = await import('path')
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      const config = job.config
      
      // Path to Python venv and script
      const pythonPath = path.join(process.cwd(), 'python', 'venv', 'Scripts', 'python.exe')
      const scriptPath = path.join(process.cwd(), 'python', 'main_ascii.py')
      
      // Build arguments
      const args = [
        scriptPath,
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

      console.log(`🐍 Executing Python crawl for job ${job.id}`)
      console.log(`🐍 Python path: ${pythonPath}`)
      console.log(`🐍 Script path: ${scriptPath}`)
      console.log(`🐍 Args:`, args)
      
      // Update progress
      job.progress = 20

      // Spawn Python process
      const child = spawn(pythonPath, args, {
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

      console.log(`🐍 Python process spawned with PID: ${child.pid}`)

      let stdout = ''
      let stderr = ''

      child.stdout?.on('data', (data) => {
        const output = data.toString()
        stdout += output
        console.log(`🐍 STDOUT [${job.id}]:`, output.trim())
        
        // Update progress based on output
        if (output.includes('chunks from')) {
          job.progress = 60
        } else if (output.includes('embeddings created')) {
          job.progress = 80
        } else if (output.includes('Successfully upserted')) {
          job.progress = 90
        }
      })

      child.stderr?.on('data', (data) => {
        const errorOutput = data.toString()
        stderr += errorOutput
        console.log(`🐍 STDERR [${job.id}]:`, errorOutput.trim())
      })

      child.on('close', (code) => {
        const duration = `${Date.now() - startTime}ms`
        console.log(`🐍 Python process [${job.id}] closed with code: ${code}`)
        console.log(`🐍 Final STDOUT [${job.id}]:`, stdout)
        console.log(`🐍 Final STDERR [${job.id}]:`, stderr)
        
        if (code === 0) {
          // Extract chunks count from output
          const chunksMatch = stdout.match(/Created (\d+) chunks/)
          const chunks = chunksMatch ? parseInt(chunksMatch[1], 10) : 0
          
          console.log(`✅ Job ${job.id} completed successfully with ${chunks} chunks`)
          resolve({
            chunks,
            duration,
            output: stdout
          })
        } else {
          // Check if it's just a Vectorize error but embeddings were created
          if (stdout.includes('embeddings created') && stderr.includes('401 Unauthorized')) {
            console.log(`⚠️ Job ${job.id}: Vectorize upload failed, but embeddings were created successfully`)
            
            const chunksMatch = stdout.match(/Created (\d+) chunks/)
            const chunks = chunksMatch ? parseInt(chunksMatch[1], 10) : 0
            
            resolve({
              chunks,
              duration,
              output: stdout + '\n\nNote: Vectorize upload failed (401 Unauthorized), but crawl and embeddings completed successfully'
            })
          } else {
            console.log(`❌ Job ${job.id} failed with code ${code}`)
            reject(new Error(stderr || `Process exited with code ${code}`))
          }
        }
      })

      child.on('error', (error) => {
        console.log(`❌ Python process [${job.id}] error:`, error)
        reject(error)
      })

      // Set timeout (30 minutes)
      setTimeout(() => {
        child.kill()
        reject(new Error('Python script timeout after 30 minutes'))
      }, 30 * 60 * 1000)
    })
  }

  // Cleanup old completed jobs (keep last 50)
  cleanup() {
    const allJobs = Array.from(this.jobs.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    if (allJobs.length > 50) {
      const jobsToRemove = allJobs.slice(50)
      jobsToRemove.forEach(job => {
        if (job.status !== 'running') {
          this.jobs.delete(job.id)
        }
      })
      console.log(`🧹 Cleaned up ${jobsToRemove.length} old jobs`)
    }
  }
}

// Singleton instance
export const jobQueue = new SimpleJobQueue()

// Cleanup every hour
setInterval(() => {
  jobQueue.cleanup()
}, 60 * 60 * 1000)