export default {
  server: {
    host: '127.0.0.1', port: 3000, strictPort: true,
    proxy: {
      '/game': { target: 'ws://127.0.0.1:9208', ws: true },
      '/challenge': 'http://127.0.0.1:9208',
      '/health': 'http://127.0.0.1:9208',
      '/signer': 'http://127.0.0.1:9208'
    }
  }
}
