var sphereGeometry = new THREE.IcosahedronGeometry(earthRadi, 9);
var sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
solsys.add(sphere);
