import * as THREE from 'three'
import { getPointCloudShaderMaterial } from './pointcloud-material.js'
import { WiFiStreamedVideoSource } from './video-sources/WiFiStreamedVideoSource.js'
import { hexToGL } from './utils.js'

interface VideoObject extends THREE.Group {
  children: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>[]
}

export class Record3DVideo {
  material: THREE.ShaderMaterial | null
  videoSource: WiFiStreamedVideoSource | null
  videoObject: VideoObject
  id: number

  constructor(videoSource: WiFiStreamedVideoSource, id: number) {
    this.id = id
    this.videoSource = null
    this.material = null
    this.videoObject = new THREE.Group() as VideoObject

    this.setVideoSource(videoSource)
  }

  async setVideoSource(videoSource: WiFiStreamedVideoSource) {
    this.material = await getPointCloudShaderMaterial()

    if (videoSource !== this.videoSource) {
      this.videoSource = videoSource

      const existingChangeHandler = videoSource.onVideoChange
      const changeHandler = this.onVideoTagChanged.bind(this)

      videoSource.onVideoChange = () => {
        existingChangeHandler?.()
        changeHandler()
      }
    }
  }

  onVideoTagChanged() {
    while (this.videoObject.children.length > 0) {
      this.videoObject.remove(this.videoObject.children[0])
    }

    const geometry = new THREE.BufferGeometry()
    const material = this.material as THREE.ShaderMaterial
    const videoSource = this.videoSource as WiFiStreamedVideoSource

    const numPoints = videoSource.getNumPoints()
    const bufferIndices = new Array(numPoints).fill(0).map((_, i) => i)
    const vertexIdx = new THREE.Float32BufferAttribute(bufferIndices, 3)
    const geometryIndex = new THREE.Uint32BufferAttribute(bufferIndices, 3)

    const { videoElement } = videoSource
    const newVideoWidth = videoElement.videoWidth * 2
    const newVideoHeight = videoElement.videoHeight * 2
    const videoTexture = new THREE.VideoTexture(videoElement)

    videoElement.play()

    videoTexture.minFilter = THREE.LinearFilter
    videoTexture.magFilter = THREE.LinearFilter
    videoTexture.format = THREE.RGBAFormat
    videoTexture.mapping = THREE.CubeReflectionMapping

    material.uniforms.iK.value = videoSource.getIKValue()
    material.uniforms.texImg.value = videoTexture
    material.uniforms.texSize.value = [newVideoWidth, newVideoHeight]

    const videoSize = videoSource.getVideoSize()
    var indicesIdx = 0
    let numRows = videoSize.height
    let numCols = videoSize.width
    for (let row = 1; row < numRows; row++) {
      for (let col = 0; col < numCols - 1; col++) {
        let tlIdx = (row - 1) * numCols + col
        let trIdx = tlIdx + 1

        let blIdx = row * numCols + col
        let brIdx = blIdx + 1

        bufferIndices[indicesIdx++] = blIdx
        bufferIndices[indicesIdx++] = trIdx
        bufferIndices[indicesIdx++] = tlIdx

        bufferIndices[indicesIdx++] = blIdx
        bufferIndices[indicesIdx++] = brIdx
        bufferIndices[indicesIdx++] = trIdx
      }
    }

    geometry.setAttribute('vertexIdx', vertexIdx)
    geometry.setIndex(geometryIndex)
    geometry.computeBoundingSphere()
    geometry.computeVertexNormals()

    const points = new THREE.Points(geometry, material)
    const MESH = new THREE.Mesh(geometry, material)

    points.frustumCulled = false

    this.videoObject.add(points)
    this.videoObject.add(MESH)
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
      video.material.uniforms.seed1.value = Math.random()
      video.material.uniforms.seed2.value = Math.random()
      video.material.uniforms.seed3.value = Math.random()
    }
  }
}
