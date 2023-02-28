/*
    Copyright 2017-2022 Marcel Greter
    https://www.github.com/mgreter
*/

if (!window.THRAPP) {
    window.THRAPP = {};
}

// private scope
(function (THREE, THRAPP) {
    "use strict";

    class FirmamentShader extends THRAPP.CustomRawShader {

        constructor(parameters) {
            parameters = parameters || {};
            super(parameters);
            this.isRawShaderMaterial = false;
            this.defaultAttributeValues = [];
            this.uniforms.fov = { type: 'f', value: parameters.fov || 75.0 };
            this.uniforms.time = { type: 'f', value: parameters.time || 0.0 };
            this.uniforms.scale = { type: 'f', value: parameters.scale || 1.0 };
            this.uniforms.minMag = { type: 'f', value: parameters.minMag || -12.0 };
            this.uniforms.maxMag = { type: 'f', value: parameters.maxMag || 28.0 };
            this.uniforms.dimming = { type: 'f', value: parameters.dimming || 0.9 };
            this.uniforms.opacity = { type: 'f', value: parameters.opacity || 1.0 };
            this.uniforms.magFact = { type: 'f', value: parameters.magFact || 25.0 };
            this.uniforms.magScale = { type: 'f', value: parameters.magScale || 0.35 };
            this.uniforms.sizeScale = { type: 'f', value: parameters.sizeScale || 1.0 };
            this.uniforms.fillFactor = { type: 'f', value: parameters.fillFactor || 1.0 };
            this.uniforms.fillPower = { type: 'f', value: parameters.fillPower || 1.0 };
            this.uniforms.falloff = { type: 'f', value: parameters.falloff || 206264.80748432202 };

            this.vertexShader = [
                // Include threejs chunks
                "#include <common>",
                "#include <logdepthbuf_pars_vertex>",
                // Local uniforms
                "uniform float scale;",
                "uniform float minMag;",
                "uniform float maxMag;",
                "uniform float opacity;",
                "uniform float magFact;",
                "uniform float magScale;",
                "uniform float sizeScale;",
                // "uniform float fillFactor;",
                // "uniform float fillPower;",
                "uniform float falloff;",
                "uniform float dimming;",
                // Render state uniforms
                "uniform float fov;",
                "uniform float time;",
                // Local attributes
                "attribute vec4 attributes;",
                // Local variable
                "varying vec4 fragColor;",
                "varying float camStarDist;",
                // Helper function for log10 
                "float log10( in float n )",
                "{",
                "    // calculate log2 to log10",
                "    // kLogBase10 = 1.0 / log( 10.0 );",
                "    return log( n ) * 0.43429448190325176;",
                "}",
                // Helper to get star color from BV
                // RGB <0,1> <- BV <-0.4,+2.0> [-]
                "vec4 bv2rgb(float bv, float mag)",
                "{",
                "    float t;",
                "    float r = 0.0;",
                "    float g = 0.0;",
                "    float b = 0.0;",
                "    if (bv<-0.4) bv=-0.4;",
                "    if (bv> 1.95) bv= 1.95;",
                "    // http://www.vendian.org/mncharity/dir3/starcolor/details.html",
                "         if ((bv>=-0.40)&&(bv<0.00)) { t=(bv+0.40)/(0.00+0.40); r=0.61+(0.11*t)+(0.1*t*t); }",
                "    else if ((bv>= 0.00)&&(bv<0.40)) { t=(bv-0.00)/(0.40-0.00); r=0.83+(0.17*t)          ; }",
                "    else if ((bv>= 0.40)&&(bv<2.10)) { t=(bv-0.40)/(2.10-0.40); r=1.00                   ; }",
                "         if ((bv>=-0.40)&&(bv<0.00)) { t=(bv+0.40)/(0.00+0.40); g=0.70+(0.07*t)+(0.1*t*t); }",
                "    else if ((bv>= 0.00)&&(bv<0.40)) { t=(bv-0.00)/(0.40-0.00); g=0.87+(0.11*t)          ; }",
                "    else if ((bv>= 0.40)&&(bv<1.60)) { t=(bv-0.40)/(1.60-0.40); g=0.98-(0.16*t)          ; }",
                "    else if ((bv>= 1.60)&&(bv<2.00)) { t=(bv-1.60)/(2.00-1.60); g=0.82         -(0.5*t*t); }",
                "         if ((bv>=-0.40)&&(bv<0.40)) { t=(bv+0.40)/(0.40+0.40); b=1.00                   ; }",
                "    else if ((bv>= 0.40)&&(bv<1.50)) { t=(bv-0.40)/(1.50-0.40); b=1.00-(0.47*t)+(0.1*t*t); }",
                "    else if ((bv>= 1.50)&&(bv<1.94)) { t=(bv-1.50)/(1.94-1.50); b=0.63         -(0.6*t*t); }",
                "    return vec4(r, g, b, mag);",
                "}",
                // Main vertex shader
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
                    // Get star color from BV attribute
                    " fragColor = bv2rgb(attributes.a, dimming);",
                    // the camera distance can be useful to enhance view
                    // when far away from the center or close to it.
                    // keep it in world space or also use factor?
                    " float camZoomDist = length(cameraPosition);",
                    // get distance between camera and star
                    // we probably want to calculate distance from stars to
                    // camera in model space, even if the final results are
                    // in scaled world coordinates. Otherwise the distance
                    // will be in world coordinates and the falloff could
                    // be way to fast. Using an uniform is the fastest way!
                    // Otherwise we would need a full inverseModelMatrix.
                    " camStarDist = distance(cameraPosition / falloff, pos.xyz);",
                    // Get magnitude from attribute
                    " float mag = position.a;",
                    // calculate apparent magnitude (physically accurate)
                    " float vmag = mag - 5.0 + 5.0 * log10(camStarDist);",
                    // calculate point size from visual magnitude
                    " gl_PointSize = magFact * exp(- magScale * vmag);",
                    // apply global point size scale
                    " gl_PointSize *= sizeScale;",
                    // make sure the point does not get too big
                    " gl_PointSize = clamp(gl_PointSize, 0.0, 75.0);",
                    // zoom field of view
                    " gl_PointSize *= fov;",
                    // attenuate sizes once we are far away
                    " gl_PointSize += clamp(camZoomDist / 50000000.0, 0.2, 3.5);",
                    // dim out stars that are very close to the camera
                    // mostly needed for our sun to outshine the screen
                    " fragColor.a *= clamp(camStarDist * 1.0e5, 0.0, 1.0);",
                    // apply min/max magnitude filtering
                    " fragColor.a -= smoothstep(minMag, maxMag, vmag);",
                    // reduce flickering of very small and faint stars
                    " fragColor.a *= smoothstep(0.0, 3.0, pow(gl_PointSize, 0.5));",
                    // apply global opacity
                    " fragColor.a *= opacity;",
                    // calculate screen position (the regular way)
                    " gl_Position = projectionMatrix * modelViewMatrix * pos;",
                    // THREE.ShaderChunk[ 'logdepthbuf_vertex'
                    " #include <logdepthbuf_vertex>",
                ].join("\n"),
                "}",
            ].join("\n");

            this.fragmentShader = [
                // Required since we are GLSL3?
                // Could just use pc_fragColor
                "out highp vec4 pc_fragColor;",
                "#define gl_FragColor pc_fragColor",
                // Add include for depth buffer (z-write)
                "#include <logdepthbuf_pars_fragment>",
                // Local uniforms
                "uniform float fillFactor;",
                "uniform float fillPower;",
                "uniform float dimming;",
                // Variables passed from vertex shader
                "varying float camStarDist;",
                "varying vec4 fragColor;",
                // Main vertex shader
                "void main() {",
                [
                    // get uv coordinates (from -0.5 to +0.5)
                    " vec2 uv = gl_PointCoord - vec2(0.5, 0.5);",
                    // calculate distance to center
                    " float dist = 1.0 - length(uv) * 2.0;",
                    " dist = smoothstep(0.0, 1.0, pow(dist, 1.25));",
                    // Fill the start billboard according to options
                    " dist = fillFactor * pow(dist, fillPower);",
                    // Optional star spikes
                    " #ifdef HAS_SPIKES",
                    " dist = max(dist, 1.0 - max(abs(uv.x), abs(uv.y)) * 2.75);", // diagonal
                    " dist = max(dist, (1.0 - abs(uv.x * 2.0)) * (1.0 - abs(uv.y * 2.0)));",
                    " #endif",
                    // Set the final color
                    " gl_FragColor = fragColor * dist;",
                    // THREE.ShaderChunk[ 'logdepthbuf_fragment' ]
                    " #include <logdepthbuf_fragment>",
                ].join("\n"),
                "}",
            ].join("\n");
            // Fixup shaders to use vec4
            this.vertexFilter = this.fragmentFilter =
                function (webglsl) {
                    return webglsl.replace(
                        /attribute vec3 position;/g,
                        'attribute vec4 position;'
                    ).replace(
                        /attribute vec[23] (?:normal|uv);/g,
                        '' // Simply remove these fully
                    );
                }
            // Hookup optional dat.gui
            if (!parameters.datgui) return;
            var gui = parameters.datgui;
            var uniforms = this.uniforms;
            if (parameters.name) gui = gui.addFolder(parameters.name)
            gui.add(uniforms.scale, 'value', -24, 64).step(0.001).name('scale');
            gui.add(uniforms.minMag, 'value', -24, 64).step(0.001).name('minMag');
            gui.add(uniforms.maxMag, 'value', -24, 64).step(0.001).name('maxMag');
            gui.add(uniforms.opacity, 'value', 0, 1).step(0.001).name('opacity');
            gui.add(uniforms.magFact, 'value', 0, 80).step(0.001).name('magFact');
            gui.add(uniforms.magScale, 'value', 0, 5).step(0.001).name('magScale');
            gui.add(uniforms.sizeScale, 'value', 0, 40).step(0.001).name('sizeScale');

            gui.add(uniforms.fillFactor, 'value', 0.5, 2).step(0.001).name('fillFactor');
            gui.add(uniforms.fillPower, 'value', 0.25, 4).step(0.001).name('fillPower');
            gui.add(uniforms.falloff, 'value', 0, 5e5).step(0.001).name('falloff');
            gui.add(uniforms.dimming, 'value', 0, 4).step(0.001).name('dimming');
        }
        // EO constructor

        // Add uniforms to material (called during ctor)
        // Do not call, this is for internal use only!
        addUniforms(uniforms) {
            super.addUniforms(uniforms);
        }
        // EO addUniforms

        updateUniforms() {
            super.updateUniforms();
        }
        // EO updateUniforms

    }

    // ######################################################################
    // ######################################################################

    FirmamentShader.prototype.time = null;
    FirmamentShader.prototype.fov = null;
    FirmamentShader.prototype.scale = null;
    FirmamentShader.prototype.minMag = null;
    FirmamentShader.prototype.maxMag = null;
    FirmamentShader.prototype.opacity = null;
    FirmamentShader.prototype.magFact = null;
    FirmamentShader.prototype.magScale = null;
    FirmamentShader.prototype.sizeScale = null;

    // assign class to global namespace
    THRAPP.FirmamentShader = FirmamentShader;

    // ######################################################################
    // ######################################################################
})(THREE, THRAPP);
  // EO private scope
