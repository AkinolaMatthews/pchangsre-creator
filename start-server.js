import { spawn } from 'node:child_process'
const commands = process.argv.includes('--all') ? [['server'], ['client']] : [['server']]
const children = commands.map(args => spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', ...args], { stdio: 'inherit', shell: process.platform === 'win32' }))
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill('SIGTERM')
  process.exitCode = code
}
children.forEach(child => { child.on('error', () => stop(1)); child.on('exit', code => stop(code ?? 1)) })
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
