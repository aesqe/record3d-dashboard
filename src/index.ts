import { Record3DVideo } from './Record3DVideo.js'
import { Record3DScene } from './Record3DScene.js'
import { WiFiStreamedVideoSource } from './video-sources/WiFiStreamedVideoSource.js'

const params = new URLSearchParams(window.location.search)
const peerAddresses = (params.get('ips') || '192.168.0.18')
  .split(',')
  .filter(Boolean)
  .map(add => `http://${add}`)

const scene = new Record3DScene(40, 1e-4, 1e5)

peerAddresses.forEach(peerAddress => {
  const wifiVideo = new WiFiStreamedVideoSource(peerAddress)

  wifiVideo.connect()

  scene.addVideo(new Record3DVideo(wifiVideo))
})

scene.runLoop()
