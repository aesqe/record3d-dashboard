import * as THREE from 'three'
import GUI from 'lil-gui'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'

import {
  guiHelper,
  addGuiPreset,
  LilGuiPreset,
  getGuiPresetsList,
  getGuiPresets
} from './gui-helper'
import { Record3DVideo } from './Record3DVideo'
import { getCameraPosition } from './utils'

let then = 0

export class Record3DScene {
  mainScene: THREE.Scene
  renderer: THREE.WebGLRenderer
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  composer: EffectComposer
  pointClouds: Record3DVideo[]
  options: any
  gui: GUI
  halfResolution: boolean
  randomizeSeed: boolean

  constructor(fov: number, near: number, far: number, id = 'canvas1') {
    this.onDocumentKeyDown = this.onDocumentKeyDown.bind(this)
    this.onWindowResize = this.onWindowResize.bind(this)
    this.runLoop = this.runLoop.bind(this)

    let self = this
    this.halfResolution = false
    this.randomizeSeed = false
    this.mainScene = new THREE.Scene()
    this.mainScene.background = null
    this.renderer = new THREE.WebGLRenderer({ alpha: true })
    this.renderer.domElement.id = id

    // Camera settings
    this.camera = new THREE.PerspectiveCamera(
      fov,
      window.innerWidth / window.innerHeight,
      near,
      far
    )
    this.camera.position.x = 0.0
    this.camera.position.y = 0.0
    this.camera.position.z = 1.0
    this.camera.lookAt(new THREE.Vector3(0, 0, 0))

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.mainScene, this.camera))

    // Camera control settings
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableZoom = true
    this.controls.target.set(0, 0, 0)

    var minPan = new THREE.Vector3(-2, -2, -2)
    var maxPan = new THREE.Vector3(2, 2, 2)
    var _v = new THREE.Vector3()

    const controls = this.controls
    const camera = this.camera

    controls.addEventListener('change', function () {
      _v.copy(controls.target)
      controls.target.clamp(minPan, maxPan)
      _v.sub(controls.target)
      camera.position.sub(_v)
    })

    this.pointClouds = []

    // Init scene
    this.renderer.setPixelRatio(window.devicePixelRatio)

    document.body.appendChild(this.renderer.domElement)

    // Setup resizing
    window.addEventListener('resize', this.onWindowResize, false)
    this.onWindowResize()

    document.addEventListener('keydown', this.onDocumentKeyDown)

    // Setup UI
    this.options = {
      modelScale: 1.0,
      modelPointSize: 1.0,
      opacity: 0.5,
      saturation: 1.0,
      singleColorVec: '#ffffff',
      useSingleColor: true,
      renderNthPoint: 1,
      useNoise: false,
      noiseStrength: 0.0,
      presetName: 'None',
      backgroundColor: '#57554f',
      depthThresholdFilter: 1.0,
      absoluteDepthRangeFilterX: 0.1,
      absoluteDepthRangeFilterY: 2.8,
      renderingMode: 'points',
      halfResolution: false,
      randomizeSeed: false,
      exportPresets: () => {
        const presets = getGuiPresets()
        const dataStr =
          'data:text/json;charset=utf-8,' +
          encodeURIComponent(JSON.stringify(presets))
        const downloadAnchorNode = document.createElement('a')
        downloadAnchorNode.setAttribute('href', dataStr)
        downloadAnchorNode.setAttribute('download', 'presets.json')
        document.body.appendChild(downloadAnchorNode) // required for firefox
        downloadAnchorNode.click()
        downloadAnchorNode.remove()
      },
      importPresets: () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        input.onchange = e => {
          const file = (e.target as HTMLInputElement).files?.[0]
          if (file) {
            const reader = new FileReader()
            reader.readAsText(file, 'UTF-8')
            reader.onload = readerEvent => {
              const content = readerEvent.target?.result
              if (typeof content === 'string') {
                const presets = JSON.parse(content) as LilGuiPreset[]
                for (let preset of presets) {
                  addGuiPreset(preset)
                }
                self.gui.controllers
                  .find(c => c.property === 'presetName')
                  ?.setValue(getGuiPresetsList())
              }
            }
          }
        }
        input.click()
      },
      transparentBackground() {
        self.renderer.domElement.style.backgroundColor = 'transparent'
        self.renderer.setClearColor(0x000000, 0)
      },
      savePreset() {
        const rnd = Math.random() * 1000 * Date.now()
        const presetName = prompt(
          'Please enter preset name',
          `New Preset ${parseInt(rnd.toString())}`
        )

        if (presetName) {
          const preset = self.gui.save() as LilGuiPreset
          preset.name = presetName
          preset.view = getCameraPosition(self)

          addGuiPreset(preset)

          console.log(
            self.gui.controllers.find(c => c.property === 'presetName')
          )
          self.gui.controllers
            .find(c => c.property === 'presetName')
            ?.setValue(getGuiPresetsList())
        }
      },
      toggleSound: () => {
        for (let video of self.pointClouds) video.toggleSound()
      }
    }

    this.gui = guiHelper(self)
    this.gui.domElement.id = `gui-${id}`
  }

  addVideo(r3dVideo: Record3DVideo) {
    this.pointClouds.push(r3dVideo)
    this.mainScene.add(r3dVideo.videoObject)
  }

  removeVideos() {
    for (let ptCloud of this.pointClouds) {
      this.mainScene.remove(ptCloud.videoObject)
    }
    this.pointClouds = []
  }

  runLoop(now = then) {
    now *= 0.001 // convert to seconds
    const deltaTime = now - then
    then = now

    if (Math.random() > 0.85 && this.randomizeSeed) {
      for (let ptCloud of this.pointClouds) {
        ptCloud.setSeed()
      }
    }

    this.composer.render(deltaTime)
    requestAnimationFrame(this.runLoop)
  }

  toggleSound() {
    for (let ptCloud of this.pointClouds) {
      ptCloud.toggleSound()
    }
  }

  onWindowResize(force?: any) {
    const canvas = this.renderer.domElement
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const needResize = canvas.width !== width || canvas.height !== height
    const divider = this.halfResolution ? 2 : 1

    if (needResize || force === true) {
      this.composer.setSize(width, height)
      this.renderer.setSize(width / divider, height / divider, false)
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
      this.controls.update()
    }
  }

  onDocumentKeyDown(event: KeyboardEvent) {
    const keyCode = event.key
    const shiftKey = event

    if (keyCode === 'ArrowUp') {
      if (shiftKey) {
        this.camera.position.setY(this.camera.position.y + 0.1)
      } else {
        this.camera.position.setZ(this.camera.position.z + 0.1)
      }
    } else if (keyCode === 'ArrowDown') {
      if (shiftKey) {
        this.camera.position.setY(this.camera.position.y - 0.1)
      } else {
        this.camera.position.setZ(this.camera.position.z - 0.1)
      }
    } else if (keyCode === 'ArrowRight') {
      this.camera.position.setX(this.camera.position.x + 0.1)
    } else if (keyCode === 'ArrowLeft') {
      this.camera.position.setX(this.camera.position.x - 0.1)
    } else if (keyCode === 'R' && shiftKey) {
      this.camera.position.x = 0.0
      this.camera.position.y = 0.0
      this.camera.position.z = 1.0
      this.camera.lookAt(new THREE.Vector3(0, 0, 0))
      this.controls.update()
    } else if (keyCode === 'q') {
      this.camera.rotateX(0.1)
    } else if (keyCode === 'e') {
      this.camera.rotateZ(0.1)
    } else if (keyCode === 'w') {
      this.camera.rotateY(0.1)
    } else if (keyCode === 'Q') {
      this.camera.rotateX(-0.1)
    } else if (keyCode === 'E') {
      this.camera.rotateZ(-0.1)
    } else if (keyCode === 'W') {
      this.camera.rotateY(-0.1)
    }
  }
}
