// Create empty groups if not there yet
var scene = window.scene || new THREE.Scene();
var solsys = window.solsys || new THREE.Group();

var sunGeometry = new THREE.IcosahedronGeometry(sunRadi, 6);
var sunMaterial = new THRAPP.CustomMeshBasicMaterial({
  //side: THREE.DoubleSide,
  color: 0xffff33,
});
var sun = new THREE.Mesh(sunGeometry, sunMaterial);

// Create the actual light source to illuminate planets
var light = new THREE.PointLight(0xFDFBD3, 2, 0, 2);

// Idempotent calls
sun.add(light);
solsys.add(sun);
scene.add(solsys);
