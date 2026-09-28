// Pure server-authoritative simulation. No renderer or native Canvas dependency.
import { readFileSync } from 'node:fs'

export const map = JSON.parse(readFileSync(new URL('../../client/public/tilemap/tilemap.json', import.meta.url)))
const walls = map.layers.find(layer => layer.name === 'walls')
const solid = new Set(map.tilesets.flatMap(set => set.tiles.filter(tile => tile.properties?.some(p => p.name === 'collides' && p.value)).map(tile => set.firstgid + tile.id)))
export const spawn = { x: 240, y: 260 }
export const coin = { x: 240, y: 70 }
export const validInput = input => Array.isArray(input) && input.length === 4 && input.every(value => typeof value === 'boolean')
export function canOccupy(x, y) {
  const left = x - 7.5, right = x + 7.5, top = y - 11, bottom = y + 11
  if (left < 0 || top < 0 || right > map.width * 16 || bottom > map.height * 16) return false
  for (let row = Math.floor(top / 16); row <= Math.floor((bottom - 0.001) / 16); row++) {
    for (let col = Math.floor(left / 16); col <= Math.floor((right - 0.001) / 16); col++) {
      if (solid.has(walls.data[row * map.width + col])) return false
    }
  }
  return true
}
export function step(player, input, dt = 1 / 60) {
  if (!validInput(input)) return false
  const [up, down, left, right] = input
  let dx = Number(right) - Number(left), dy = Number(down) - Number(up)
  const length = Math.hypot(dx, dy) || 1
  dx = dx / length * 80 * Math.min(dt, 1 / 30)
  dy = dy / length * 80 * Math.min(dt, 1 / 30)
  if (canOccupy(player.x + dx, player.y)) player.x += dx
  if (canOccupy(player.x, player.y + dy)) player.y += dy
  if (!player.collected && Math.abs(player.x - coin.x) < 10.5 && Math.abs(player.y - coin.y) < 14.5) {
    player.collected = true
    return true
  }
  return false
}
