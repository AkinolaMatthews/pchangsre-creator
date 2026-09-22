import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const isWindows = process.platform === 'win32'
const serverProcess = spawn(isWindows ? 'cmd' : 'npm', isWindows ? ['/c', 'npm', 'run', 'server'] : ['run', 'server'], {
    cwd: path.join(__dirname, 'server'),
    stdio: 'inherit',
    windowsHide: true,
    detached: false,
    shell: false
})

process.on('SIGINT', () => {
    serverProcess.kill()
    process.exit()
})

process.on('SIGTERM', () => {
    serverProcess.kill()
    process.exit()
})
