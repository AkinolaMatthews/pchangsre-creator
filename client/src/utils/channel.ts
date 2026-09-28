export type State = { x: number; y: number; collected: boolean }
export class Channel {
  socket: WebSocket
  listeners = new Map<string, (data: any) => void>()
  constructor(login: object) {
    const host = import.meta.env.VITE_HOST || window.location.origin
    const url = new URL('/game', host)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    this.socket = new WebSocket(url)
    this.socket.onopen = () => this.emit('login', login)
    this.socket.onmessage = event => {
      const message = JSON.parse(event.data)
      this.listeners.get(message.event)?.(message.data)
    }
    this.socket.onclose = event => this.listeners.get('disconnect')?.(event.reason || 'Connection lost')
    this.socket.onerror = () => this.listeners.get('error')?.('Cannot reach the game server')
  }
  on(event: string, callback: (data: any) => void) { this.listeners.set(event, callback) }
  emit(event: string, data?: unknown) {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify({ event, data }))
  }
  close() { this.socket.close() }
}
export function panel(html: string) {
  const element = document.createElement('section')
  element.className = 'panel'
  element.innerHTML = html
  document.getElementById('ui')!.append(element)
  return element
}
