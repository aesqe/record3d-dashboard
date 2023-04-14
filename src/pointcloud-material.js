import * as THREE from 'three'

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
      ptSize: { type: 'f', value: 1.0 },
      opacity: { type: 'f', value: 0.1 }
    },
    side: THREE.DoubleSide,
    transparent: true,
    alphaTest: true,
    depthTest: true,

    vertexShader: vertexShader,
    fragmentShader: fragmentShader
  })
}
