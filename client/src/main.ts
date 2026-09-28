import './style.css'
import * as Phaser from 'phaser'
import { MainScene } from './scenes/mainScene'
import { StartScene } from './scenes/startScene'
import { ConnectScene } from './scenes/connectScene'
import ClaimScene from './scenes/claimScene'
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  backgroundColor: '#171717',
  pixelArt: true,
  scene: [StartScene, ConnectScene, MainScene, ClaimScene]
})
