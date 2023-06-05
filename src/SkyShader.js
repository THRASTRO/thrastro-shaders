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

  var mat4 = new THREE.Matrix4();

  class SkyShader extends THRAPP.CustomMaterial(
    THREE.ShaderMaterial,
    "ShaderMaterial",
    "basic"
  ) {
    constructor(parameters) {
      super(parameters);
      this.setDefines({
        NUM_STARS: 0,
        USE_ATMOSPHERE: "",
      });
      if (parameters.atmosphere) {
        var atmosphere = parameters.atmosphere;
        var uniforms = this.uniforms;

        atmosphere.G = atmosphere.G || -0.95;
        atmosphere.Kr = atmosphere.Kr || 0.0025;
        atmosphere.Km = atmosphere.Km || 0.001;
        atmosphere.ESun = atmosphere.ESun || 20.0;
        atmosphere.bias = atmosphere.bias || 0.5;
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

      this.stars = [];
      this.addStar(parameters.stars || []);
    }

    // Add a new light source
    addStar(stars) {
      if (!Array.isArray(stars)) stars = [stars];
      for (var i = 0; i < stars.length; i++) {
        this.stars.push(stars[i]);
        this.uniforms.lightPos.value.push(new THREE.Vector3());
        this.uniforms.lightSize.value.push((stars[i].radius || 0) * 2);
      }
      this.defines["NUM_STARS"] += stars.length;
      this.needsUpdate = true;
    }
    // EO addStar

    updateUniforms() {
      var self = this,
        uniforms = self.uniforms,
        stars = self.stars;
      // Get Vector3 objects to update
      var sunPos = uniforms.v3LightPos.value;
      var camPos = uniforms.v3CameraPos.value;
      // Get world coordinates of objects
      camPos.setFromMatrixPosition(camera.matrixWorld)
      sunPos.setFromMatrixPosition(light.matrixWorld)
      // Calculate the world to local matrix
      if (self.pbody && self.pbody.matrixWorld) {
        mat4.copy(self.pbody.matrixWorld).invert();
        // Transform world to local coordinates
        sunPos.applyMatrix4(mat4);
        camPos.applyMatrix4(mat4);
      }
      // Update derived uniforms
      var h2 = camPos.lengthSq(),
        h = Math.sqrt(h2);
      uniforms.fCameraHeight.value = h;
      uniforms.fCameraHeight2.value = h2;
      // Update star positions
      for (var i = 0; i < stars.length; i += 1) {
        stars[i].getWorldPosition(uniforms.lightPos.value[i]);
        uniforms.lightPos.value[i].applyMatrix4(mat4);
      }
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
      uniforms.v3CameraPos = { type: "v3", value: new THREE.Vector3() };
      uniforms.v3LightPos = { type: "v3", value: new THREE.Vector3() };
      uniforms.lightSize = { type: "fv1", value: [] };
      uniforms.lightPos = { type: "v3v", value: [] };
    }

    getVertexChunks() {
      var chunks = super.getVertexChunks();
      chunks.push({
        after: /<common>/,
        shader: [
          "#if NUM_STARS > 0",
          "  uniform vec3 lightPos[NUM_STARS];",
          "  uniform float lightSize[NUM_STARS];",
          "#endif",
          "// These must be passed in local object space",
          "  uniform vec3 v3LightPos;        // The Light Position",
          "  uniform vec3 v3CameraPos;       // The Camera Position",
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
          "  varying vec3 v3Direction;",
          "  varying vec3 v3RayleighColor;",
          "  varying vec3 v3MieColor;",
          "  varying float fMiePhase;",
          "  uniform float fg;",
          "  uniform float fg2;",
          "  const int nSamples = 16;",
          "  const float fSamples = float(nSamples); // or 1.125",
          "  float scale(float fCos)",
          "  {",
          "  	float x = 1.0 - fCos;",
          "  	return fScaleDepth * exp(-0.00287 + x*(0.459 + x*(3.83 + x*(-6.80 + x*5.25))));",
          "  }",
        ],
      });
      chunks.push({
        after: /<begin_vertex>/,
        shader: [
          "  // vec3 v3CameraPos = cameraPosition; // vec3(1.5, 0.5, 10.0);",
          "  float fCameraHeight = length(v3CameraPos);",
          "  float fCameraHeight2 = fCameraHeight * fCameraHeight;",
          "  float fInvScaleDepth = (1.0 / fScaleDepth);",
          "  float fScaleOverScaleDepth = fScale / fScaleDepth;",

          "  // Do all the calculation in local space, since this yields best precision",
          "  vec3 cameraLocal = v3CameraPos; // vec3(modelMatrixInverse * vec4(cameraPosition, 1.0));",

          "  // Get the ray from the camera to the vertex and its length",
          "  // which is the far point of the ray passing through the atmosphere",

          "  vec3 v3Pos = position; //",

          "  vec3 v3Ray = position - cameraLocal;",
          "  float fFar = length(v3Ray);",
          "  v3Ray /= fFar;",
          "  // Pass direction to fragment shader",
          "  v3Direction = v3CameraPos - v3Pos;",
          "  // Calculate the closest intersection of the ray with the outer atmosphere",
          "  // Which is the near point of the ray passing through the atmosphere",
          "  float B = 2.0 * dot(v3CameraPos, v3Ray);",
          "  float C = fCameraHeight2 - fOuterRadius2;",
          "  float fDet = max(0.0, B*B - 4.0 * C);",
          "  float fNear = 0.5 * (-B - sqrt(fDet));",
          "  // Calculate the ray's starting position, then calculate its scattering offset",
          "  vec3 v3Start = v3CameraPos + v3Ray * fNear;",
          "  fFar -= fNear;",
          "  float fStartAngle = dot(v3Ray, v3Start) / fOuterRadius;",
          "  float fStartDepth = exp(-1.0 / fScaleDepth);",
          "  float fStartOffset = fStartDepth*scale(fStartAngle);",
          "  // Initialize the scattering loop variables",
          "  float fSampleLength = fFar / fSamples;",
          "  float fScaledLength = fSampleLength * fScale;",
          "  vec3 v3SampleRay = v3Ray * fSampleLength;",
          "  vec3 v3SamplePoint = v3Start + v3SampleRay * 0.5;",
          "  // Now loop through the sample rays",
          "  vec3 v3FrontColor = vec3(0.0, 0.0, 0.0);",
          "  for(int i=0; i<nSamples; i++)",
          "  {",
          "    float fHeight = length(v3SamplePoint);",
          "    float fDepth = exp(fScaleOverScaleDepth * (fInnerRadius - fHeight));",
          "    float fCameraAngle = dot(v3Ray, v3SamplePoint) / fHeight;",
          THRAPP.StartStaticForLoop("n", "NUM_STARS"),
          "        float fLightAngle = dot(lightPos[n], v3SamplePoint) / fHeight;",
          "        float fScatter = (fStartOffset + fDepth*(scale(fLightAngle) - scale(fCameraAngle)));",
          "        vec3 v3Attenuate = exp(-fScatter * (v3InvWavelength * fKr4PI + fKm4PI));",
          "        v3FrontColor += v3Attenuate * (fDepth * fScaledLength);",
          "        v3SamplePoint += v3SampleRay;",
          THRAPP.EndStaticForLoop("n", "NUM_STARS"),
          "  }",
          "  v3RayleighColor = v3FrontColor * (v3InvWavelength * fKrESun);",
          "  v3MieColor = v3FrontColor * fKmESun;;",

          "vec3 lightPos = lightPos[0];",
          "lightPos *= 0.95;",

          "float fCos = dot(lightPos, v3Direction) / length(v3Direction);",
          "fMiePhase = 1.5 * ((1.0 - fg2) / (2.0 + fg2)) * (1.0 + fCos*fCos) / pow(1.0 + fg2 - 2.0*fg*fCos, 1.5);",
        ],
      });
      return chunks;
    }

    getFragmentChunks() {
      var chunks = super.getFragmentChunks();
      chunks.unshift({
        after: /<common>/,
        shader: [
          "#if NUM_STARS > 0",
          "  uniform vec3 lightPos[NUM_STARS];",
          "  uniform float lightSize[NUM_STARS];",
          "#endif",
          "#ifdef USE_ATMOSPHERE",
          "  uniform float fg;",
          "  uniform float fg2;",
          "  uniform vec3 v3LightPos;",
          "  varying vec3 v3RayleighColor;",
          "  varying vec3 v3MieColor;",
          "  varying vec3 v3Direction;",
          "  varying float fMiePhase;",
          "  uniform float fExposure;",
          "  uniform float fBias;",
          "#endif",
        ],
      });
      chunks.push({
        after: /vec3 outgoingLight/,
        shader: [
          "outgoingLight = v3RayleighColor + fMiePhase * v3MieColor;",
          "outgoingLight = vec3(1.0, 1.0, 1.0) - exp(-fExposure * outgoingLight);",
          "float lum = 0.2126*outgoingLight.r + 0.7152*outgoingLight.g + 0.0722*outgoingLight.b;",
          "diffuseColor.a = clamp(lum, 0.0, 1.0);",
        ],
      });
      return chunks;
    }
  }

  // ######################################################################
  // ######################################################################

  SkyShader.prototype.stars = null;
  SkyShader.prototype.atmosphere = null;

  // assign class to global namespace
  THRAPP.SkyShader = SkyShader;

  // ######################################################################
  // ######################################################################
})(THREE, THRAPP);
// EO private scope
