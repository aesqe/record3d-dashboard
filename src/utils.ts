import * as THREE from 'three'

export const hexToGL = hexStr => new THREE.Color(hexStr).toArray()
