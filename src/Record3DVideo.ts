import * as THREE from 'three'

import { getPointCloudShaderMaterial } from './pointcloud-material'
import { WiFiStreamedVideoSource } from './video-sources/WiFiStreamedVideoSource'
import { UrlVideoSource } from './video-sources/URLVideoSource'
import { hexToGL } from './utils'

interface VideoObject extends THREE.Group {
  children: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>[]
}
interface Spheres extends THREE.Group {
  children: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>[]
}

export class Record3DVideo {
  material: THREE.ShaderMaterial
  videoSource: WiFiStreamedVideoSource | UrlVideoSource
  videoObject: VideoObject
  spheres: Spheres
  sphereMesh: THREE.InstancedMesh
  id: number
  vertexIdx: THREE.Float32BufferAttribute
  geometryIndex: THREE.Uint32BufferAttribute
  spheresCount: number
  dummy: THREE.Object3D
  renderingMode: string

  constructor(
    videoSource: WiFiStreamedVideoSource | UrlVideoSource,
    id: number
  ) {
    this.id = id
    this.videoSource = {} as WiFiStreamedVideoSource
    this.material = {} as THREE.ShaderMaterial
    this.videoObject = new THREE.Group() as VideoObject
    this.spheres = new THREE.Group() as Spheres
    this.sphereMesh = {} as THREE.InstancedMesh
    this.vertexIdx = {} as THREE.Float32BufferAttribute
    this.geometryIndex = {} as THREE.Uint32BufferAttribute
    this.spheresCount = 1000
    this.renderingMode = 'points'
    this.dummy = {} as THREE.Object3D

    this.setVideoSource(videoSource)
  }

  async setVideoSource(videoSource: WiFiStreamedVideoSource | UrlVideoSource) {
    this.material = await getPointCloudShaderMaterial()

    this.videoSource = videoSource

    const existingChangeHandler = videoSource.onVideoChange
    const changeHandler = this.onVideoTagChanged.bind(this)

    videoSource.onVideoChange = () => {
      if (existingChangeHandler && existingChangeHandler !== changeHandler) {
        existingChangeHandler?.()
      }

      changeHandler()
    }
  }

  onVideoTagChanged() {
    while (this.videoObject.children.length > 0) {
      this.videoObject.remove(this.videoObject.children[0])
    }

    const videoSource = this.videoSource
    const videoSize = videoSource.getVideoSize()

    if (videoSize.width === 0 || videoSize.height === 0) {
      return
    }

    videoSource.onVideoFrameCallback = () => {}

    videoSource.videoTag.play()

    const videoTexture = new THREE.VideoTexture(videoSource.videoTag)
    videoTexture.minFilter = THREE.LinearFilter
    videoTexture.magFilter = THREE.LinearFilter
    videoTexture.format = THREE.RGBAFormat

    const textureWidth = videoSource.videoTag.videoWidth
    const textureHeight = videoSource.videoTag.videoHeight

    this.material.uniforms.texSize.value = [textureWidth, textureHeight]
    this.material.uniforms.texImg.value = videoTexture
    this.material.uniforms.iK.value = videoSource.getIKValue()

    switch (this.renderingMode) {
      case 'mesh':
        this.renderMesh(false)
        break
      case 'mesh-wireframe':
        this.renderMesh(true)
        break
      case 'spheres':
        this.renderInstancedSpheres()
        break
      default:
        this.renderPointCloud()
        break
    }
  }

  renderPointCloud() {
    const geometry = new THREE.BufferGeometry()
    const videoSize = this.videoSource.getVideoSize()
    const numPoints = videoSize.width * videoSize.height
    const bufferIndices = new Array(numPoints).fill(0).map((_, i) => i)

    this.vertexIdx = new THREE.Float32BufferAttribute(bufferIndices, 1)
    this.geometryIndex = new THREE.Uint32BufferAttribute(bufferIndices, 1)

    geometry.setAttribute('vertexIdx', this.vertexIdx)
    geometry.setIndex(this.geometryIndex)
    geometry.computeBoundingSphere()
    geometry.computeVertexNormals()

    const points = new THREE.Points(geometry, this.material)
    points.frustumCulled = false

    this.videoObject.add(points)
  }

