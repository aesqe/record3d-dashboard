import { createRoot } from 'react-dom/client'

import { Record3DVideo } from './Record3DVideo.js'
import { Record3DScene } from './Record3DScene.js'
import { WiFiStreamedVideoSource } from './video-sources/WiFiStreamedVideoSource.js'
import { useCallback, useEffect, useRef, useState } from 'react'

const getPeerAddresses = () => {
  const params = new URLSearchParams(window.location.hash.replace('#', ''))

  return (params.get('ips') || '192.168.0.18')
    .split(',')
    .filter(Boolean)
    .map(add => `http://${add}`)
}

const App = () => {
  const scene1 = useRef(new Record3DScene(40, 1e-4, 1e5, 'canvas-1'))
  const scene2 = useRef(new Record3DScene(40, 1e-4, 1e5, 'canvas-2'))

  const [peerAddresses, setPeerAddresses] = useState(getPeerAddresses())

  const hashListener = useCallback(() => {
    setPeerAddresses(getPeerAddresses())
  }, [])

  useEffect(() => {
    window.addEventListener('hashchange', hashListener)
    return () => window.removeEventListener('hashchange', hashListener)
  }, [])

  const runScene = useCallback(async () => {
    scene1.current.removeVideos()
    scene2.current.removeVideos()

    peerAddresses.forEach(peerAddress => {
      const wifiVideo = new WiFiStreamedVideoSource(peerAddress)
      wifiVideo.connect()
      scene1.current.addVideo(new Record3DVideo(wifiVideo, 1))
      scene2.current.addVideo(new Record3DVideo(wifiVideo, 2))
    })

    scene1.current.runLoop()
    scene2.current.runLoop()
  }, [peerAddresses])

  useEffect(() => {
    runScene()
  }, [runScene])

  return <div>test</div>
}

const root = createRoot(document.getElementById('root')!)

root.render(<App />)
