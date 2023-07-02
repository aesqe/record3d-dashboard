import * as THREE from 'three'

import { getPixelDepth } from '../utils'

let then = 0

export class BaseVideoSource {
  intrMat: THREE.Matrix3 | null
  videoTag: HTMLVideoElement
  isVideoLoaded: boolean
  lastVideoSize: { width: number; height: number }
  onVideoChange: () => void
  onVideoFrameCallback: () => void
  maxNumPoints: number
  originalVideoSize: { width?: number; height?: number }
  imageData: ImageData
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  constructor() {
    this.intrMat = null
    this.videoTag = document.createElement('video')
    this.videoTag.autoplay = true
    this.videoTag.muted = true
    this.videoTag.loop = true
    this.videoTag.playsInline = true
    this.videoTag.setAttribute('playsinline', '')
    this.videoTag.id = 'r3d-video'
    this.isVideoLoaded = false
    this.lastVideoSize = { width: 0, height: 0 }
    this.onVideoChange = () => {}
    this.onVideoFrameCallback = () => {}
    this.maxNumPoints = 960 * 640
    this.originalVideoSize = { width: undefined, height: undefined }
    this.imageData = {} as ImageData
    this.canvas = document.createElement('canvas')
    this.canvas.id = 'r3d-canvas'
    this.ctx = this.canvas.getContext('2d', {
      willReadFrequently: true
    }) as CanvasRenderingContext2D

    let self = this

    this.videoTag.onloadeddata = e => {
      self.updateVideoResolution()
    }

    this.videoTag.onprogress = e => {
      self.updateVideoResolution()
    }

    this.updateFrameImageData = this.updateFrameImageData.bind(this)
    this.onVideoFrame = this.onVideoFrame.bind(this)

    const existingVideo = document.getElementById(this.videoTag.id)
    const existingCanvas = document.getElementById(this.canvas.id)

    existingVideo?.parentElement?.removeChild(existingVideo)
    existingCanvas?.parentElement?.removeChild(existingCanvas)

    document.body.appendChild(this.videoTag)
    document.body.appendChild(this.canvas)
  }

  async onVideoFrame(now = then, metadata?: VideoFrameCallbackMetadata) {
    now = now * 0.001
    const deltaTime = now - then

    if (
      metadata?.height !== this.lastVideoSize.height ||
      metadata?.width !== this.lastVideoSize.width
    ) {
      await this.updateVideoResolution()
    }

    this.updateFrameImageData()

    if (deltaTime > 1) {
      this.onVideoFrameCallback()
      then = now
    }

    this.videoTag.requestVideoFrameCallback(this.onVideoFrame)
  }

  updateFrameImageData(now?: number, metadata?: any) {
    this.canvas.width = this.videoTag.videoWidth / 2
    this.canvas.height = this.videoTag.videoHeight

    if (this.canvas.width && this.canvas.height) {
      this.ctx.drawImage(this.videoTag, 0, 0)

      try {
        const data = this.ctx.getImageData(
          0,
          0,
          this.canvas.width / 2,
          this.canvas.height
        )
        this.imageData = data
      } catch (error) {}
    }
  }

  async getMetadata() {
    return {}
  }

  updateVideoResolution() {
    if (
      this.videoTag.videoWidth != this.lastVideoSize.width ||
      this.videoTag.videoHeight != this.lastVideoSize.height
    ) {
      this.getMetadata().then(metadata => this.processMetadata(metadata))
    }

    this.lastVideoSize.width = this.videoTag.videoWidth
    this.lastVideoSize.height = this.videoTag.videoHeight
  }

  getVideoSize() {
    return {
      width: this.lastVideoSize.width / 2,
      height: this.lastVideoSize.height
    }
  }

  getNumPoints() {
    return this.lastVideoSize.width * this.lastVideoSize.height
  }

  getPoint(idx: number) {
    const { width, height } = this.getVideoSize()
    const iK = this.getIKValue()
    const x = idx % width
    const y = Math.floor(idx / height)

    const px = iK[0] * x + iK[2]
    const py = iK[1] * y + iK[3]
    const pz = getPixelDepth(
      new THREE.Vector2(px, py),
      this.imageData,
      new THREE.Vector2(width, height)
    )

    return new THREE.Vector3(px, py, pz)
  }

  _getPoint(idx: number) {
    const x = idx % this.lastVideoSize.width
    const y = Math.floor(idx / this.lastVideoSize.width)

    return new THREE.Vector2(x, y)
  }

  getIKValue() {
    const matrix = this.intrMat!.elements

    const ifx = 1.0 / matrix[0]
    const ify = 1.0 / matrix[4]
    const itx = -matrix[2] / matrix[0]
    const ity = -matrix[5] / matrix[4]

    return [ifx, ify, itx, ity]
  }

  toggle() {
    if (this.videoTag.paused) {
      this.videoTag.play()
    } else {
      this.videoTag.pause()
    }
  }

  toggleAudio() {
    this.videoTag.muted = !this.videoTag.muted
  }

  processIntrMat(
    origIntrMatElements: number[],
    origVideoSize: { width?: number; height?: number }
  ) {
    let intrMat = new THREE.Matrix3()
    intrMat.elements = origIntrMatElements
    intrMat.transpose()

    if (origVideoSize.width === undefined || origVideoSize.height === undefined)
      intrMat.multiplyScalar(
        this.videoTag.videoHeight / (origIntrMatElements[5] < 256 ? 256 : 640)
      )
    else
      intrMat.multiplyScalar(this.videoTag.videoHeight / origVideoSize.height)

    intrMat.elements[8] = 1

    return intrMat
  }

  processMetadata(metadata: any) {
    let ogVideoSizeKey = 'originalSize'
    if (ogVideoSizeKey in metadata) {
      let originalVideoSize = metadata[ogVideoSizeKey]
      this.originalVideoSize.width = originalVideoSize[0]
      this.originalVideoSize.height = originalVideoSize[1]
    }

    this.intrMat = this.processIntrMat(metadata['K'], this.originalVideoSize)

    this.onVideoChange()
  }
}
