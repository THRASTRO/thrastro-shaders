// Options to play with
var nverts = 512;

// Default epoch
var epoch = 0;

// Create empty groups if not there yet
var scene = window.scene || new THREE.Scene();
var solsys = window.solsys || new THREE.Group();

var vertices = new Float32Array(nverts);
for (var i = 0; i < vertices.length; i += 1) {
  var val = 1.0 - i / (vertices.length - 1);
  var dist = Math.abs(val - 0.5) * 2;
  // Optimize distribution close to origin
  // dist = Math.pow(dist, 0.75);
  vertices[i] = Math.sign(val - 0.5) * (dist / 2) + 0.5;
}

// Setup example buffer geometry to be used by orbital shader
var orbitalGeometry = new THREE.BufferGeometry();

// Positions are shared between instances
orbitalGeometry.setAttribute('position',
  new THREE.BufferAttribute(vertices, 1));

// Note that we still use instanced buffer attributes below
// Although we are not really using instanced rendering we
// don't want to give specific options for each vertex!

// Set colors for orbitals individually
orbitalGeometry.setAttribute('color',
  new THREE.InstancedBufferAttribute(
    new Float32Array([
      0.3, 1.0, 0.4
    ]), 3));

// You may set epoch time individually
orbitalGeometry.setAttribute('epoch',
  new THREE.InstancedBufferAttribute(
    new Float32Array([
      epoch, epoch, epoch
    ]), 1));

// You may set gravitational constant individually
orbitalGeometry.setAttribute('GM',
  new THREE.InstancedBufferAttribute(
    new Float32Array([
      0.0002959122083684144
    ]), 1));

// Define three sets of orbital elements (each with 6 parameters)
// VSOP parameters for venus, mercury and earth (barycenter)
var buffer = new THREE.InstancedInterleavedBuffer(
  new Float32Array([0, 1, 0, 0, 0, 0]), 6, 1);

// We pass the 6 parameters as two vector3 attributes
orbitalGeometry.setAttribute('l_orbitals', new THREE.InterleavedBufferAttribute(buffer, 3, 0));
orbitalGeometry.setAttribute('h_orbitals', new THREE.InterleavedBufferAttribute(buffer, 3, 3));

// const laplace = new Float32Array(8*4);
// orbitalGeometry.setAttribute('laplace', flaplace);

// Set how many instanced items it should render
orbitalGeometry.instanceCount = buffer.array.length / 6;

// Create shader material for rendering the lines
var orbitalMaterial = new THRAPP.OrbitalsShader({
  blending: THREE.AdditiveBlending,
  defines: { 'ELEMENTS_VSOP': false },
  transparent: true,
  lucency: 0.75,
  attenuate: 0.5,
  trailStart: 0.0,
  trailLength: 1.0,
  // dat.gui hooks
  datgui: window.gui,
  name: 'Draw Options'
})

var maxsize = 0; // Optimize via semi-major axes
for (var i = 0; i < buffer.array.length; i += 6)
  maxsize = Math.max(maxsize, buffer.array[i]);

// Setup bounding sphere to cull if invisible
orbitalGeometry.boundingSphere = new THREE.Sphere(
  new THREE.Vector3(0, 0, 0),
  maxsize * 1.25
);

var orbital = new THREE.Line(orbitalGeometry, orbitalMaterial);

scene.add(orbital);

var start = Date.now();

// Most simplistic demo update loop
setInterval(function () {
  // Increment the time (move stars around)
  // var elapsed = Date.now() - start;
  // elapsed /= 1000; // 1s realtime = 1d simulated
  // orbitalMaterial.uniforms.time.value = elapsed * 10;
}, 5)

// Another test is to disable the interval and set in console
// orbitalMaterial.uniforms.time.value = 365.25 * x (earth years)

var folder = gui.addFolder("Orbital Elements");
function updateBuffer() { buffer.needsUpdate = true; }
folder.add(buffer.array, 0, 0, 0.999).step(0.001).name('Eccentricity').onChange(updateBuffer);
folder.add(buffer.array, 1, 0, 1).step(0.001).name('Semimajor axis').onChange(updateBuffer);
folder.add(buffer.array, 2, 0, Math.PI * 2).step(0.001).name('Inclination').onChange(updateBuffer);
folder.add(buffer.array, 3, 0, Math.PI * 2).step(0.001).name('Longitude of the ascending node').onChange(updateBuffer);
folder.add(buffer.array, 4, 0, Math.PI * 2).step(0.001).name('Argument of periapsis').onChange(updateBuffer);
folder.add(buffer.array, 5, 0, Math.PI * 2).step(0.001).name('Mean anomaly at epoch').onChange(updateBuffer);

//folder.add(uniforms.attenuate, 'value', 0, 9).step(0.001).name('attenuate');
//folder.add(uniforms.trailStart, 'value', 0, 1).step(0.001).name('trailStart');
//folder.add(uniforms.trailLength, 'value', -1, 1).step(0.001).name('trailLength');
folder.open();
gui.width = 500;