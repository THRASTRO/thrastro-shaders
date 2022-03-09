var skyGeometry = new THREE.IcosahedronGeometry(earthRadi * 1.015, 32);
var skyMaterial = new THRAPP.SkyShader({
    atmosphere: {
        bias: 0.25,
        scaleDepth: 0.4, // Altitude of average density
        wavelength: earthSpectra,
        innerRadius: earthRadi,
        height: earthRadi * 0.015,
        exposure: 0.75,
    },
    // ringMap: ringShadow,
    // color: 0x433F81,
    transparent: true,
    side: THREE.BackSide,

    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: true,

});

skyMaterial.addStar(light);

var sky = new THRAPP.Mesh( skyGeometry, skyMaterial );
// Hook into renderer to update uniforms
rendererHook.push(function () {
  skyMaterial.updateUniforms();
});

planet.add(sky);