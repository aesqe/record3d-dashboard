import * as THREE from 'three'
import { getPointCloudShaderMaterial } from './pointcloud-material.js'
import { WiFiStreamedVideoSource } from './video-sources/WiFiStreamedVideoSource.js'
import { hexToGL } from './utils.js'

export class Record3DVideo {
  material: THREE.ShaderMaterial | null
  videoSource: WiFiStreamedVideoSource | null
  videoObject: THREE.Group
  videoTexture: THREE.VideoTexture | null
  buffIndices: Uint32Array
  buffPointIndicesAttr: Float32Array

  constructor(videoSource) {
    this.videoSource = null
    this.videoTexture = null
    this.material = null
    this.buffIndices = new Uint32Array(0)
    this.buffPointIndicesAttr = new Float32Array(0)
    this.videoObject = new THREE.Group()

    this.setVideoSource(videoSource)
  }

  async setVideoSource(videoSource) {
    this.material = await getPointCloudShaderMaterial()

    if (videoSource !== this.videoSource) {
      this.videoSource = videoSource

      let self = this
      videoSource.onVideoChange = () => {
        self.onVideoTagChanged()
      }
    }

    if (videoSource.isVideoLoaded) {
      this.onVideoTagChanged()
    } else {
      this.switchRenderingToPoints()
    }
  }

  onVideoTagChanged() {
    let material = this.material as THREE.ShaderMaterial
    let videoSource = this.videoSource as WiFiStreamedVideoSource

    this.videoTexture = new THREE.VideoTexture(
      videoSource?.videoTag as HTMLVideoElement
    )
    this.videoTexture.minFilter = THREE.LinearFilter
    this.videoTexture.magFilter = THREE.LinearFilter
    this.videoTexture.format = THREE.RGBAFormat

    videoSource?.videoTag.play()

    let newVideoWidth = videoSource?.videoTag.videoWidth
    let newVideoHeight = videoSource?.videoTag.videoHeight

    material.uniforms.texSize.value = [newVideoWidth, newVideoHeight]
    material.uniforms.texImg.value = this.videoTexture

    let intrinsicMatrix = videoSource.intrMat as THREE.Matrix3
    let ifx = 1.0 / intrinsicMatrix.elements[0]
    let ify = 1.0 / intrinsicMatrix.elements[4]
    let itx = -intrinsicMatrix.elements[2] / intrinsicMatrix.elements[0]
    let ity = -intrinsicMatrix.elements[5] / intrinsicMatrix.elements[4]

    material.uniforms.iK.value = [ifx, ify, itx, ity]

    this.switchRenderingToPoints()
  }

  removeVideoObjectChildren() {
    while (this.videoObject.children.length > 0) {
      this.videoObject.remove(this.videoObject.children[0])
    }
  }

  switchRenderingToPoints() {
    this.removeVideoObjectChildren()

    let videoSize = this.videoSource?.getVideoSize()
    let numPoints = (videoSize?.width ?? 0) * (videoSize?.height ?? 0)

    this.buffIndices = new Uint32Array(numPoints)
    this.buffPointIndicesAttr = new Float32Array(numPoints)

    for (let ptIdx = 0; ptIdx < numPoints; ptIdx++) {
      this.buffIndices[ptIdx] = ptIdx
      this.buffPointIndicesAttr[ptIdx] = parseFloat(ptIdx.toString())
    }

    let geometry = new THREE.BufferGeometry()

    geometry.setAttribute(
      'vertexIdx',
      new THREE.Float32BufferAttribute(this.buffPointIndicesAttr, 1)
    )

    geometry.setIndex(new THREE.Uint32BufferAttribute(this.buffIndices, 1))

    let points = new THREE.Points(
      geometry,
      this.material as THREE.ShaderMaterial
    )
    points.frustumCulled = false
    this.videoObject.add(points)

    console.log(points)
  }

  toggle() {
    this.videoSource?.toggle()
  }

  toggleSound() {
    this.videoSource?.toggleAudio()
  }

  setScale(value) {
    for (let video of this.videoObject.children) {
      ;(
        video as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>
      ).material.uniforms.scale.value = value
    }
  }

  setPointSize(value) {
    for (let video of this.videoObject.children) {
      ;(
        video as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>
      ).material.uniforms.ptSize.value = value
    }
  }

  setOpacity(value) {
    for (let video of this.videoObject.children) {
      ;(
        video as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>
      ).material.uniforms.opacity.value = value
    }
  }

  setSaturation(value) {
    for (let video of this.videoObject.children) {
      ;(
        video as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>
      ).material.uniforms.saturation.value = value
    }
  }

  setSingleColor(value) {
    const color = hexToGL(value).map(val => parseFloat(val.toFixed(3)))

    for (let video of this.videoObject.children) {
      ;(
        video as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>
      ).material.uniforms.singleColorVec.value = color
    }
  }

  setUseSingleColor(value) {
    for (let video of this.videoObject.children) {
      ;(
        video as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>
      ).material.uniforms.useSingleColor.value = value
    }
  }

  setRenderNthPoint(value) {
    for (let video of this.videoObject.children) {
      ;(
        video as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>
      ).material.uniforms.renderNthPoint.value = value
    }
  }
}
