import 'rvfc-polyfill'
import * as THREE from 'three'
import { Record3DScene } from './Record3DScene'

export const hexToGL = (hexStr: string) => new THREE.Color(hexStr).toArray()

const mix = <T extends THREE.Vector2 | THREE.Vector3 | THREE.Vector4>(
  x: T,
  y: T,
  a: number
) => {
  const result = x.clone()
  const len = x.length()

  for (let i = 0; i < len; i++) {
    result.setComponent(i, (1 - a) * x.getComponent(i) + a * y.getComponent(i))
  }

  return result as T
}

const step = (edge: number, x: number): number => {
  return x < edge ? 0.0 : 1.0
}

const rgb2hue = (c: THREE.Color): number => {
  const e = 1.0e-10

  const K = new THREE.Vector4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0)

  const p = mix(
    new THREE.Vector4(c.b, c.g, K.w, K.z),
    new THREE.Vector4(c.g, c.b, K.x, K.y),
    step(c.b, c.g)
  )

  const q = mix(
    new THREE.Vector4(p.x, p.y, p.w, c.r),
    new THREE.Vector4(c.r, p.y, p.z, p.x),
    step(p.x, c.r)
  )

  const d = q.x - Math.min(q.w, q.y)

  return Math.abs(q.z + (q.w - q.y) / (6.0 * d + e))
}

const texture2D = (imageData: ImageData, uv: THREE.Vector2): THREE.Color => {
  const pixels = imageData.data // SRGB format
  const u = Math.max(Math.min(uv.x, 1), 0)
  const v = Math.max(Math.min(uv.y, 1), 0)
  const x = Math.floor(u * imageData.width)
  const y = Math.floor(v * imageData.height)
  const index = (y * imageData.width + x) * 4
  const r = pixels[index + 1] / 255
  const g = pixels[index + 2] / 255
  const b = pixels[index + 3] / 255

  return new THREE.Color(r, g, b)
}

export const getPixelDepth = (
  pixel: THREE.Vector2,
  imageData: ImageData,
  texSize: THREE.Vector2
): number => {
  const lookupPt = new THREE.Vector2()
    .addVectors(pixel, new THREE.Vector2(0.5))
    .divide(texSize)

  const hue = rgb2hue(texture2D(imageData, lookupPt))
  const pixelDepth = 3.0 * hue

  return pixelDepth
}

export const getPixelObjectCoords = (
  i: number,
  iK: number[],
  texSize: THREE.Vector2,
  imageData: ImageData
) => {
  const frameSize = new THREE.Vector2(texSize.x / 2, texSize.y)

  const ptY = i / frameSize.x
  const ptX = i - ptY * frameSize.x
  const pt = new THREE.Vector2(ptX, ptY)

  const currDepth = getPixelDepth(pt, imageData, texSize) * 2.0

  const iKVec = new THREE.Vector4(...iK)

  return new THREE.Vector3(
    (iKVec.x * ptX + iKVec.z) * currDepth,
    (iKVec.y * ptY + iKVec.w) * currDepth,
    -currDepth
  )
}

export const addClass = (selector: string, className: string) =>
  document.querySelectorAll(selector).forEach(element => {
    element.classList.add(className)
  })

export const removeClass = (selector: string, className: string) =>
  document.querySelectorAll(selector).forEach(element => {
    element.classList.remove(className)
  })

export const toggleClass = (selector: string, className: string) =>
  document.querySelectorAll(selector).forEach(element => {
    element.classList.toggle(className)
  })

export const showElements = (selector: string) =>
  document.querySelectorAll(selector).forEach(element => {
    element.classList.remove('hidden')
  })

export const hideElements = (selector: string) =>
  document.querySelectorAll(selector).forEach(element => {
    element.classList.add('hidden')
  })

export const toggleElements = (selector: string) =>
  document.querySelectorAll(selector).forEach(element => {
    element.classList.toggle('hidden')
  })

export const getPeerAddresses = () => {
  const params = new URLSearchParams(window.location.hash.replace('#', ''))

  return (params.get('ips') || '192.168.0.18')
    .split(',')
    .filter(Boolean)
    .map(add => `http://${add}`)
}

export const getCameraPosition = (scene: Record3DScene) => {
  const { position, rotation } = scene.camera
  const { target } = scene.controls

  return {
    camera: {
      position: {
        x: position.x,
        y: position.y,
        z: position.z
      },
      rotation: {
        x: rotation.x,
        y: rotation.y,
        z: rotation.z
      }
    },
    controls: {
      target: {
        x: target.x,
        y: target.y,
        z: target.z
      }
    }
  }
}

export const loadCameraPosition = (scene: Record3DScene, data: any) => {
  scene.camera.position.x = data.camera.position.x
  scene.camera.position.y = data.camera.position.y
  scene.camera.position.z = data.camera.position.z

  scene.camera.rotation.x = data.camera.rotation.x
  scene.camera.rotation.y = data.camera.rotation.y
  scene.camera.rotation.z = data.camera.rotation.z

  scene.controls.target.x = data.controls.target.x
  scene.controls.target.y = data.controls.target.y
  scene.controls.target.z = data.controls.target.z
}
