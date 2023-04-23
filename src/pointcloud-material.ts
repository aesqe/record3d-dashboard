import * as THREE from 'three'

import { hexToGL } from './utils'

export const getPointCloudShaderMaterial = async () => {
  const vertexShaderSrc = await fetch('./shaders/vertex.glsl')
  const vertexShader = await vertexShaderSrc.text()

  const fragmentShaderSrc = await fetch('./shaders/fragment.glsl')
  const fragmentShader = await fragmentShaderSrc.text()

  return new THREE.ShaderMaterial({
    uniforms: {
      texImg: { type: 't', value: new THREE.Texture() },
      texSize: { type: 'i2', value: [0, 0] },
      iK: { type: 'f4', value: [0, 0, 0, 0] },
      scale: { type: 'f', value: 1.0 },
      ptSize: { type: 'f', value: 0.1 },
      opacity: { type: 'f', value: 0.5 },
      saturation: { type: 'f', value: 3.0 },
      singleColorVec: { type: 'f3', value: hexToGL('#ffffff') },
      useSingleColor: { type: 'bool', value: true },
      renderNthPoint: { type: 'int', value: 1 }
    } as Record<string, THREE.IUniform>,
    side: THREE.DoubleSide,
    transparent: true,
    alphaTest: 0,
    depthTest: true,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader
  })
}
