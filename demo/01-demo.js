// Create an empty scene
var scene = window.scene || new THREE.Scene();
var planet = window.planet || new THREE.Group();
var eclipser = window.planet || new THREE.Group();
// Create shared singleton loader instance
var loader = window.loader || new THREE.TextureLoader();

// Create a basic perspective camera
var camera = new THREE.PerspectiveCamera(25,
    window.innerWidth/window.innerHeight,
    0.0000000001, 100000000);

// Setup camera configuration
camera.position.set(0, 1, 0);
camera.up.set(0, 1, 0)

// Create a renderer with Antialiasing
var renderer = new THREE.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true
});

// Configure renderer clear color
renderer.setClearColor("#333333");

// Configure renderer size (ToDo: update with window resize)
renderer.setSize( window.innerWidth, window.innerHeight );

// Append renderer element to the DOM
document.body.appendChild( renderer.domElement );

// Instantiate our custom trackball controls
var controls = new THREE.TrackballControls(camera, renderer.domElement);

// Setup control configuration
controls.rotateSpeed = 1.0;
controls.zoomSpeed = 1.2;
controls.panSpeed = 0.8;

// Very simple way to hook into the renderer
var rendererHook = [];

// Very simple demo render loop
var render = function () {

    // Inquire the next render loop
    requestAnimationFrame(render);

    // Do the update for the camera
    camera.updateProjectionMatrix();

    // Update controls
    controls.update();

    // Execute external hooks
    // Mostly to update uniforms
    for (var i in rendererHook) {
        rendererHook[i].call(this);
    }

    // if (window.skyMaterial != null)
    //     skyMaterial.updateUniforms();

    // Finally render the scene
    renderer.render(scene, camera);

};

// Inquire the first render loop
requestAnimationFrame(render);

// Idempotent calls
scene.add(camera);
