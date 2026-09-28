import { Scene } from 'phaser'
import { ethers } from 'ethers'
import generateTypedAuth from '../../../commons/auth.mjs'
import { CONNECT_SCENE, SIGNER, START_SCENE } from '../utils/keys'
import { panel } from '../utils/channel'

export class StartScene extends Scene {
  constructor() { super(START_SCENE) }
  create() {
    document.getElementById('loading')?.remove()
    this.cameras.main.setBackgroundColor('#171717')
    const ui = panel('<h1>DUNGEON RUN</h1><p>Find the golden coin. The server guards the dungeon.</p><button id="demo">Play demo</button><button id="wallet" class="secondary">Connect wallet</button><p>Move with WASD or arrow keys</p><p id="status" role="status">Demo needs no wallet or cryptocurrency.</p>')
    ui.querySelector('#demo')!.addEventListener('click', () => {
      this.registry.remove(SIGNER)
      this.scene.start(CONNECT_SCENE, { guest: true })
    })
    ui.querySelector('#wallet')!.addEventListener('click', async () => {
      const button = ui.querySelector<HTMLButtonElement>('#wallet')!
      const status = ui.querySelector('#status')!
      button.disabled = true
      try {
        const ethereum = (window as any).ethereum
        if (!ethereum) throw new Error('No wallet installed. Choose Play demo to start immediately.')
        const provider = new ethers.providers.Web3Provider(ethereum)
        await provider.send('eth_requestAccounts', [])
        const signer = provider.getSigner()
        status.textContent = 'Sign the login request in your wallet.'
        const address = await signer.getAddress()
        const res = await fetch((import.meta.env.VITE_HOST || '') + '/challenge', { method: 'POST', body: address })
        if (!res.ok) throw new Error(await res.text())
        const { domain, types, value } = generateTypedAuth(await res.text())
        const sig = await signer._signTypedData(domain, types, value)
        if (!this.scene.isActive()) return
        this.registry.set(SIGNER, signer)
        this.scene.start(CONNECT_SCENE, { address, sig })
      } catch (error: any) { status.textContent = error.message; button.disabled = false }
    })
    this.events.once('shutdown', () => ui.remove())
  }
}
