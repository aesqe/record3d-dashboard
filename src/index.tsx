import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { Record3DVideo } from './Record3DVideo'
import { Record3DScene } from './Record3DScene'
import { hideElements, toggleElements } from './utils'
import { WiFiStreamedVideoSource } from './video-sources/WiFiStreamedVideoSource'

const keyListener = (e: KeyboardEvent) => {
  if (e.key === '0') {
    toggleElements('#toolbar')
  }

  const toolbarVisible = !document
    .querySelector('#toolbar')
    ?.classList.contains('hidden')

  if (!toolbarVisible) {
    hideElements('.lil-gui')
    hideElements('#r3d-video, #r3d-canvas')
  } else {
    if (e.key === 'v') {
      toggleElements('#r3d-video, #r3d-canvas')
    }

    if (e.key === 'x') {
      toggleElements('.lil-gui')
    }
  }
}

document.addEventListener('keydown', keyListener)

const getPeerAddresses = () => {
  const params = new URLSearchParams(window.location.hash.replace('#', ''))

  return (params.get('ips') || '192.168.0.18')
    .split(',')
    .filter(Boolean)
    .map(add => `http://${add}`)
}

const scene1 = new Record3DScene(40, 1e-4, 1e5, 'canvas-1')
const scene2 = new Record3DScene(40, 1e-4, 1e5, 'canvas-2')

hideElements('.lil-gui, #r3d-video, #r3d-canvas')

const App = () => {
  const wifiVideos = useRef<WiFiStreamedVideoSource[]>(
    [] as WiFiStreamedVideoSource[]
  )
  const [peerAddresses, setPeerAddresses] = useState(getPeerAddresses())
  const [playing, setPlaying] = useState(true)

  const hashListener = useCallback(() => {
    setPeerAddresses(getPeerAddresses())
  }, [])

  const pauseVideos = useCallback(() => {
    setPlaying(false)
    wifiVideos.current.forEach(wifiVideo => wifiVideo.videoTag.pause())
  }, [])

  const playVideos = useCallback(() => {
    setPlaying(true)
    wifiVideos.current.forEach(wifiVideo => wifiVideo.videoTag.play())
  }, [])

  useEffect(() => {
    window.addEventListener('hashchange', hashListener)

    return () => {
      window.removeEventListener('hashchange', hashListener)
    }
  }, [])

  const runScene = useCallback(async () => {
    console.log('runScene')
    wifiVideos.current.forEach(wifiVideo => wifiVideo.disconnect())
    wifiVideos.current = []
    scene1.removeVideos()
    scene2.removeVideos()

    setTimeout(() => {
      peerAddresses.forEach(peerAddress => {
        const wifiVideo = new WiFiStreamedVideoSource(peerAddress)

        wifiVideos.current.push(wifiVideo)
        wifiVideo.connect()

        scene1.addVideo(new Record3DVideo(wifiVideo, 1))
        scene2.addVideo(new Record3DVideo(wifiVideo, 2))

        hideElements('#r3d-video, #r3d-canvas')
      })

      scene1.runLoop()
      scene2.runLoop()
    }, 1000)
  }, [peerAddresses])

  useEffect(() => {
    runScene()
  }, [runScene])

  useEffect(() => {}, [])

  return (
    <div id='toolbar' className='hidden'>
      <a onClick={runScene} id='button-reset'>
        Reset
      </a>
      <a onClick={runScene} id='button-1'>
        1
      </a>
      <a onClick={runScene} id='button-2'>
        2
      </a>
      <a onClick={runScene} id='button-3'>
        3
      </a>
      <a onClick={runScene} id='button-4'>
        4
      </a>
      <a onClick={runScene} id='button-arrange'>
        Arrange
      </a>
      <a onClick={runScene} id='button-overlay'>
        Overlay
      </a>
      <a onClick={() => toggleElements('.lil-gui')} id='button-fx'>
        FX
      </a>
      <a onClick={playVideos} id='button-play'>
        Play
      </a>
      <a
        onClick={pauseVideos}
        id='button-pause'
        className={!playing ? 'active' : ''}
      >
        Pause
      </a>
      <div id='slider-noise'>
        <input
          type='range'
          min='0'
          max='1'
          step='0.05'
          defaultValue='0'
          onChange={e =>
            console.log((e.nativeEvent?.target as HTMLInputElement)?.value)
          }
        />
      </div>
      <div id='slider-pointsize'>
        <input
          type='range'
          min='0.1'
          max='30'
          step='0.05'
          defaultValue='1'
          onChange={e =>
            console.log((e.nativeEvent?.target as HTMLInputElement)?.value)
          }
        />
      </div>
      <div id='preset-list'></div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)

root.render(<App />)
