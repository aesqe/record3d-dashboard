import * as THREE from 'three'
import { getMetadata, Record3DSignalingClient } from './SignalingClient.js'

export class WiFiStreamedVideoSource {
  peerAddress: string
  intrMat: THREE.Matrix3 | null
  videoElement: HTMLVideoElement
  isVideoLoaded: boolean
  lastVideoSize: { width: number; height: number }
  onVideoChange: () => void
  maxNumPoints: number
  originalVideoSize: { width?: number; height?: number }
  peerConnection: RTCPeerConnection | null
  signalingClient: Record3DSignalingClient | null

  constructor(deviceAddress: string) {
    this.peerAddress = deviceAddress
    this.intrMat = null
    this.videoElement = document.createElement('video')
    this.videoElement.autoplay = true
    this.videoElement.muted = true
    this.videoElement.loop = true
    this.videoElement.playsInline = true
    this.videoElement.setAttribute('playsinline', '')
    this.isVideoLoaded = false
    this.lastVideoSize = { width: 0, height: 0 }
    this.onVideoChange = () => {}
    this.maxNumPoints = 720 * 960
    this.originalVideoSize = { width: undefined, height: undefined }

    this.peerConnection = null
    this.signalingClient = null

    let self = this
    this.videoElement.onloadeddata = async e => {
      await self.updateVideoResolution()
      self.onVideoChange()
    }

    this.videoElement.onprogress = async e => {
      await self.updateVideoResolution()
    }
  }

  connect() {
    if (this.peerConnection !== null) {
      this.peerConnection.close()
    }

    this.peerConnection = new RTCPeerConnection()
    this.signalingClient = new Record3DSignalingClient(this.peerAddress)

    let self = this

    this.peerConnection.onicecandidate = event => {
      if (event.candidate === null) {
        let jsonData = {
          type: 'answer',
          data: self.peerConnection?.localDescription?.sdp
        }
        self.signalingClient?.sendAnswer(jsonData)
      }
    }

    this.peerConnection.ontrack = event => {
      self.videoElement.srcObject = event.streams[0]
      getMetadata(this.peerAddress).then(metadata =>
        self.processMetadata(metadata)
      )
    }

    this.signalingClient.retrieveOffer().then(remoteOffer => {
      if (remoteOffer === undefined) return

      self.peerConnection
        ?.setRemoteDescription(remoteOffer)
        .then(() => self.peerConnection?.createAnswer())
        .then(sdp => self.peerConnection?.setLocalDescription(sdp))
    })
  }

  async updateVideoResolution() {
    if (
      this.videoElement.videoWidth != this.lastVideoSize.width ||
      this.videoElement.videoHeight != this.lastVideoSize.height
    ) {
      const metadata = await getMetadata(this.peerAddress)
      this.processMetadata(metadata)
    }

    this.lastVideoSize.width = this.videoElement.videoWidth * 2
    this.lastVideoSize.height = this.videoElement.videoHeight * 2
  }

  getVideoSize() {
    return {
      width: this.lastVideoSize.width / 2,
      height: this.lastVideoSize.height
    }
  }

  getNumPoints() {
    return (this.lastVideoSize.width / 2) * this.lastVideoSize.height
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
    if (this.videoElement.paused) {
      this.videoElement.play()
    } else {
      this.videoElement.pause()
    }
  }

  toggleAudio() {
    this.videoElement.muted = !this.videoElement.muted
  }

  processIntrMat(
    origIntrMatElements: number[],
    origVideoSize: { width?: number; height?: number }
  ) {
    const intrMat = new THREE.Matrix3()

    intrMat.elements = origIntrMatElements
    intrMat.transpose()

    if (
      origVideoSize.width === undefined ||
      origVideoSize.height === undefined
    ) {
      intrMat.multiplyScalar(
        this.videoElement.videoHeight /
          (origIntrMatElements[5] < 256 ? 256 : 640)
      )
    } else {
      intrMat.multiplyScalar(
        this.videoElement.videoHeight / origVideoSize.height
      )
    }

    intrMat.elements[8] = 1

    return intrMat
  }

  processMetadata(metadata: Record<string, any>) {
    const ogVideoSizeKey = 'originalSize'

    if (ogVideoSizeKey in metadata) {
      let originalVideoSize = metadata[ogVideoSizeKey]
      this.originalVideoSize.width = originalVideoSize[0]
      this.originalVideoSize.height = originalVideoSize[1]
    }

    this.intrMat = this.processIntrMat(metadata['K'], this.originalVideoSize)

    this.onVideoChange()
  }
}
