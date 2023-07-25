import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useHotkeys } from 'react-hotkeys-hook'
import { HotkeysEvent } from 'react-hotkeys-hook/dist/types'

import { Record3DScene } from './Record3DScene'
import { addClass, hide, removeClass, toggle } from './utils'

// @ts-ignore
if (typeof window.InstallTrigger !== undefined) {
  addClass('body', 'firefox')
}

const scenes = {
  scene1: new Record3DScene(40, 1e-4, 1e5, 1),
  scene2: new Record3DScene(40, 1e-4, 1e5, 2),
  scene3: new Record3DScene(40, 1e-4, 1e5, 3)
}

Object.values(scenes).forEach(scene => {
  scene.onClick((id: number) => {
    currentScene = getCurrentScene(id)
  })
})

const __DEV__ = false

let currentScene = scenes.scene1

const getCurrentScene = (id: number) =>
  Object.values(scenes).find(scene => scene.id === id) || currentScene

addClass('body', 'scenes-2')

if (!__DEV__) {
  hide('.lil-gui, [id^=r3d-video], #r3d-canvas')
}

const App = () => {
  const [playing, setPlaying] = useState(true)
  const [sceneCount, setSceneCount] = useState(2)
  const previousCount = useRef(1)

  const toolbarVisible = () =>
    !document.querySelector('#toolbar')?.classList.contains('hidden')

  const pauseVideos = useCallback(async () => {
    Object.values(scenes).forEach(scene => {
      scene.pauseVideo()
    })
    await setPlaying(false)
  }, [])

  const playVideos = useCallback(async () => {
    Object.values(scenes).forEach(scene => {
      scene.playVideo()
    })
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
    Object.values(scenes).forEach(scene => {
      scene.onWindowResize(force)
    })
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
    Object.values(scenes).forEach(scene => {
      scene.toggleHalfResolution()
    })

    resizeScenes(true)
  })

  useHotkeys('tab,0', e => {
    e.preventDefault()
    toggle('#toolbar')

    if (!toolbarVisible()) {
      hide('.lil-gui')
      hide('[id^=r3d-video], #r3d-canvas')
    }
  })

  useHotkeys('x', () => toolbarVisible() && toggle('.lil-gui'))
  useHotkeys(
    'v',
    () => toolbarVisible() && toggle('[id^=r3d-video], #r3d-canvas')
  )
  useHotkeys('o', toggleOverlay)
  useHotkeys('space', toggleVideoPlayback)
  useHotkeys('shift+r+1', scenes.scene1.resetCameraPosition)
  useHotkeys('shift+r+2', scenes.scene2.resetCameraPosition)
  useHotkeys('shift+r+3', scenes.scene3.resetCameraPosition)
  useHotkeys('a', () => currentScene.advanceHorizontalRotation())

  // init
  useEffect(() => {
    scenes.scene1.useStreamingVideo()
    scenes.scene2.useStreamingVideo()
    scenes.scene3.useStreamingVideo()

    scenes.scene1.runLoop()
    scenes.scene2.runLoop()

    if (!__DEV__) {
      hide('#toolbar')
    }
  }, [])

  // scene count handler
  useEffect(() => {
    if (sceneCount === 1) {
      scenes.scene2.stopLoop()
      scenes.scene3.stopLoop()
    } else if (sceneCount === 2) {
      scenes.scene3.stopLoop()
    }

    if (sceneCount > 1 && previousCount.current === 1) {
      scenes.scene2.runLoop()
    }

    if (sceneCount === 3) {
      scenes.scene3.runLoop()
    }

    hide('[id^=r3d-video], #r3d-canvas')

    resizeScenes()

    previousCount.current = sceneCount
  }, [sceneCount])

  const resetAll = () => {
    Object.values(scenes).forEach(scene => {
      scene.resetCameraPosition()
      scene.resetOptions()
    })
  }

  return (
    <div id='toolbar'>
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
      <div id='preset-list'></div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)

root.render(<App />)
