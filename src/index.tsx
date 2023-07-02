import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useHotkeys } from 'react-hotkeys-hook'
import { HotkeysEvent } from 'react-hotkeys-hook/dist/types'

import { WiFiStreamedVideoSource } from './video-sources/WiFiStreamedVideoSource'
import { Record3DVideo } from './Record3DVideo'
import { Record3DScene } from './Record3DScene'
import { addClass, hide, removeClass, toggle, getPeerAddresses } from './utils'
// import { UrlVideoSource } from './video-sources/URLVideoSource'

// @ts-ignore
if (typeof window.InstallTrigger !== undefined) {
  addClass('body', 'firefox')
}

const peerAddress = getPeerAddresses()[0]
const videoSource = new WiFiStreamedVideoSource(peerAddress)
// const videoSource = new UrlVideoSource()
// videoSource.load('http://localhost:3000/test.mp4')
const scene1 = new Record3DScene(40, 1e-4, 1e5, 'canvas-1')
const scene2 = new Record3DScene(40, 1e-4, 1e5, 'canvas-2')
const scene3 = new Record3DScene(40, 1e-4, 1e5, 'canvas-3')

if (videoSource instanceof WiFiStreamedVideoSource) {
  videoSource.connect()
}

hide('.lil-gui, #r3d-video, #r3d-canvas')
addClass('body', 'scenes-2')

const App = () => {
  const [playing, setPlaying] = useState(true)
  const [sceneCount, setSceneCount] = useState(2)
  const previousCount = useRef(1)

  const toolbarVisible = () =>
    !document.querySelector('#toolbar')?.classList.contains('hidden')

  const pauseVideos = useCallback(async () => {
    await videoSource.videoTag.pause()
    await setPlaying(false)
  }, [])

  const playVideos = useCallback(async () => {
    await videoSource.videoTag.play()
    await setPlaying(true)
  }, [])

  const toggleVideoPlayback = useCallback(async () => {
    if (playing) {
      await pauseVideos()
    } else {
      await playVideos()
    }
  }, [playing])

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

  // keyboard shortcuts

  useHotkeys('1,2,3', (_, h: HotkeysEvent) => {
    const count = parseInt(h.keys?.[0] || '')

    setSceneCount(count)
    removeClass('body', 'scenes-1')
    removeClass('body', 'scenes-2')
    removeClass('body', 'scenes-3')
    addClass('body', 'scenes-' + count)
  })

  useHotkeys('h', () => {
    scene1.toggleHalfResolution()
    scene2.toggleHalfResolution()
    scene3.toggleHalfResolution()

    resizeScenes(true)
  })

  useHotkeys('tab,0', e => {
    e.preventDefault()
    toggle('#toolbar')

    if (!toolbarVisible()) {
      hide('.lil-gui')
      hide('#r3d-video, #r3d-canvas')
    }
  })

  useHotkeys('x', () => toolbarVisible() && toggle('.lil-gui'))
  useHotkeys('v', () => toolbarVisible() && toggle('#r3d-video, #r3d-canvas'))
  useHotkeys('o', toggleOverlay)
  useHotkeys('space', toggleVideoPlayback)
  useHotkeys('shift+r+1', scene1.resetCameraPosition)
  useHotkeys('shift+r+2', scene2.resetCameraPosition)
  useHotkeys('shift+r+3', scene3.resetCameraPosition)

  // init
  useEffect(() => {
    scene1.addVideo(new Record3DVideo(videoSource, 1))
    scene2.addVideo(new Record3DVideo(videoSource, 2))
    scene3.addVideo(new Record3DVideo(videoSource, 3))

    scene1.runLoop()
    scene2.runLoop()
  }, [])

  // scene count handler
  useEffect(() => {
    if (sceneCount === 1) {
      scene2.stopLoop()
      scene3.stopLoop()
    } else if (sceneCount === 2) {
      scene3.stopLoop()
    }

    if (sceneCount > 1 && previousCount.current === 1) {
      scene2.runLoop()
    }

    if (sceneCount === 3) {
      scene3.runLoop()
    }

    hide('#r3d-video, #r3d-canvas')

    resizeScenes()

    previousCount.current = sceneCount
  }, [sceneCount])

  const resetAll = () => {
    scene1.resetCameraPosition()
    scene1.resetOptions()
    scene2.resetCameraPosition()
    scene2.resetOptions()
    scene3.resetCameraPosition()
    scene3.resetOptions()
  }

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
      <a onClick={() => toggle('.lil-gui')} id='button-fx'>
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
