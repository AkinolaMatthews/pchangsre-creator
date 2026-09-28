import test from 'node:test'
import assert from 'node:assert/strict'
import { WebSocket } from 'ws'
import { ethers } from 'ethers'
import { createGameServer } from '../server.js'
import generateTypedAuth from '../../commons/auth.mjs'

async function setup(t) {
  const game = createGameServer()
  await new Promise(resolve => game.server.listen(0, '127.0.0.1', resolve))
  t.after(() => game.close())
  const port = game.server.address().port
  return { http: `http://127.0.0.1:${port}`, ws: `ws://127.0.0.1:${port}/game` }
}
function waitFor(ws, event) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { ws.off('message', handler); reject(new Error(`Timed out: ${event}`)) }, 3000)
    function handler(raw) { const message = JSON.parse(raw); if (message.event === event) { clearTimeout(timeout); ws.off('message', handler); resolve(message.data) } }
    ws.on('message', handler)
  })
}
async function connect(url, login) {
  const ws = new WebSocket(url)
  const ready = waitFor(ws, 'ready')
  ws.on('open', () => ws.send(JSON.stringify({ event: 'login', data: login })))
  return { ws, state: await ready }
}
test('guest can join, move, restart; invalid movement disconnects and session is removed', async t => {
  const urls = await setup(t)
  const { ws, state } = await connect(urls.ws, { guest: true })
  assert.equal(state.x, 240)
  ws.send(JSON.stringify({ event: 'move', data: [true, false, false, false] }))
  const update = await waitFor(ws, 'update')
  assert.ok(update.y < 260)
  const restarted = waitFor(ws, 'restarted')
  ws.send(JSON.stringify({ event: 'restart' }))
  assert.equal((await restarted).y, 260)
  const closed = new Promise(resolve => ws.once('close', resolve))
  ws.send(JSON.stringify({ event: 'move', data: [999] }))
  assert.equal(await closed, 1008)
  assert.equal((await (await fetch(urls.http + '/health')).json()).sessions, 0)
})
test('wallet login verifies signatures and prevents challenge replay', async t => {
  const urls = await setup(t)
  assert.equal((await fetch(urls.http + '/challenge', { method: 'POST', body: 'bad' })).status, 400)
  const wallet = ethers.Wallet.createRandom()
  const secret = await (await fetch(urls.http + '/challenge', { method: 'POST', body: wallet.address })).text()
  const { domain, types, value } = generateTypedAuth(secret)
  const login = { address: wallet.address, sig: await wallet._signTypedData(domain, types, value) }
  const { ws, state } = await connect(urls.ws, login)
  assert.equal(state.guest, false)
  await new Promise(resolve => { ws.once('close', resolve); ws.close() })
  const replay = new WebSocket(urls.ws)
  replay.on('open', () => replay.send(JSON.stringify({ event: 'login', data: login })))
  assert.equal(await new Promise(resolve => replay.on('close', resolve)), 1008)
})
test('untrusted browser origins cannot open gameplay sockets', async t => {
  const urls = await setup(t)
  const ws = new WebSocket(urls.ws, { origin: 'https://untrusted.invalid' })
  const error = await new Promise(resolve => ws.on('error', resolve))
  assert.match(error.message, /403/)
})
