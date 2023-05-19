// const extrudeSettings1 = {
// 					steps: 100,
// 					bevelEnabled: false,
// 					extrudePath: closedSpline
// 				};

// 				const pts1 = [], count = 3;

// 				for ( let i = 0; i < count; i ++ ) {

// 					const l = 20;

// 					const a = 2 * i / count * Math.PI;

// 					pts1.push( new THREE.Vector2( Math.cos( a ) * l, Math.sin( a ) * l ) );

// 				}

// 				const shape1 = new THREE.Shape( pts1 );

// 				const geometry1 = new THREE.ExtrudeGeometry( shape1, extrudeSettings1 );

// 				const material1 = new THREE.MeshLambertMaterial( { color: 0xb00000, wireframe: false } );

// 				const mesh1 = new THREE.Mesh( geometry1, material1 );

// 				scene.add( mesh1 );
