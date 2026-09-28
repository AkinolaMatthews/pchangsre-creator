import { Scene } from 'phaser'
import { CONNECT_SCENE, MAIN_SCENE, START_SCENE } from '../utils/keys'
import { Channel, panel } from '../utils/channel'
export class ConnectScene extends Scene {
  login: object = {}
  constructor() { super(CONNECT_SCENE) }
  init(login: object) { this.login = login }
  create() {
    const ui = panel('<h1>Entering dungeon...</h1><p role="status">Connecting to game server</p><button>Back</button>')
    const channel = new Channel(this.login)
    let connected = false
    const status = ui.querySelector('p')!
    const timer = this.time.delayedCall(10_000, () => { status.textContent = 'Connection timed out. Try again.'; channel.close() })
    channel.on('ready', state => {
      connected = true
      timer.remove()
      this.scene.start(MAIN_SCENE, { channel, state })
    })
    channel.on('error', message => { status.textContent = message })
    channel.on('disconnect', message => { status.textContent = message })
    ui.querySelector('button')!.addEventListener('click', () => this.scene.start(START_SCENE))
    this.events.once('shutdown', () => { ui.remove(); timer.remove(); if (!connected) channel.close() })
  }
}
