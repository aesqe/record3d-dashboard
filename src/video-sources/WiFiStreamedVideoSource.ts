import * as THREE from 'three'

import { Record3DSignalingClient } from './SignalingClient'
import { getPixelDepth } from '../utils'
import { BaseVideoSource } from './BaseVideo'

export class WiFiStreamedVideoSource extends BaseVideoSource {
  peerAddress: string
  peerConnection: RTCPeerConnection | null
  signalingClient: Record3DSignalingClient | null

  constructor(deviceAddress: string) {
    super()

    this.peerAddress = deviceAddress
    this.peerConnection = null
    this.signalingClient = null

    let self = this

    const terminationEvent = 'onpagehide' in window ? 'pagehide' : 'unload'

    window.addEventListener(terminationEvent, () => self.disconnect(), {
      capture: true
    })

    window.addEventListener('beforeunload', () => self.disconnect(), {
      capture: true
    })
  }

  async getMetadata() {
    // Metadata contains the intrinsic matrix
    const metadataEndpoint = this.peerAddress + '/metadata'

    try {
      const response = await fetch(metadataEndpoint)
      return response.json()
    } catch (e: any) {
      console.log('Could not retrieve the intrinsic matrix.')
      console.warn('Error while fetching metadata: ' + e.message)
    }
  }

  disconnect() {
    this.peerConnection?.close()
    this.peerConnection = null
    this.signalingClient = null
  }

  connect() {
    this.peerConnection?.close()

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
      self.videoTag.srcObject = event.streams[0]
      self.getMetadata().then(metadata => self.processMetadata(metadata))
    }

    this.signalingClient.retrieveOffer().then(remoteOffer => {
      if (remoteOffer === undefined) return

      self.peerConnection
        ?.setRemoteDescription(remoteOffer)
        .then(() => self.peerConnection?.createAnswer())
        .then(sdp => self.peerConnection?.setLocalDescription(sdp))
    })
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
}
