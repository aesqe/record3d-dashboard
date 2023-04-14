import { Record3DVideo } from './Record3DVideo.js'
import { Record3DScene } from './Record3DScene.js'
import { WiFiStreamedVideoSource } from './video-sources/WiFiStreamedVideoSource.js'

const peerAddress1 = 'http://192.168.5.13'
const peerAddress2 = 'http://192.168.5.33'

const scene = new Record3DScene(60, 1e-4, 1e5)

const wifiVideo1 = new WiFiStreamedVideoSource(peerAddress1)
const video1 = new Record3DVideo(wifiVideo1)
const wifiVideo2 = new WiFiStreamedVideoSource(peerAddress2)
const video2 = new Record3DVideo(wifiVideo2)

video2.videoObject.position.set(3, 3, 3)

wifiVideo1.connect()
wifiVideo2.connect()

scene.runloop()

scene.addVideo(video1)
scene.addVideo(video2)
