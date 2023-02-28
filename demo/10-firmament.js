// Create a file loader (shared singleton)
var starLoader = new THREE.FileLoader();

// Create promise that loads star positional DB
var posPromise = new Promise(function (resolve, reject) {
    starLoader.setResponseType("arraybuffer");
    starLoader.load("firmament/stars.pos.db", resolve);
});

// Create promise that loads star color DB
var colPromise = new Promise(function (resolve, reject) {
    starLoader.setResponseType("arraybuffer");
    starLoader.load("firmament/stars.col.db", resolve);
});

// Create the firmament shader material
var firmamentMaterial = new THRAPP.FirmamentShader({
    defines: { "HAS_SPIKES": true },
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
    magScale: 0.25,
    magFact: 25.0,
    fillPower: 1.5,
    sizeScale: 0.6,
    // dat.gui hooks
    datgui: window.gui,
    name: 'Firmament'
})

// Create the firmament geometry (to be filled later)
var firmamentGeometry = new THREE.BufferGeometry();

// Create a point mesh by using material on geometry
var firmamentMesh = new THREE.Points(firmamentGeometry, firmamentMaterial);

// Optimize the rendering order
firmamentMesh.renderOrder = 1;
bg.renderOrder = -999;

// Start to load data in parallel and then process it
Promise.all([posPromise, colPromise]).then(function (buffers) {

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
    // Most simplistic demo update loop
    rendererHook.push(function () {
        // Increment the time (move stars around)
        firmamentMaterial.uniforms.time.value += 5;
        // Update fov to adjusts rendered star brightness
        firmamentMaterial.uniforms.fov.value = 90 / camera.fov;
    })

    // Add mesh to scene
    bg.add(firmamentMesh);

}).catch(function (reason) {

    console.error("Loading Firmament failed", reason);

})
