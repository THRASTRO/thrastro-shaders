var eclipserGeometry = new THREE.IcosahedronGeometry(moonRadi, 6);
var eclipserMaterial = new THRAPP.CustomMeshBasicMaterial({
  color: 0xff0000,
});

var eclipser = new THREE.Mesh(eclipserGeometry, eclipserMaterial);
eclipser.position.set(0, 0, moonDist * 0.95);

// Needed to calculate umbra/penumbra
sun.radius = sunRadi;
eclipser.radius = moonRadi;

var sphereGeometry = new THREE.IcosahedronGeometry(earthRadi, 8);
var sphereMaterial = new THRAPP.EclipseShader({
  // Basic Material config
  color: 0xffffff,
  // Eclipse shader config
  laserSize: 1e-6,
  radius: earthRadi,
  stars: [sun],
  eclipsers: [eclipser],
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
sphere.add(eclipser);
solsys.add(sphere);

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