  renderMesh(wireFrame = false) {
    const geometry = new THREE.BufferGeometry()
    const videoSize = this.videoSource.getVideoSize()

    const numPoints = videoSize.width * videoSize.height

    const buffIndices = new Uint32Array(
      (videoSize.width - 1) * (videoSize.height - 1) * 6
    )
    const buffPointIndicesAttr = new Float32Array(numPoints)

    for (let ptIdx = 0; ptIdx < numPoints; ptIdx++) {
      buffPointIndicesAttr[ptIdx] = parseFloat(ptIdx.toString())
    }

    var indicesIdx = 0
    let numRows = videoSize.height
    let numCols = videoSize.width
    for (let row = 1; row < numRows; row++) {
      for (let col = 0; col < numCols - 1; col++) {
        let tlIdx = (row - 1) * numCols + col
        let trIdx = tlIdx + 1

        let blIdx = row * numCols + col
        let brIdx = blIdx + 1

        buffIndices[indicesIdx++] = blIdx
        buffIndices[indicesIdx++] = trIdx
        buffIndices[indicesIdx++] = tlIdx

        buffIndices[indicesIdx++] = blIdx
        buffIndices[indicesIdx++] = brIdx
        buffIndices[indicesIdx++] = trIdx
      }
    }

    const vertexIdx = new THREE.Float32BufferAttribute(buffPointIndicesAttr, 1)
    const geometryIndex = new THREE.Uint32BufferAttribute(buffIndices, 1)

    geometry.setAttribute('vertexIdx', vertexIdx)
    geometry.setIndex(geometryIndex)
    geometry.computeBoundingSphere()
    geometry.computeVertexNormals()

    const mesh = new THREE.Mesh(geometry, this.material)
    mesh.frustumCulled = false

    this.material.wireframe = wireFrame

    this.videoObject.add(mesh)
  }

  /** MODIFIERS */

  toggle() {
    this.videoSource?.toggle()
  }

  toggleSound() {
    this.videoSource?.toggleAudio()
  }

  setScale(value: number) {
    for (let video of this.videoObject.children) {
      video.material.uniforms.scale.value = value
    }
  }

  setPointSize(value: number) {
    for (let video of this.videoObject.children) {
      video.material.uniforms.ptSize.value = value
    }
  }

  setOpacity(value: number) {
    for (let video of this.videoObject.children) {
      video.material.uniforms.opacity.value = value
    }
  }

  setSaturation(value: number) {
    for (let video of this.videoObject.children) {
      video.material.uniforms.saturation.value = value
    }
  }

  setSingleColor(value: string) {
    const color = hexToGL(value).map(val => parseFloat(val.toFixed(3)))

    for (let video of this.videoObject.children) {
      video.material.uniforms.singleColorVec.value = color
    }
  }

  setUseSingleColor(value: boolean) {
    for (let video of this.videoObject.children) {
      video.material.uniforms.useSingleColor.value = value
    }
  }

  setRenderNthPoint(value: number) {
    for (let video of this.videoObject.children) {
      video.material.uniforms.renderNthPoint.value = value
    }
  }

  setDepthThresholdFilter(value: number) {
    for (let video of this.videoObject.children) {
      video.material.uniforms.depthThresholdFilter.value = value
    }
  }

  setAbsoluteDepthRangeFilterX(value: number) {
    for (let video of this.videoObject.children) {
      video.material.uniforms.absoluteDepthRangeFilterX.value = value
    }
  }

  setAbsoluteDepthRangeFilterY(value: number) {
    for (let video of this.videoObject.children) {
      // video.material.uniforms.absoluteDepthRangeFilterY.value = value
    }
  }

  useNoise(value: boolean) {
    for (let video of this.videoObject.children) {
      video.material.uniforms.useNoise.value = value
    }
  }

  noiseStrength(value: number) {
    for (let video of this.videoObject.children) {
      video.material.uniforms.noiseStrength.value = value
    }
  }

  setSeed() {
    for (let video of this.videoObject.children) {
      video.material.uniforms.seed1.value = Math.random() / 10
      video.material.uniforms.seed2.value = Math.random() / 10
      video.material.uniforms.seed3.value = Math.random() / 10
    }
  }

  /** SPHERES */

  renderInstancedSpheres() {
    console.log('renderInstancedSpheres')

    this.videoSource.onVideoFrameCallback =
      this.updateInstancedSpherePositions.bind(this)

    this.dummy = new THREE.Object3D()
    const sphereGeometry = new THREE.SphereGeometry(0.01, 4, 4)
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: '#ff0000',
      transparent: true,
      opacity: 0.25
    })

    this.sphereMesh = new THREE.InstancedMesh(
      sphereGeometry,
      sphereMaterial,
      this.spheresCount
    )

    this.videoObject.add(this.sphereMesh)

    for (let ptIdx = 0; ptIdx < this.spheresCount; ptIdx++) {
      this.dummy.position.set(Math.random(), Math.random(), Math.random())
      this.dummy.updateMatrix()

      this.sphereMesh.setMatrixAt(ptIdx, this.dummy.matrix)
    }
  }

  updateInstancedSpherePositions() {
    console.log('updateInstancedSpherePositions')

    for (let ptIdx = 0; ptIdx < this.spheresCount; ptIdx++) {
      const { x, y, z } = this.videoSource.getPoint(ptIdx)

      console.log('in')
      this.dummy.position.set(Math.random(), Math.random(), Math.random())
      this.dummy.updateMatrix()

      this.sphereMesh.setMatrixAt(ptIdx, this.dummy.matrix)
    }
  }

  addSpheres() {}
}
