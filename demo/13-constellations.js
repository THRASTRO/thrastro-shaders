// Create a file loader (shared singleton)
var starLoader = new THREE.FileLoader();

// Create the constellations shader material
var constellationsMaterial = new THRAPP.ConstellationsShader({
    // shader settings from `CustomRawShader`
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    depthTest: true,
    depthWrite: false,
    // enables opacity
    transparent: true,
    color: 0x3669CC,
    // specific uniforms
    opacity: 0.35,
    scale: 1.0,
    // dat.gui hooks
    datgui: window.gui,
    name: 'Constellations'
})

// Create a buffer geometry (vertices from buffers)
var constellationsGeometry = new THREE.BufferGeometry();

// Stars are visible from very very far away ;)
constellationsGeometry.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(0, 0, 0), 10e16
);

// Create a point mesh by using material on geometry
var constellationsMesh = new THREE.LineSegments(constellationsGeometry, constellationsMaterial);

// Optimize the rendering order
constellationsMesh.renderOrder = 1;
bg.renderOrder = -999;

// Create promise that loads star positional DB
var cstelPosPromise = new Promise(function (resolve, reject) {
    starLoader.setResponseType( "arraybuffer" );
    starLoader.load("firmament/cstel.western.pos.db", resolve);
});

// Create promise that loads star color DB
var cstelColPromise = new Promise(function (resolve, reject) {
    starLoader.setResponseType( "arraybuffer" );
    starLoader.load("firmament/cstel.western.col.db", resolve);
});

// Create promise that loads star color DB
var cstelIdsPromise = new Promise(function (resolve, reject) {
    starLoader.setResponseType( "application/json" );
    starLoader.load("firmament/cstel.western.json", resolve);
});

// Start to load data in parallel and then process it
Promise.all([cstelPosPromise, cstelColPromise, cstelIdsPromise]).then(function(buffers) {

    // Create raw arrays directly from loaded data
    // Ideally this will have zero memory overhead
    var posDB = new Float32Array(buffers[0]);
    var colDB = new Float32Array(buffers[1]);
    var constellations = JSON.parse(buffers[2]);

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
    constellationsGeometry.setAttribute('position', posAttr);
    constellationsGeometry.setAttribute('attributes', colAttr);

    // Gether the required length for fixed array
    var len = 0; for (var name in constellations)
        len += constellations[name].length;

    var i = 0, indices = new Uint16Array(len);
    for (var name in constellations) {
         var data = constellations[name];
         for (var n = 0; n < data.length;)
             indices[i++] = data[n++];
    }

    // Reference the position via indices
    var indicesAttr = new THREE.BufferAttribute(indices, 1);
    constellationsGeometry.setIndex(indicesAttr);

    // Most simplistic demo update loop
    rendererHook.push(function() {
        // Increment the time (move stars around)
        constellationsMaterial.uniforms.time.value += 5;
    })

    // Add mesh to scene
    bg.add(constellationsMesh);

});