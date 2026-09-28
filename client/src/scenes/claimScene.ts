import { Scene } from 'phaser'
import { ethers } from 'ethers'
import { CLAIM_SCENE, SIGNER } from '../utils/keys'
import { Channel, panel } from '../utils/channel'
import { addresses } from '../../../commons/contracts.mjs'
export default class ClaimScene extends Scene {
  demo = true
  channel!: Channel
  constructor() { super(CLAIM_SCENE) }
  init({ demo, channel }: { demo: boolean; channel: Channel }) { this.demo = demo; this.channel = channel }
  create() {
    const ui = panel('<h1>COIN COLLECTED!</h1><p role="status"></p><button id="again">Play again</button>')
    const status = ui.querySelector('p')!
    status.textContent = this.demo ? 'Demo reward earned. No blockchain transaction needed.' : 'Waiting for your signed reward...'
    ui.querySelector('#again')!.addEventListener('click', () => this.channel.emit('restart'))
    this.channel.on('reward-error', message => { status.textContent = message })
    this.channel.on('claim', packet => {
      status.textContent = 'Reward ready. Claiming requires the configured contracts on chain 31337.'
      const claim = document.createElement('button')
      claim.textContent = 'Claim NFT'
      ui.append(claim)
      claim.onclick = async () => {
        claim.disabled = true
        try {
          const signer = this.registry.get(SIGNER) as ethers.providers.JsonRpcSigner
          if ((await signer.provider.getNetwork()).chainId !== 31337) throw new Error('Switch your wallet to local chain 31337.')
          if (await signer.provider.getCode(addresses.CLAIM_VERIFIER) === '0x') throw new Error('Reward contracts are not deployed on this network.')
          const contract = new ethers.Contract(addresses.CLAIM_VERIFIER, ['function claim(address request, tuple(uint8 v, bytes32 r, bytes32 s, address request, uint256 deadline, address receiver) packet)'], signer)
          const { v, r, s } = ethers.utils.splitSignature(packet.sig)
          const tx = await contract.claim(addresses.DUNGEON, { v, r, s, request: addresses.DUNGEON, deadline: packet.deadline, receiver: await signer.getAddress() })
          status.textContent = 'Transaction submitted...'
          await tx.wait()
          status.textContent = 'NFT claimed!'
        } catch (error: any) { status.textContent = error.reason || error.message; claim.disabled = false }
      }
    })
    this.events.once('shutdown', () => { ui.remove(); this.channel.listeners.delete('claim'); this.channel.listeners.delete('reward-error') })
  }
}
