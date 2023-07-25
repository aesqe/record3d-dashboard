import * as THREE from 'three'
import GUI from 'lil-gui'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls.js'

import {
  guiHelper,
  addGuiPreset,
  LilGuiPreset,
  getGuiPresetsList,
  getGuiPresets
} from './gui-helper'
import { Record3DVideo } from './Record3DVideo'
import { getCameraPosition, getPeerAddresses } from './utils'
import { UrlVideoSource } from './video-sources/URLVideoSource'
import { WiFiStreamedVideoSource } from './video-sources/WiFiStreamedVideoSource'

let then = 0

const peerAddress = getPeerAddresses()[0]
const wiFiVideoSource = new WiFiStreamedVideoSource(peerAddress)

type CameraPreset = {
  position: THREE.Euler
  name: string
}

const cameraPresetPositions: CameraPreset[] = [
  { position: new THREE.Euler(0, 0, 4), name: 'front' },
  { position: new THREE.Euler(4, 0, 0), name: 'right' },
  { position: new THREE.Euler(0, 0, -4), name: 'back' },
  { position: new THREE.Euler(-4, 0, 0), name: 'left' },
  { position: new THREE.Euler(0, 4, 0), name: 'top' },
  { position: new THREE.Euler(0, -4, 0), name: 'bottom' }
]

export class Record3DScene {
  id: number
  scene: THREE.Scene
  renderer: THREE.WebGLRenderer
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  arcBallControls: ArcballControls
  composer: EffectComposer
  pointClouds: Record3DVideo[]
  guiOptions: any
  gui: GUI
  halfResolution: boolean
  randomizeSeed: boolean
  animationFrameId: number
  cameraPresetPositions: CameraPreset[]
  currentCameraPresetIndex: number
  projectionBoundingBox: THREE.Mesh
  currentCameraPreset: CameraPreset | null

