// Test script for Python venv integration
const { spawn } = require('child_process')
const path = require('path')

async function testPythonIntegration() {
    console.log('🧪 Testing Python venv integration...')

    const pythonPath = path.join(__dirname, 'python', 'venv', 'Scripts', 'python.exe')
    const scriptPath = path.join(__dirname, 'python', 'main_ascii.py')

    console.log('🐍 Python path:', pythonPath)
    console.log('📄 Script path:', scriptPath)

    const args = [
        scriptPath,
        'crawl',
        '--url', 'https://de.wikipedia.org/wiki/Weltraum',
        '--tenant-id', 'test-integration',
        '--user-id', 'test-user',
        '--force'
    ]

    console.log('🔧 Args:', args)

    const child = spawn(pythonPath, args, {
        cwd: path.join(__dirname, 'python'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
            ...process.env,
            PYTHONPATH: path.join(__dirname, 'python'),
            PYTHONUNBUFFERED: '1',
            PYTHONIOENCODING: 'utf-8',
            PYTHONUTF8: '1'
        }
    })

    child.stdout.on('data', (data) => {
        console.log('📤 STDOUT:', data.toString().trim())
    })

    child.stderr.on('data', (data) => {
        console.log('📤 STDERR:', data.toString().trim())
    })

    child.on('close', (code) => {
        console.log(`✅ Process finished with code: ${code}`)
        if (code === 0) {
            console.log('🎉 Python integration test successful!')
        } else {
            console.log('❌ Python integration test failed!')
        }
    })

    child.on('error', (error) => {
        console.error('💥 Process error:', error)
    })
}

testPythonIntegration()