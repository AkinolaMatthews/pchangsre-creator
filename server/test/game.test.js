import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn, step, canOccupy, validInput, coin } from '../game/game.js'

test('spawn is walkable; movement is normalized and bounded by wall collisions', () => {
  assert.ok(canOccupy(spawn.x, spawn.y))
  const player = { ...spawn }
  step(player, [true, false, false, true])
  assert.ok(Math.abs(Math.hypot(player.x - spawn.x, player.y - spawn.y) - 80 / 60) < 0.001)
  for (let i = 0; i < 1000; i++) step(player, [false, false, true, false])
  assert.ok(canOccupy(player.x, player.y))
  const x = player.x
  step(player, [false, false, true, false])
  assert.equal(player.x, x)
})
test('coin reward requires overlap and can only be earned once per run', () => {
  const player = { ...spawn, collected: false }
  assert.equal(step(player, [false, false, false, false]), false)
  Object.assign(player, coin)
  assert.equal(step(player, [false, false, false, false]), true)
  assert.equal(step(player, [false, false, false, false]), false)
})
test('reject malformed input and oversized time steps cannot teleport', () => {
  for (const input of [null, {}, [], [1, 0, 0, 0], [true]]) assert.equal(validInput(input), false)
  const player = { ...spawn }
  step(player, [true, false, false, false], 1000)
  assert.ok(Math.abs(player.y - spawn.y) <= 80 / 30 + .001)
})
