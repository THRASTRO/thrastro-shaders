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

  var mat4 = new THREE.Matrix4();

  class GroundShader extends THRAPP.PlanetShader {
    constructor(parameters) {
      super(parameters);
      this.setDefines({
        USE_GROUNDSHADER: 1,
        NUM_SAMPLES: 16,
      });

      if (parameters.atmosphere) {
        var atmosphere = parameters.atmosphere;
        var uniforms = this.uniforms;

        atmosphere.G = atmosphere.G || -0.95;
        atmosphere.Kr = atmosphere.Kr || 0.0025;
        atmosphere.Km = atmosphere.Km || 0.001;
        atmosphere.ESun = atmosphere.ESun || 20.0;
        atmosphere.bias = atmosphere.bias || 0.5;
        atmosphere.skale = atmosphere.skale || 0.5;
        atmosphere.exposure = atmosphere.exposure || 2.5;
        atmosphere.scaleDepth = atmosphere.scaleDepth || 0.25;
        atmosphere.scaleHeight = atmosphere.scaleHeight || 1.025;
        atmosphere.innerRadius = atmosphere.innerRadius || r * KM2AU;

        var wavelength = atmosphere.wavelength;
        uniforms.v3InvWavelength.value.set(
          1.0 / Math.pow(wavelength.x, 4.0),
          1.0 / Math.pow(wavelength.y, 4.0),
          1.0 / Math.pow(wavelength.z, 4.0)
        );

        var G = atmosphere.G;
        uniforms.fg.value = G;
        uniforms.fg2.value = G * G;

        var Kr = atmosphere.Kr;
        var Km = atmosphere.Km;
        var ESun = atmosphere.ESun;
        uniforms.fKrESun.value = Kr * ESun;
        uniforms.fKmESun.value = Km * ESun;
        uniforms.fKr4PI.value = Kr * 4 * Math.PI;
        uniforms.fKm4PI.value = Km * 4 * Math.PI;

        var sd = atmosphere.scaleDepth;
        var sh = atmosphere.scaleHeight;
        var innerRadius = atmosphere.innerRadius;
        var outerRadius = innerRadius + atmosphere.height;
        uniforms.fBias.value = atmosphere.bias;
        uniforms.fExposure.value = atmosphere.exposure;
        var scale = 1.0 / (outerRadius - innerRadius);
        uniforms.fScale.value = scale;
        uniforms.fScaleDepth.value = sd;

        uniforms.fOuterRadius.value = outerRadius;
        uniforms.fInnerRadius.value = innerRadius;
        uniforms.fOuterRadius2.value = outerRadius * outerRadius;
        uniforms.fInnerRadius2.value = innerRadius * innerRadius;
      }
    }

    updateUniforms() {
      var self = this,
        uniforms = self.uniforms;
      super.updateUniforms();
      // Get Vector3 objects to update
      var camPos = uniforms.fCameraPos.value;
      // Get world coordinates of objects
      camPos.setFromMatrixPosition(camera.matrixWorld)
      // Calculate the world to local matrix
      mat4.copy(self.pbody.matrixWorld).invert();
      // Transform world to local coordinates
      camPos.applyMatrix4(mat4);
      // console.log(sunPos, vec2);
      // Update derived uniforms
      var h2 = camPos.lengthSq(),
        h = Math.sqrt(h2);
      uniforms.fCameraHeight.value = h;
      uniforms.fCameraHeight2.value = h2;
    }

    addUniforms(uniforms) {
      super.addUniforms(uniforms);
      uniforms.fg = { type: "f", value: 0 };
      uniforms.fg2 = { type: "f", value: 0 };
      uniforms.fKrESun = { type: "f", value: 0 };
      uniforms.fKmESun = { type: "f", value: 0 };
      uniforms.fKr4PI = { type: "f", value: 0 };
      uniforms.fKm4PI = { type: "f", value: 0 };
      uniforms.fScale = { type: "f", value: 0 };
      uniforms.fBias = { type: "f", value: 0 };
      uniforms.fExposure = { type: "f", value: 0 };
      uniforms.fScaleDepth = { type: "f", value: 0 };
      uniforms.fOuterRadius = { type: "f", value: 0 };
      uniforms.fInnerRadius = { type: "f", value: 0 };
      uniforms.fOuterRadius2 = { type: "f", value: 0 };
      uniforms.fInnerRadius2 = { type: "f", value: 0 };
      uniforms.fCameraHeight = { type: "f", value: 0 };
      uniforms.fCameraHeight2 = { type: "f", value: 0 };
      uniforms.v3InvWavelength = { type: "v3", value: new THREE.Vector3() };
      uniforms.fCameraPos = { type: "v3", value: new THREE.Vector3() };
    }

    getVertexChunks() {
      var chunks = super.getVertexChunks();
      //***********************************************
      //***********************************************
      chunks.push({
        after: /<common>/,
        shader: [
          "#if USE_GROUNDSHADER > 0 && NUM_STARS > 0",

          "  uniform vec3 lightPos[NUM_STARS];",
          "  uniform float lightSize[NUM_STARS];",

          "  uniform vec3 fCameraPos;       // The Camera Position",
          "  uniform vec3 v3InvWavelength;   // 1 / pow(abs(wavelength), 4) for the red, green, and blue channels",
          "  uniform float fCameraHeight;    // The cameras current height",
          "  uniform float fCameraHeight2;   // fCameraHeight^2",
          "  uniform float fOuterRadius;     // The outer (atmosphere) radius",
          "  uniform float fOuterRadius2;    // fOuterRadius^2",
          "  uniform float fInnerRadius;     // The inner (planetary) radius",
          "  uniform float fInnerRadius2;    // fInnerRadius^2",
          "  uniform float fKrESun;          // Kr * ESun",
          "  uniform float fKmESun;          // Km * ESun",
          "  uniform float fKr4PI;           // Kr * 4 * PI",
          "  uniform float fKm4PI;           // Km * 4 * PI",
          "  uniform float fScale;           // 1 / (fOuterRadius - fInnerRadius)",
          "  uniform float fScaleDepth;      // The scale depth (i.e. the altitude at which the atmospheres average density is found)",
          "  uniform float fBias;            // GroundShader Bias",

          "  varying vec3 v3RayleighColor;",
          "  varying vec3 v3MieColor;",

          "  float scale(float fCos)",
          "  {",
          "  	float x = 1.0 - fCos;",
          "  	return fScaleDepth * exp(-0.00287 + x*(0.459 + x*(3.83 + x*(-6.80 + x*5.25))));",
          "  }",

          "#endif",
        ],
      });
      chunks.push({
        after: /<begin_vertex>/,
        shader: [
          "#if USE_GROUNDSHADER > 0 && NUM_STARS > 0",
          "  v3RayleighColor *= 0.0;",
          "  v3MieColor *= 0.0;",
          "  float fInvScaleDepth = (1.0 / fScaleDepth);",
          "  float fScaleOverScaleDepth = fScale / fScaleDepth;",
          
          "  // Do all the calculation in local space, since this yields best precision",
          "  vec3 cameraLocal = fCameraPos; // vec3(modelMatrixInverse * vec4(cameraPosition, 1.0));",

          "  // Get the ray from the camera to the vertex and its length",
          "  // which is the far point of the ray passing through the atmosphere",
          "  vec3 v3Ray = position - cameraLocal;",
          "  float fFar = length(v3Ray);",
          "  v3Ray /= fFar;",

          "  // Calculate the closest intersection of the ray with the outer atmosphere",
          "  // Which is the near point of the ray passing through the atmosphere",
          "  float B = 2.0 * dot(cameraLocal, v3Ray);",
          "  float C = fCameraHeight2 - fOuterRadius2;",
          "  float fDet = max(0.0, B*B - 4.0 * C);",
          "  float fNear = 0.5 * (-B - sqrt(fDet));",

          "  float fDepth = exp((fInnerRadius - fOuterRadius) * fScaleOverScaleDepth);",
          "  float fCameraAngle = dot(-v3Ray, position) / length(position);",
          "  float fCameraScale = scale(fCameraAngle);",
          "  float fCameraOffset = fDepth*fCameraScale;",

          THRAPP.StartStaticForLoop("n", "NUM_STARS"),
          "    // Do all the calculation in local space, since this yields best precision",
          "    vec3 lightLocal = lightPos[n]; // vec3(modelMatrixInverse * vec4(starPos[n], 1.0));",
          "    // Calculate the ray's starting position, then calculate its scattering offset",
          "    vec3 v3Start = cameraLocal + v3Ray * fNear;",
          "    fFar -= fNear;",
          "    float fLightAngle = dot(lightLocal, position) / length(position);",
          "    float fLightScale = scale(fLightAngle);",
          "    float fTemp = (fLightScale + fCameraScale);",

          "    // Initialize the scattering loop variables",
          "    float fSampleLength = fFar / float(NUM_SAMPLES);",
          "    float fScaledLength = fSampleLength * fScale;",
          "    vec3 v3SampleRay = v3Ray * fSampleLength;",
          "    vec3 v3SamplePoint = v3Start + v3SampleRay * 0.5;",

          "    // Now loop through the sample rays",
          "    vec3 v3FrontColor = vec3(0.0, 0.0, 0.0);",
          "    vec3 v3Attenuate;",
          "    for(int i=0; i<NUM_SAMPLES; i++)",
          "    {",
          "        float fHeight = length(v3SamplePoint);",
          "        float fDepth = exp(fScaleOverScaleDepth * (fInnerRadius - fHeight));",
          "        float fScatter = fDepth*fTemp - fCameraOffset;",
          "        v3Attenuate = exp(-fScatter * (v3InvWavelength * fKr4PI + fKm4PI));",
          "        v3FrontColor += v3Attenuate * (fDepth * fScaledLength);",
          "        v3SamplePoint += v3SampleRay;",
          "    }",

          "    v3RayleighColor += v3FrontColor * (v3InvWavelength * fKrESun + fKmESun) / float(NUM_STARS);",
          "    v3MieColor += v3Attenuate / float(NUM_STARS);",

          THRAPP.EndStaticForLoop("n", "NUM_STARS"),
          "#endif",
        ],
      });
      //***********************************************
      //***********************************************
      return chunks;
    }

    getFragmentChunks() {
      var chunks = super.getFragmentChunks();
      //***********************************************
      //***********************************************
      chunks.push({
        after: /<common>/,
        shader: [
          "#if USE_GROUNDSHADER > 0 && NUM_STARS > 0",
          "  varying vec3 v3RayleighColor;",
          "  varying vec3 v3MieColor;",
          "  uniform float fBias;",
          "#endif",
        ],
      });
      chunks.push({
        after: /vec3 outgoingLight/,
        shader: [
          "#if USE_GROUNDSHADER > 0 && NUM_STARS > 0",
          "  vec3 color = v3RayleighColor + 0.25 * v3MieColor;",
          "  outgoingLight = mix(outgoingLight, color, fBias);",
          "#endif",
        ],
      });
      //***********************************************
      //***********************************************
      return chunks;
    }
  }

  // ######################################################################
  // ######################################################################

  GroundShader.prototype.atmosphere = null;

  // assign class to global namespace
  THRAPP.GroundShader = GroundShader;

  // ######################################################################
  // ######################################################################
})(THREE, THRAPP);
// EO private scope
