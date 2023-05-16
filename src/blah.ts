// const positionsAttr = points.geometry.getAttribute(
//   'vertexIdx'
// ) as THREE.BufferAttribute

// const positions = positionsAttr?.array as Float32Array

// const videoFrame = videoSource.videoElement
// let canvas = document.createElement('canvas')
// canvas.style.position = 'absolute'
// canvas.height = videoFrame.videoHeight || parseInt(videoFrame.style.height)
// canvas.width = videoFrame.videoWidth / 2 || parseInt(videoFrame.style.width)
// const ctx = canvas.getContext('2d')!
// ctx.drawImage(videoFrame, 0, 0, canvas.width * 2, canvas.height)

// // if (canvas.width && canvas.height) {
// //   // document.body.appendChild(canvas)

// //   const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
// //   const videoVec = new THREE.Vector2(canvas?.width, canvas?.height)
// //   const spheres = []

// //   for (let i = 10000; i < 10090; i += 3) {
// //     const sphereGeometry = new THREE.SphereGeometry(0.01, 32, 32)
// //     const sphereMaterial = new THREE.MeshBasicMaterial({
// //       color: new THREE.Color(Math.random(), Math.random(), Math.random()),
// //       opacity: 0.5
// //     })
// //     const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)

// //     const coords = getPixelObjectCoords(
// //       i,
// //       material.uniforms.iK.value,
// //       videoVec,
// //       imageData
// //     )

// //     console.log(coords)

// //     sphere.geometry.translate(coords.x, coords.y, coords.z)

// //     spheres.push(sphere)
// //   }

// //   this.scene.mainScene.add(...spheres)
// // }
