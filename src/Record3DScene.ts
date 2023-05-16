import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass.js'
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'

import { guiHelper } from './gui-helper.js'
import { Record3DVideo } from './Record3DVideo.js'

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
    this.camera.position.z = 0.2
    this.camera.lookAt(new THREE.Vector3(0, 0, 0))

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.mainScene, this.camera))

    const filmPass = new FilmPass(
      0.75, // noise intensity
      0.25, // scanline intensity
      648, // scanline count
      1.0 // grayscale
    )
    filmPass.renderToScreen = true

    // this.composer.addPass(filmPass)

    // Camera control settings
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableZoom = true
    this.controls.update()
    this.controls.target.set(0, 0, 0)

    this.pointClouds = []

    // Init scene
    this.renderer.setClearColor(new THREE.Color(0x343a40))
    this.renderer.setPixelRatio(window.devicePixelRatio)

    document.body.appendChild(this.renderer.domElement)

    // Setup resizing
    window.addEventListener('resize', this.onWindowResize.bind(this), false)
    this.onWindowResize()

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

    if (Math.random() > 0.0) {
      for (let ptCloud of this.pointClouds) {
        ptCloud.setSeed()
      }
    }

    this.composer.render(deltaTime)
    requestAnimationFrame(this.runLoop.bind(this))
  }

  toggleSound() {
    for (let ptCloud of this.pointClouds) {
      ptCloud.toggleSound()
    }
  }

  resizeRendererToDisplaySize() {
    // https://threejsfundamentals.org/threejs/lessons/threejs-responsive.html
    const canvas = this.renderer.domElement
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const needResize = canvas.width !== width || canvas.height !== height

    if (needResize) {
      // this.composer.setSize(canvas.width, canvas.height)
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
}
