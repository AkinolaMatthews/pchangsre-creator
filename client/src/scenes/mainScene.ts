import * as Phaser from 'phaser'
import { CLAIM_SCENE, COIN, COIN_SPIN, IDLE, KNIGHT, MAIN_SCENE, MOVE, START_SCENE, TILEMAP, TILESET } from '../utils/keys'
import { Channel, panel, State } from '../utils/channel'

export class MainScene extends Phaser.Scene {
  channel!: Channel
  state!: State
  player!: Phaser.GameObjects.Sprite
  coin!: Phaser.GameObjects.Sprite
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  wasd!: Record<string, Phaser.Input.Keyboard.Key>
  lastSent = 0
  lastInput = ''
  connected = true
  status!: HTMLElement
  constructor() { super(MAIN_SCENE) }
  init({ channel, state }: { channel: Channel; state: State }) { this.channel = channel; this.state = state; this.connected = true; this.lastInput = ''; this.lastSent = 0 }
  preload() {
    this.load.spritesheet(KNIGHT, '/spritesheets/knight.png', { frameWidth: 15, frameHeight: 22 })
    this.load.spritesheet(COIN, '/spritesheets/coin.png', { frameWidth: 6, frameHeight: 7 })
    this.load.image(TILESET, '/tilemap/tileset.png')
    this.load.tilemapTiledJSON(TILEMAP, '/tilemap/tilemap.json')
  }
  create() {
    const map = this.make.tilemap({ key: TILEMAP })
    const tiles = map.addTilesetImage('dungeon-tileset', TILESET)!
    map.createLayer('floor', tiles, 0, 0)!.setDepth(0)
    map.createLayer('walls', tiles, 0, 0)!.setDepth(10)
    map.createLayer('overhead', tiles, 0, 0)!.setDepth(30)
    this.player = this.add.sprite(this.state.x, this.state.y, KNIGHT).setDepth(20)
    this.coin = this.add.sprite(240, 70, COIN).setDepth(20)
    for (const [key, texture, start, end] of [[IDLE, KNIGHT, 0, 3], [MOVE, KNIGHT, 4, 7], [COIN_SPIN, COIN, 0, 3]] as const) {
      if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(texture, { start, end }), frameRate: 10, repeat: -1 })
    }
    this.player.play(IDLE)
    this.coin.play(COIN_SPIN)
    const fit = () => { this.cameras.main.setZoom(Math.min(this.scale.width / 480, (this.scale.height - 130) / 320)); this.cameras.main.centerOn(240, 160) }
    fit()
    this.scale.on('resize', fit)
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>
    const hud = panel('<div class="hud"><strong>DUNGEON RUN</strong><span role="status">Find the golden coin · WASD / arrows</span><button>Exit</button></div>')
    hud.classList.add('hud-panel')
    this.status = hud.querySelector('span')!
    hud.querySelector('button')!.addEventListener('click', () => { this.scene.stop(CLAIM_SCENE); this.scene.start(START_SCENE) })
    this.channel.on('update', state => { this.state = state; this.coin.setVisible(!state.collected) })
    this.channel.on('collected', data => {
      this.coin.setVisible(false)
      this.status.textContent = 'Coin collected!'
      this.scene.launch(CLAIM_SCENE, { demo: data.demo, channel: this.channel })
    })
    this.channel.on('restarted', state => {
      this.state = state; this.player.setPosition(state.x, state.y); this.coin.setVisible(true)
      this.status.textContent = 'Find the golden coin · WASD / arrows'
      this.scene.stop(CLAIM_SCENE)
    })
    this.channel.on('disconnect', message => { this.connected = false; this.status.textContent = message + ' — Exit to reconnect.' })
    this.channel.on('error', message => { this.status.textContent = message })
    const release = () => { this.input.keyboard!.resetKeys(); this.channel.emit('move', [false, false, false, false]) }
    window.addEventListener('blur', release)
    this.events.once('shutdown', () => { hud.remove(); this.channel.close(); this.scale.off('resize', fit); window.removeEventListener('blur', release) })
  }
  update(time: number, delta: number) {
    if (!this.player || !this.connected) return
    const input = [this.cursors.up.isDown || this.wasd.W.isDown, this.cursors.down.isDown || this.wasd.S.isDown, this.cursors.left.isDown || this.wasd.A.isDown, this.cursors.right.isDown || this.wasd.D.isDown]
    const key = input.join(',')
    if (key !== this.lastInput || time - this.lastSent >= 50) { this.channel.emit('move', input); this.lastInput = key; this.lastSent = time }
    const dx = this.state.x - this.player.x, dy = this.state.y - this.player.y
    const blend = Math.min(1, delta / 35)
    this.player.setPosition(this.player.x + dx * blend, this.player.y + dy * blend)
    if (Math.abs(dx) > 0.1) this.player.setFlipX(dx < 0)
    this.player.play(Math.hypot(dx, dy) > 0.2 ? MOVE : IDLE, true)
  }
}
