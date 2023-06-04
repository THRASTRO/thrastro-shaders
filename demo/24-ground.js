var eclipserGeometry = new THREE.IcosahedronGeometry(moonRadi, 6);
var eclipserMaterial = new THRAPP.CustomMeshBasicMaterial({
  color: 0xff0000,
});

var eclipser = new THREE.Mesh(eclipserGeometry, eclipserMaterial);
eclipser.position.set(0, 0, moonDist * 0.95);

// Needed to calculate umbra/penumbra
sun.radius = sunRadi;
eclipser.radius = moonRadi;

var sphereGeometry = new THREE.IcosahedronGeometry(earthRadi, 16);

var sphereMaterial = new THRAPP.GroundShader({
  // Basic Material config
  color: 0xffffff,
  // Eclipse shader config
  laserSize: 1e-6,
  // radius: earthRadi,
  camera: camera,
  stars: [sun],
  eclipsers: [eclipser],
  // Planet shader config
  //defines: { DEBUG_DAYLIGHT_TERMINATOR: 0 },
  map: loader.load("earth/day.jpg"),
  nightMap: loader.load("earth/night.jpg"),
  // Ground shader config
  atmosphere: {
    bias: 0.5,
    scaleDepth: 0.25,
    scaleHeight: 0.1,
    wavelength: earthSpectra,
    innerRadius: earthRadi,
    height: earthRadi * 0.015,
  },
});

// Create THRAPP Mesh (connects the mesh to the material)
var sphere = new THRAPP.Mesh(sphereGeometry, sphereMaterial);

// Alternative configuration
// sphereMaterial.addStar(sun);
// sphereMaterial.addEclipser(eclipser);

// Hook into renderer to update uniforms
rendererHook.push(function () {
  sphereMaterial.updateUniforms();
});

// Idempotent calls
planet.add(eclipser);
planet.add(sphere)
solsys.add(planet);

// Animate eclipser
if (document.location.search.match(/animate/)) {
  var value = eclipser.position.z;
  var offset = 0;
  var direction = 1;
  function updatePosition() {
    offset += direction;
    if (offset > 1000) direction *= -1;
    if (offset < -1000) direction *= -1;
    eclipser.position.z = value + offset / 1000000;
  }
  setInterval(updatePosition, 5);
}
