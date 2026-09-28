import express from 'express'
import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { WebSocketServer, WebSocket } from 'ws'
import { ethers } from 'ethers'
import generateTypedAuth from '../commons/auth.mjs'
import { spawn, step, validInput } from './game/game.js'
import { signPacket } from './game/utils.js'
import { addresses } from '../commons/contracts.mjs'

export function createGameServer() {
  const app = express()
  const server = http.createServer(app)
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2048 })
  const sessions = new Map(), challenges = new Map()
  const signer = process.env.REWARD_SIGNER_KEY ? new ethers.Wallet(process.env.REWARD_SIGNER_KEY) : null
  const origins = new Set((process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(','))
  app.use((req, res, next) => {
    if (req.headers.origin && !origins.has(req.headers.origin)) return res.sendStatus(403)
    if (req.headers.origin) res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })
  app.use(express.text({ limit: '1kb' }))
  app.get('/health', (_req, res) => res.json({ status: 'ok', sessions: sessions.size, mode: 'demo', rewardsEnabled: Boolean(signer) }))
  app.get('/signer', (_req, res) => signer ? res.send(signer.address) : res.status(503).send('On-chain rewards are not configured'))
  app.post('/challenge', (req, res) => {
    if (!ethers.utils.isAddress(req.body)) return res.status(400).send('Invalid address')
    if (challenges.size >= 1000) return res.status(429).send('Try again later')
    const address = ethers.utils.getAddress(req.body)
    const secret = ethers.utils.hexlify(ethers.utils.randomBytes(32))
    challenges.set(address, { secret, expires: Date.now() + 60_000 })
    res.type('text').send(secret)
  })
  app.use(express.static(fileURLToPath(new URL('../client/dist/', import.meta.url))))
  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/game' || (req.headers.origin && !origins.has(req.headers.origin)) || wss.clients.size >= 100) {
      socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return
    }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws))
  })
  wss.on('connection', ws => {
    let session, messages = 0, windowStart = Date.now()
    ws.isAlive = true
    ws.on('pong', () => { ws.isAlive = true })
    const authTimer = setTimeout(() => ws.close(1008, 'Login timeout'), 10_000)
    const send = (event, data) => {
      if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 64 * 1024) ws.send(JSON.stringify({ event, data }))
    }
    ws.on('error', () => ws.close())
    ws.on('message', raw => {
      try {
        if (Date.now() - windowStart > 1000) { messages = 0; windowStart = Date.now() }
        if (++messages > 120) { ws.close(1008, 'Too many messages'); return }
        const { event, data } = JSON.parse(raw.toString())
        if (!session) {
          if (event !== 'login') return ws.close(1008, 'Login required')
          let address = `guest:${randomUUID()}`, guest = true
          if (!data?.guest) {
            address = ethers.utils.getAddress(data.address)
            const challenge = challenges.get(address)
            challenges.delete(address)
            if (!challenge || challenge.expires < Date.now()) return ws.close(1008, 'Challenge expired')
            const { domain, types, value } = generateTypedAuth(challenge.secret)
            if (ethers.utils.verifyTypedData(domain, types, value, data.sig) !== address) return ws.close(1008, 'Invalid signature')
            guest = false
          }
          if (sessions.has(address)) return ws.close(1008, 'Already connected')
          session = { address, guest, player: { ...spawn, collected: false }, input: [false, false, false, false], lastInput: Date.now(), send }
          sessions.set(address, session)
          clearTimeout(authTimer)
          send('ready', { ...session.player, guest, rewardsEnabled: Boolean(signer) })
        } else if (event === 'move') {
          if (!validInput(data)) return ws.close(1008, 'Invalid movement')
          session.input = data
          session.lastInput = Date.now()
        } else if (event === 'restart') {
          session.player = { ...spawn, collected: false }
          session.input = [false, false, false, false]
          send('restarted', session.player)
        }
      } catch { ws.close(1008, 'Invalid message') }
    })
    ws.on('close', () => {
      clearTimeout(authTimer)
      if (session) sessions.delete(session.address)
    })
  })
  let tick = 0
  const timer = setInterval(() => {
    tick++
    for (const session of sessions.values()) {
      if (Date.now() - session.lastInput > 250) session.input = [false, false, false, false]
      if (step(session.player, session.input)) {
        session.send('collected', { demo: session.guest || !signer })
        if (!session.guest && signer) {
          const deadline = Math.floor(Date.now() / 1000) + 300
          signPacket(signer, addresses.DUNGEON, deadline, session.address)
            .then(sig => session.send('claim', { sig, deadline }))
            .catch(() => session.send('reward-error', 'Reward signing failed'))
        }
      }
      if (tick % 2 === 0) session.send('update', session.player)
    }
  }, 1000 / 60)
  const cleanup = setInterval(() => {
    for (const [address, challenge] of challenges) if (challenge.expires < Date.now()) challenges.delete(address)
    for (const ws of wss.clients) {
      if (!ws.isAlive) ws.terminate()
      else { ws.isAlive = false; ws.ping() }
    }
  }, 30_000)
  const close = () => {
    clearInterval(timer); clearInterval(cleanup)
    for (const ws of wss.clients) ws.terminate()
    wss.close()
    return new Promise(resolve => server.close(resolve))
  }
  return { server, close }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const game = createGameServer()
  const port = Number(process.env.PORT || 9208)
  game.server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Game server: http://localhost:${port}`))
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await game.close(); process.exit(0) })
}