  constructor(fov: number, near: number, far: number, id = 1) {
    const ratio = window.innerWidth / window.innerHeight

    this.resetCameraPosition = this.resetCameraPosition.bind(this)
    this.onWindowResize = this.onWindowResize.bind(this)
    this.resetOptions = this.resetOptions.bind(this)
    this.importPresets = this.importPresets.bind(this)
    this.exportPresets = this.exportPresets.bind(this)
    this.savePreset = this.savePreset.bind(this)
    this.runLoop = this.runLoop.bind(this)
    this.onClick = this.onClick.bind(this)
    this.advanceHorizontalRotation = this.advanceHorizontalRotation.bind(this)
    this.importLocalVideo = this.importLocalVideo.bind(this)
    this.useStreamingVideo = this.useStreamingVideo.bind(this)
    this.toggleBoundingBox = this.toggleBoundingBox.bind(this)

    this.id = id
    this.halfResolution = false
    this.randomizeSeed = false
    this.animationFrameId = 0
    this.pointClouds = []

    this.scene = new THREE.Scene()
    this.scene.background = null
    this.renderer = new THREE.WebGLRenderer({ alpha: true })
    this.renderer.domElement.id = `canvas-${id}`
    this.renderer.setPixelRatio(window.devicePixelRatio)

    this.projectionBoundingBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.5, 1.5),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.25,
        wireframe: true
      })
    )
    this.projectionBoundingBox.position.set(0, 0, 0)
    this.projectionBoundingBox.visible = false

    this.scene.add(this.projectionBoundingBox)

    this.camera = new THREE.PerspectiveCamera(fov, ratio, near, far)
    this.camera.position.set(0, 0, 1)
    this.camera.lookAt(this.projectionBoundingBox.position)

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))

    this.gui = this.setupGUI()
    this.controls = this.setupOrbitControls()
    this.arcBallControls = this.setupArcballControls()

    this.currentCameraPreset = null
    this.currentCameraPresetIndex = -1
    this.cameraPresetPositions = cameraPresetPositions

    window.addEventListener('resize', this.onWindowResize, false)
    this.onWindowResize()

    document.body.appendChild(this.renderer.domElement)
  }

  onClick(callback: (id: number) => void) {
    this.renderer.domElement.addEventListener('click', () => {
      callback(this.id)
    })
  }

  pauseVideo() {
    for (let ptCloud of this.pointClouds) {
      ptCloud.videoSource.videoTag.pause()
    }
  }

  playVideo() {
    for (let ptCloud of this.pointClouds) {
      ptCloud.videoSource.videoTag.play()
    }
  }

  advanceHorizontalRotation() {
    const index = this.currentCameraPresetIndex
    this.currentCameraPresetIndex =
      index === this.cameraPresetPositions.length - 1 ? 0 : index + 1

    this.currentCameraPreset =
      this.cameraPresetPositions[this.currentCameraPresetIndex]

    this.setCameraPosition(this.currentCameraPreset.position)
  }

  setCameraPosition(position: THREE.Euler) {
    this.controls.reset()
    this.arcBallControls.reset()

    this.camera.rotation.set(0, 0, 0)
    this.camera.position.setFromEuler(position)
    this.camera.lookAt(this.projectionBoundingBox.position)
    this.camera.updateProjectionMatrix()

    this.controls.update()
    this.arcBallControls.update()
  }

  setupOrbitControls() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement)

    controls.enabled = false
    controls.enableZoom = true
    controls.screenSpacePanning = false
    controls.target.set(0, 0, 0)
    controls.keys = {
      LEFT: 'ArrowLeft',
      UP: 'ArrowUp',
      RIGHT: 'ArrowRight',
      BOTTOM: 'ArrowDown'
    }
    controls.listenToKeyEvents(window)

    return controls
  }

  setupArcballControls() {
    const controls = new ArcballControls(
      this.camera,
      this.renderer.domElement,
      this.scene
    )

    controls.enabled = true
    controls.setGizmosVisible(false)
    controls.target.set(0, 0, 0)

    return controls
  }

  setupGUI() {
    let self = this

    this.guiOptions = {
      modelScale: 1.0,
      modelPointSize: 1.0,

      opacity: 0.5,
      saturation: 1.0,
      singleColorVec: '#ffffff',
      useSingleColor: true,
      backgroundColor: '#57554f',
      transparentBackground: () => {},

      useNoise: false,
      noiseStrength: 0.0,

      depthThresholdFilter: 1.0,
      absoluteDepthRangeFilterX: 0.1,
      absoluteDepthRangeFilterY: 2.8,

      renderNthPoint: 1,
      renderingMode: 'points',
      halfResolution: false,
      randomizeSeed: false,

      presetName: 'None',
      cameraPosition: () => {},

      resetOptions: self.resetOptions,
      importPresets: self.importPresets,
      exportPresets: self.exportPresets,
      savePreset: self.savePreset,
      importLocalVideo: self.importLocalVideo,
      useStreamingVideo: self.useStreamingVideo,
      toggleBoundingBox: self.toggleBoundingBox,

      toggleSound: () => {},

      controlsType: 'arcball',
      showArcBallGizmo: false
    }

    const gui = guiHelper(self)
    gui.domElement.id = `gui-${self.renderer.domElement.id}`

    return gui
  }

  toggleBoundingBox() {
    this.projectionBoundingBox.visible = !this.projectionBoundingBox.visible
  }

  resetOptions() {
    this.gui.reset()
  }

  importPresets() {
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

            this.gui.controllers
              .find(c => c.property === 'presetName')
              ?.setValue(getGuiPresetsList())
          }
        }
      }
    }

    input.click()
  }

  exportPresets() {
    const downloadAnchorNode = document.createElement('a')
    const presets = encodeURIComponent(JSON.stringify(getGuiPresets()))
    const dataStr = 'data:text/json;charset=utf-8,' + presets

    downloadAnchorNode.setAttribute('href', dataStr)
    downloadAnchorNode.setAttribute('download', 'presets.json')
    document.body.appendChild(downloadAnchorNode) // required for firefox
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  savePreset() {
    const rnd = Math.random() * 1000 * Date.now()
    const presetName = prompt(
      'Please enter preset name',
      `New Preset ${parseInt(rnd.toString())}`
    )

    if (presetName) {
      const preset = this.gui.save() as LilGuiPreset
      preset.name = presetName
      preset.view = getCameraPosition(this)

      addGuiPreset(preset)

      this.gui.controllers
        .find(c => c.property === 'presetName')
        ?.setValue(getGuiPresetsList())
    }
  }

  addVideo(r3dVideo: Record3DVideo) {
    this.pointClouds.push(r3dVideo)
    this.scene.add(r3dVideo.videoObject)
  }

  async removeVideos() {
    for (let ptCloud of this.pointClouds) {
      await this.scene.remove(ptCloud.videoObject)
    }

    this.pointClouds = []
  }

  async setVideoSource(videoSource: UrlVideoSource | WiFiStreamedVideoSource) {
    await this.removeVideos()

    this.addVideo(new Record3DVideo(videoSource, this.id))
  }

  importLocalVideo() {
    const self = this
    const inputNode = document.createElement('input')

    inputNode.type = 'file'
    inputNode.accept = 'video/*'

    document.body.appendChild(inputNode) // required for firefox

    inputNode.addEventListener(
      'change',
      () => {
        const file = inputNode.files![0]
        const fileURL = window.URL.createObjectURL(file)

        const videoSource = new UrlVideoSource()
        videoSource.load(fileURL)

        self.setVideoSource(videoSource)

        inputNode.remove()
      },
      false
    )

    inputNode.click()
  }

  useStreamingVideo() {
    wiFiVideoSource.connect()

    this.setVideoSource(wiFiVideoSource)
  }

  stopLoop() {
    cancelAnimationFrame(this.animationFrameId)
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
    this.animationFrameId = requestAnimationFrame(this.runLoop)
  }

  toggleSound() {
    for (let ptCloud of this.pointClouds) {
      ptCloud.toggleSound()
    }
  }

  toggleHalfResolution() {
    this.halfResolution = !this.halfResolution
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
      // this.controls.update()
    }
  }

  resetCameraPosition() {
    this.controls.reset()
    this.arcBallControls.reset()

    this.camera.position.set(0, 0, 1)
    this.camera.rotation.set(0, 0, 0)
    this.camera.lookAt(new THREE.Vector3(0, 0, 0))

    this.controls.update()
    this.arcBallControls.update()
  }
}
