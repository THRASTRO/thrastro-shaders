/*
    Copyright 2017-2023 Marcel Greter
    https://www.github.com/mgreter
*/

if (!window.THRAPP) {
    window.THRAPP = {};
}

// private scope
(function (THREE, THRAPP) {
    "use strict";

    class ConstellationsShader extends THRAPP.CustomRawShader {

        constructor(parameters) {
            parameters = parameters || {};
            super(parameters);
            this.isRawShaderMaterial = false;
            this.uniforms.time = { type: 'f', value: parameters.time || 0.0 };
            this.uniforms.scale = { type: 'f', value: parameters.scale || 1.0 };
            this.uniforms.opacity = { type: 'f', value: parameters.opacity || 1.0 };
            this.uniforms.camFadeDist = { type: 'f', value: parameters.camFadeDist || 5e9 };
            this.uniforms.color = { type: 'v3', value: new THREE.Color(parameters.color || 0xffffff) };
            // Declare full vertex shader
            this.vertexShader = [
                // Include threejs chunks
                "#include <common>",
                "#include <logdepthbuf_pars_vertex>",
                // Local uniforms
                "uniform float time;",
                "uniform float scale;",
                "uniform float opacity;",
                "uniform float camFadeDist;",
                "uniform vec3 color;",
                // Local attributes
                "attribute vec2 attributes;",
                // Local variable
                "varying vec4 fragColor;",
                // The main shader program
                "void main() {",
                [
                    // Positional arguments
                    " float ra = position.x;",
                    " float dec = position.y;",
                    " float dist = position.z;",
                    // Movement arguments
                    " float pm_ra = attributes.x;",
                    " float pm_dec = attributes.y;",
                    // time is in julian years
                    // movement is rads per year
                    // hyg pmrarad/decrad (25,26)
                    " ra += pm_ra * time / 206300000.0;",
                    " dec += pm_dec * time / 206300000.0;",
                    // Convert from spherical coordinates
                    " float x = cos(dec) * cos(ra) * dist * scale;",
                    " float y = cos(dec) * sin(ra) * dist * scale;",
                    " float z = sin(dec) * dist * scale;",
                    " vec4 pos = vec4(x, y, z, 1.0);",
                    // Calculate the final position
                    " gl_Position = projectionMatrix * modelViewMatrix * pos;",
                    // hide lines when camera moves away from center"
                    " float camdist = length(cameraPosition.xyz);",
                    // smooth the fade out between min and max distance"
                    " float alpha = 1.0 - smoothstep(0.0, camFadeDist, camdist);",
                    // Calculate the final fragment color
                    "fragColor = vec4(color.xyz, alpha * opacity);",
                    // THREE.ShaderChunk[ 'logdepthbuf_vertex'
                    "#include <logdepthbuf_vertex>",
                ].join("\n"),
                "}",
            ].join("\n");
            // Declare full fragment shader
            this.fragmentShader = [
                // Include threejs chunks
                "#include <common>",
                "#include <logdepthbuf_pars_fragment>",
                // Required since we use GLSL3
                "out highp vec4 pc_fragColor;",
                "#define gl_FragColor pc_fragColor",
                // Local variable
                "varying vec4 fragColor;",
                // Main fragment shader
                "void main() {",
                [
                    // Set the final color
                    " gl_FragColor = fragColor;",
                    // THREE.ShaderChunk[ 'logdepthbuf_fragment'
                    " #include <logdepthbuf_fragment>",
                ].join("\n"),
                "}",
            ].join("\n");
            // Hookup optional dat.gui
            if (!parameters.datgui) return;
            var gui = parameters.datgui;
            var uniforms = this.uniforms;
            if (parameters.name) gui = gui.addFolder(parameters.name)
            gui.add(uniforms.scale, 'value', 0, 9).step(0.001).name('scale');
            gui.add(uniforms.opacity, 'value', 0, 1).step(0.001).name('opacity');
            gui.add(uniforms.camFadeDist, 'value', 0, 5e6).step(0.001).name('fade dist');
            gui.addThreeColor(uniforms.color, 'value').name('color');
        }
        // EO constructor
    }

    // ######################################################################
    // ######################################################################

    ConstellationsShader.prototype.time = null;
    ConstellationsShader.prototype.scale = null;
    ConstellationsShader.prototype.opacity = null;
    ConstellationsShader.prototype.color = null;
    ConstellationsShader.prototype.cameraFadeMin = null;
    ConstellationsShader.prototype.cameraFadeMax = null;

    // assign class to global namespace
    THRAPP.ConstellationsShader = ConstellationsShader;

    // ######################################################################
    // ######################################################################
})(THREE, THRAPP);
  // EO private scope
