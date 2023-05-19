import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three'

import { Record3DVideo } from './Record3DVideo'
import { Record3DScene } from './Record3DScene'
import {
  addClass,
  hideElements,
  removeClass,
  toggleElements,
  getPeerAddresses
} from './utils'
import { WiFiStreamedVideoSource } from './video-sources/WiFiStreamedVideoSource'

const peerAddress = getPeerAddresses()[0]

const wifiVideo = new WiFiStreamedVideoSource(peerAddress)

const scene1 = new Record3DScene(40, 1e-4, 1e5, 'canvas-1')
const scene2 = new Record3DScene(40, 1e-4, 1e5, 'canvas-2')
const scene3 = new Record3DScene(40, 1e-4, 1e5, 'canvas-3')

hideElements('.lil-gui, #r3d-video, #r3d-canvas')
addClass('body', 'scenes-2')

const App = () => {
  const [playing, setPlaying] = useState(true)
  const [sceneCount, setSceneCount] = useState(2)
  const previousCount = useRef(sceneCount)

  const pauseVideos = useCallback(() => {
    setPlaying(false)
    wifiVideo.videoTag.pause()
  }, [])

  const playVideos = useCallback(() => {
    setPlaying(true)
    wifiVideo.videoTag.play()
  }, [])

  const resizeScenes = useCallback((force = false) => {
    scene1.onWindowResize(force)
    scene2.onWindowResize(force)
    scene3.onWindowResize(force)
  }, [])

  const handleOverlay = useCallback((show: boolean) => {
    const classFunc = show ? addClass : removeClass

    classFunc('body', 'overlay')

    setTimeout(() => {
      resizeScenes()
      classFunc('body', 'overlay-full-width')
      setTimeout(() => resizeScenes(), 100)
    }, 100)
  }, [])

  const showOverlay = useCallback(() => {
    if (!document.body.classList.contains('overlay')) {
      handleOverlay(true)
    }
  }, [])

  const hideOverlay = useCallback(() => {
    if (document.body.classList.contains('overlay')) {
      handleOverlay(false)
    }
  }, [])

  const toggleOverlay = useCallback(() => {
    handleOverlay(!document.body.classList.contains('overlay'))
  }, [])

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

    if (e.key === '1' || e.key === '2' || e.key === '3') {
      const count = parseInt(e.key)

      setSceneCount(count)

      removeClass('body', 'scenes-1')
      removeClass('body', 'scenes-2')
      removeClass('body', 'scenes-3')

      addClass('body', 'scenes-' + count)
    }

    if (e.key === 'o') {
      toggleOverlay()
    }

    if (e.key === 'h') {
      scene1.halfResolution = !scene1.halfResolution
      scene2.halfResolution = !scene2.halfResolution
      scene3.halfResolution = !scene3.halfResolution

      resizeScenes(true)
    }
  }

  useEffect(() => {
    wifiVideo.connect()

    scene1.addVideo(new Record3DVideo(wifiVideo, 1))

    scene1.runLoop()
    scene2.runLoop()
    scene3.runLoop()

    document.addEventListener('keydown', keyListener)

    return () => {
      window.removeEventListener('keydown', keyListener)
    }
  }, [])

  useEffect(() => {
    if (sceneCount === 1) {
      scene2.removeVideos()
      scene3.removeVideos()
    } else if (sceneCount === 2) {
      scene3.removeVideos()
    }

    if (sceneCount > 1 && previousCount.current !== 3) {
      scene2.addVideo(new Record3DVideo(wifiVideo, 2))
    }

    if (sceneCount === 3) {
      scene3.addVideo(new Record3DVideo(wifiVideo, 3))
    }

    hideElements('#r3d-video, #r3d-canvas')

    resizeScenes()

    previousCount.current = sceneCount
  }, [sceneCount])

  const resetAll = () => {}

  return (
    <div id='toolbar' className='hidden'>
      <a onClick={resetAll} id='button-reset'>
        Reset
      </a>
      <a onClick={hideOverlay} id='button-arrange'>
        Arrange
      </a>
      <a onClick={showOverlay} id='button-overlay'>
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
      {/* <div id='slider-noise'>
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
      </div> */}
      <div id='preset-list'></div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)

root.render(<App />)
