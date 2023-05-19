import * as THREE from 'three'
import GUI from 'lil-gui'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'

import {
  guiHelper,
  addGuiPreset,
  LilGuiPreset,
  getGuiPresetsList
} from './gui-helper'
import { Record3DVideo } from './Record3DVideo'

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

  constructor(fov: number, near: number, far: number, id = 'canvas1') {
    let self = this
    this.mainScene = new THREE.Scene()
    this.renderer = new THREE.WebGLRenderer()
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

    this.controls.update()

    this.runLoop = this.runLoop.bind(this)

    this.pointClouds = []

    // Init scene
    this.renderer.setClearColor(new THREE.Color(0x57554f))
    this.renderer.setPixelRatio(window.devicePixelRatio)

    document.body.appendChild(this.renderer.domElement)

    // Setup resizing
    window.addEventListener('resize', this.onWindowResize.bind(this), false)
    this.onWindowResize()

    document.addEventListener(
      'keydown',
      this.onDocumentKeyDown.bind(this),
      false
    )

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
      savePreset() {
        const rnd = Math.random() * 1000 * Date.now()
        const presetName = prompt(
          'Please enter preset name',
          `New Preset ${parseInt(rnd.toString())}`
        )

        if (presetName) {
          const preset = self.gui.save() as LilGuiPreset
          preset.name = presetName
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
      },
      toggleVideo: () => {
        for (let video of self.pointClouds) video.toggle()
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

    if (Math.random() > 1.8) {
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

  resizeRendererToDisplaySize() {
    const canvas = this.renderer.domElement
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const needResize = canvas.width !== width || canvas.height !== height

    if (needResize) {
      this.composer.setSize(canvas.width, canvas.height)
      this.renderer.setSize(width, height, false)
    }

    return needResize
  }

  onWindowResize() {
    if (this.resizeRendererToDisplaySize()) {
      const canvas = this.renderer.domElement
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight
      this.camera.updateProjectionMatrix()
      this.composer.setSize(canvas.width, canvas.height)
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

    this.controls.update()

    console.log(event)
  }
}
