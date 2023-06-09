const gridHelperX = new THREE.GridHelper( 5, 20, 0x660000, 0x006666 );
const gridHelperY = new THREE.GridHelper( 5, 20, 0x660000, 0x666600 );
const gridHelperZ = new THREE.GridHelper( 5, 20, 0x660000, 0x660066 );
gridHelperX.rotation.set(0, 0, 0);
gridHelperY.rotation.set(Math.PI / 2, 0, 0);
gridHelperZ.rotation.set(0, 0, Math.PI / 2);
scene.add(gridHelperX);
scene.add(gridHelperY);
scene.add(gridHelperZ);
