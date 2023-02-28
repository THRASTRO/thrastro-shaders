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
var orbitalGeometry = new THREE.InstancedBufferGeometry();

// Positions are shared between instances
orbitalGeometry.setAttribute('position',
  new THREE.BufferAttribute(vertices, 1));

// Set colors for orbitals individually
orbitalGeometry.setAttribute('color',
  new THREE.InstancedBufferAttribute(
    new Float32Array([
      1.0, 0.0, 0.0,
      1.0, 0.5, 0.0,
      0.6, 1.0, 0.0,
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
      0.0002959122083684144,
      0.0002959122083684144,
      0.0002959122083684144
    ]), 1));

// Define three sets of orbital elements (each with 6 parameters)
// VSOP parameters for venus, mercury and earth (barycenter)
var buffer = new THREE.InstancedInterleavedBuffer(new Float32Array([
  0.3870980720901649, 4.402605060281346, 0.044661793524029006,
  0.20072086265009126, 0.04061605842625217, 0.04563560777555362,
  0.7233272717115403, 3.1761334007668762, -0.004508135009216811,
  0.0050304300484041945, 0.006824143191072021, 0.028822235106817546,
  0.9999969937991878, 1.7534128396373094, -0.0037358376424841437,
  0.016282393170983327, -3.092980677634447e-7, 6.756337202107333e-7,
]), 6, 1);

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
  defines: { 'ELEMENTS_VSOP': 1 },
  transparent: true,
  lucency: 0.5,
  trailStart: 0.00,
  trailLength: -0.75, // -0.75,
  attenuate: 0.00025,
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
  var elapsed = Date.now() - start;
  elapsed /= 1000; // 1s realtime = 1d simulated
  orbitalMaterial.uniforms.time.value = elapsed * 10;
}, 5)

// Another test is to disable the interval and set in console
// orbitalMaterial.uniforms.time.value = 365.25 * x (earth years)
