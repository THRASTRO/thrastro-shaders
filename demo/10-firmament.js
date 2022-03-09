// Create background group
var bg = new THREE.Group();

// Scale Parsecs to astronomical units (AU)
bg.scale.multiplyScalar(206264.80748432202);

// Create a file loader (shared singleton)
var starLoader = new THREE.FileLoader();

// Create promise that loads star positional DB
var posPromise = new Promise(function (resolve, reject) {
    starLoader.setResponseType( "arraybuffer" );
    starLoader.load("firmament/stars.pos.db", resolve);
});

// Create promise that loads star color DB
var colPromise = new Promise(function (resolve, reject) {
    starLoader.setResponseType( "arraybuffer" );
    starLoader.load("firmament/stars.col.db", resolve);
});

// Create the firmament shader material
var firmamentMaterial = new THRAPP.FirmamentShader({
    // shader settings from `CustomRawShader`
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    depthTest: true,
    depthWrite: false,
    // enables opacity
    transparent: true,
    // specific uniforms
    minMag: -12,
    maxMag: 28,
    scale: 1,
    opacity: 1.0,
    magScale: 0.3, // 0.2, // .25
    magFact: 35.0, // 25.0, // 75.0
    sizeScale: 1.0
})

// Create the firmament geometry (to be filled later)
var firmamentGeometry = new THREE.BufferGeometry();

// Create a point mesh by using material on geometry
var firmamentMesh = new THREE.Points(firmamentGeometry, firmamentMaterial);

// Optimize the rendering order
firmamentMesh.renderOrder = 1;
bg.renderOrder = -999;

// Start to load data in parallel and then process it
Promise.all([posPromise, colPromise]).then(function(buffers) {

    // Create raw arrays directly from loaded data
    // Ideally this will have zero memory overhead
    var posDB = new Float32Array(buffers[0]);
    var colDB = new Float32Array(buffers[1]);

    // Configure how attributes are structured
    // position[0]: ra position (radians?)
    // position[1]: dec position (radians?)
    // position[2]: distance from earth (parsec?)
    // position[3]: absolute magnitude
    var posAttr = new THREE.BufferAttribute(posDB, 4);
    // attributes[0]: proper motion in ra (milliarcseconds per year?)
    // attributes[1]: proper motion in dec (milliarcseconds per year?)
    // attributes[2]: luminosity (not really used yet anywhere)
    // attributes[3]: ci/bV color index
    var colAttr = new THREE.BufferAttribute(colDB, 4);

    // Attach point attributes for point cloud
    firmamentGeometry.setAttribute('position', posAttr);
    firmamentGeometry.setAttribute('attributes', colAttr);

    // Attach optional debugging tools
    if (window.firmFolder != null) {
        firmFolder.add(firmamentMaterial.uniforms.fov, 'value', 0, 60).step(0.001).name('fov');
        firmFolder.add(firmamentMaterial.uniforms.scale, 'value', -24, 64).step(0.001).name('scale');
        firmFolder.add(firmamentMaterial.uniforms.minMag, 'value', -24, 64).step(0.001).name('minMag');
        firmFolder.add(firmamentMaterial.uniforms.maxMag, 'value', -24, 64).step(0.001).name('maxMag');
        firmFolder.add(firmamentMaterial.uniforms.opacity, 'value', 0, 1).step(0.001).name('opacity');
        firmFolder.add(firmamentMaterial.uniforms.magFact, 'value', 0, 80).step(0.001).name('magFact');
        firmFolder.add(firmamentMaterial.uniforms.magScale, 'value', 0, 5).step(0.001).name('magScale');
        firmFolder.add(firmamentMaterial.uniforms.sizeScale, 'value', 0, 40).step(0.001).name('sizeScale');
    }

    // Most simplistic demo update loop
    setInterval(function() {
        // Increment the time (move stars around)
        firmamentMaterial.uniforms.time.value += 10;
        // Update fov to adjusts rendered star brightness
        firmamentMaterial.uniforms.fov.value = 90 / camera.fov;
    }, 5)

    // Add mesh to scene
    bg.add(firmamentMesh);

}).catch(function (reason) {

    console.error("Loading Firmament failed", reason);

})

// Add background to scene
scene.add(bg);