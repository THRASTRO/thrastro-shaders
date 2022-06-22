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

var sphereMaterial = new THRAPP.PlanetShader({
  // Basic Material config
  color: 0xffffff,
  // Eclipse shader config
  laserSize: 1e-6,
  radius: earthRadi,
  stars: [sun],
  eclipsers: [eclipser],
  // Planet shader config
  defines: { DEBUG_DAYLIGHT_TERMINATOR: 0 },
  map: loader.load('earth/day.jpg'),
  nightMap: loader.load('earth/night.jpg'),
  // Enable ring shading (only one supported)
  ringMap: loader.load('saturn/ring-shadow.png'),
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
  function updateEclipserPosition() {
    offset += direction;
    if (offset > 1000) direction *= -1;
    if (offset < -1000) direction *= -1;
    eclipser.position.z = value + offset / 1000000;
  }
  setInterval(updateEclipserPosition, 5);
}

var ii = earthRadi + 1000 * KM2AU;
var oo = earthRadi + 4000 * KM2AU;

var ringGeometry = new THREE.RingBufferGeometry( ii, oo, 256 );

var ringMaterial = new THRAPP.RingShader({
    color: 0x666666, // modulates the final color
    emissive: 0x666666, // modulates the final color
    map: loader.load('saturn/ring-surface.png'),
    emissiveIntensity: 0.05, // show backside a little bit
    emissiveMap: loader.load('saturn/ring-surface.png'),
    eclipsers: [eclipser],
    side: THREE.DoubleSide,
    transparent: true,
    // To calculate shadows
    planetRadius: earthRadi,
});

var uvs = ringGeometry.attributes.uv.array;
// loop and initialization taken from RingBufferGeometry
// https://stackoverflow.com/a/43024222/1550314
var phiSegments = ringGeometry.parameters.phiSegments || 0;
var thetaSegments = ringGeometry.parameters.thetaSegments || 0;
phiSegments = phiSegments !== undefined ? Math.max( 1, phiSegments ) : 1;
thetaSegments = thetaSegments !== undefined ? Math.max( 3, thetaSegments ) : 8;
for ( var c = 0, j = 0; j <= phiSegments; j ++ ) {
    for ( var i = 0; i <= thetaSegments; i ++ ) {
        uvs[c++] = i / thetaSegments,
        uvs[c++] = j / phiSegments;
    }
}

var ring = new THRAPP.Mesh(ringGeometry, ringMaterial);

// Orient ring around parent
ring.rotation.y = 0.1;
ring.rotation.x = 0.8;

// Add attributes to mesh
ring.innerRadius = ii;
ring.outerRadius = oo;

sphereMaterial.addRing(ring);

sphere.add(ring);

// Animate eclipser
if (document.location.search.match(/animate/)) {
  function updateRingRotation() {
    ring.rotation.y += Math.PI / 3600;
    ring.rotation.x += Math.PI / 2350;
  }
  setInterval(updateRingRotation, 5);
}
