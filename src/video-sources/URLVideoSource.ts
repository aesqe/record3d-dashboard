import * as THREE from 'three'

import { BaseVideoSource } from './BaseVideo'

// TODO: manage reusing the same video tag

export class UrlVideoSource extends BaseVideoSource {
  constructor() {
    super()

    this.intrMat = new THREE.Matrix3()
    this.videoTag.id = `r3d-video-local-${Math.random() * 1000}`

    let self = this

    this.videoTag.onloadeddata = e => {
      self.isVideoLoaded = true
      self.lastVideoSize.width = self.videoTag.videoWidth
      self.lastVideoSize.height = self.videoTag.videoHeight
      self.maxNumPoints =
        (self.videoTag.videoWidth * self.videoTag.videoHeight) / 4

      // FIXME file is "loaded" twice, if I want to get metadata. Otherwise I can create video from byte data
      fetch(self.videoTag.src).then(response => {
        response.text().then(txt => {
          let meta = txt.substr(txt.lastIndexOf('{"intrinsic'))
          meta = meta.substr(0, meta.length - 1)
          let metadata = JSON.parse(meta)

          self.intrMat!.elements = metadata['intrinsicMatrix']
          self.intrMat!.transpose()

          self.onVideoChange()
        })
      })
    }
  }

  load(url: string) {
    let self = this
    self.videoTag.src = url
  }

  updateIntrinsicMatrix(intrMat: THREE.Matrix3) {
    this.intrMat = intrMat
  }
}
