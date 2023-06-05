/*
    Copyright 2017-2023 Marcel Greter
    https://www.github.com/mgreter
*/

if (!window.THRAPP) {
  window.THRAPP = {};
}

// Allow to overwrite base material
THRAPP.BaseMaterial = THRAPP.BaseMaterial ||
    THRAPP.CustomMeshPhysicalMaterial;

// private scope
(function (THREE, THRAPP) {
  "use strict";

  class EclipseShader extends THRAPP.BaseMaterial {
    constructor(parameters) {
      super(parameters);
      this.setDefines({
        NUM_STARS: 0,
        NUM_ECLIPSERS: 0,
      });
      this.stars = [];
      this.eclipsers = [];
      this.addStar(parameters.stars || []);
      this.addEclipser(parameters.eclipsers || []);
      this.uniforms.bodyRadius.value = parameters.radius || 0.0;
      if (parameters.laserSize != null) {
        this.defines["USE_ECLIPSE_LASER"] = "";
        this.uniforms.laserSize.value = parameters.laserSize;
      }
      this.pbody = parameters.pbody || null;
      this.localWorldInverse = new THREE.Matrix4();
    }
    // EO constructor

    // Called on ctor
    presetValues() {
      this.pbody = null;
    }
    // EO presetValues

    // Add a new light source
    addStar(stars) {
      if (!Array.isArray(stars)) stars = [stars];
      for (var i = 0; i < stars.length; i++) {
        this.stars.push(stars[i]);
        this.uniforms.lightPos.value.push(new THREE.Vector3());
        this.uniforms.lightSize.value.push((stars[i].radius || 0) * 2);
      }
      if (this.defines["NUM_STARS"] != this.stars.length) {
        this.defines["NUM_STARS"] = this.stars.length;
        this.needsUpdate = true;
      }
    }
    // EO addStar

    // Add a new eclipser body
    addEclipser(eclipsers) {
      if (!Array.isArray(eclipsers)) eclipsers = [eclipsers];
      for (let i = 0; i < eclipsers.length; i++) {
        this.eclipsers.push(eclipsers[i]);
        this.uniforms.eclipserPos.value.push(new THREE.Vector3());
        this.uniforms.eclipserSize.value.push((eclipsers[i].radius || 0) * 2);
      }
      if (this.defines["NUM_ECLIPSERS"] != this.eclipsers.length) {
        this.defines["NUM_ECLIPSERS"] = this.eclipsers.length;
        this.needsUpdate = true;
      }
    }
    // EO addEclipser

    // Add uniforms to material (called during ctor)
    // Do not call, this is for internal use only!
    addUniforms(uniforms) {
      super.addUniforms(uniforms);
      uniforms.eclipserSize = { type: "fv1", value: [] };
      uniforms.eclipserPos = { type: "v3v", value: [] };
      uniforms.lightSize = { type: "fv1", value: [] };
      uniforms.lightPos = { type: "v3v", value: [] };
      uniforms.laserSize = { type: "f", value: 5e-7 };
      uniforms.bodyRadius = { type: "f", value: 5e-7 };
      uniforms.localScale = { type: "v3", value: new THREE.Vector3(1, 1, 1) };
    }
    // EO addUniforms

    updateUniforms() {
      var self = this,
        uniforms = self.uniforms,
        eclipsers = self.eclipsers,
        stars = self.stars;
      super.updateUniforms();
      if (self.pbody) {
        self.pbody.updateMatrix();
        // Create local space to world matrix
        self.localWorldInverse.copy(
          self.pbody.matrixWorld).invert();
        // var tmp = new THREE.Matrix4()
        // tmp.makeScale(
        //   self.pbody.scale.x,
        //   self.pbody.scale.y,
        //   self.pbody.scale.z);
        // mat4.premultiply(tmp);
        // Inlined to optimize
        const sx = self.pbody.scale.x;
        const sy = self.pbody.scale.y;
        const sz = self.pbody.scale.z;
        const te = self.localWorldInverse.elements;
        te[0] *= sx; te[4] *= sx; te[8] *= sx; te[12] *= sx;
        te[1] *= sy; te[5] *= sy; te[9] *= sy; te[13] *= sy;
        te[2] *= sz; te[6] *= sz; te[10] *= sz; te[14] *= sz;
        // Sphere may use geometry with radius 1 and scale it
        // Remove local scale and keep positions in world scale
        uniforms.localScale.value.copy(self.pbody.scale);
      }
      // Update eclipser positions
      for (var i = 0; i < eclipsers.length; i += 1) {
        var value = uniforms.eclipserPos.value[i];
        value.setFromMatrixPosition(eclipsers[i].matrixWorld);
        value.applyMatrix4(self.localWorldInverse);
      }
      // Update star/light positions
      for (var i = 0; i < stars.length; i += 1) {
        var value = uniforms.lightPos.value[i];
        value.setFromMatrixPosition(stars[i].matrixWorld);
        value.applyMatrix4(self.localWorldInverse);
      }
    }
    // EO updateUniforms

    debug(i, n) {
      var vector = new THREE.Vector3();
      var lightPos = this.uniforms.lightPos.value;
      var lightSize = this.uniforms.lightSize.value;
      var eclipserPos = this.uniforms.eclipserPos.value;
      var eclipserSize = this.uniforms.eclipserSize.value;
      var bodyRadius = this.uniforms.bodyRadius.value;
      console.log("Body Radius: ", bodyRadius);
      console.log(
        "Light[",
        i,
        "] - size: ",
        lightSize[i],
        ", pos: ",
        lightPos[i]
      );
      console.log(
        "Eclipser[",
        n,
        "] - size: ",
        eclipserSize[n],
        ", pos: ",
        eclipserPos[n]
      );
      var L1 = vector.copy(lightPos[i]).sub(eclipserPos[n]).length();
      var L2 = eclipserPos[n].length() - bodyRadius;
      var D1 = lightSize[i];
      var D2 = eclipserSize[n];
      var P = (D1 / L1) * L2;
      var U = (D2 / L1) * (L1 + L2) - P;
      console.log("Umbra(outer): ", U, ", Penumbra(core): ", P);
    }

    getVertexChunks() {
      var chunks = super.getVertexChunks();
      //***********************************************
      //***********************************************
      chunks.push({
        after: /<common>/,
        shader: [
          "  // Local vertex position",
          "  varying vec3 vertexPos;",
          "  uniform vec3 localScale;",
        ],
      });

      chunks.push({
        before: /<begin_vertex>/,
        shader: [
          " // Pass vertex position to fragments",
          "  vertexPos = position * localScale;",
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
          "  uniform float bodyRadius;",
          "  // Local vertex in world scale",
          "  varying vec3 vertexPos;",
          "#ifdef USE_ECLIPSE_LASER",
          "  uniform float laserSize;",
          "#endif",
          "#if NUM_STARS > 0",
          "  uniform vec3 lightPos[NUM_STARS];",
          "  uniform float lightSize[NUM_STARS];",
          "#endif",
          "#if NUM_ECLIPSERS > 0",
          "  uniform vec3 eclipserPos[NUM_ECLIPSERS];",
          "  uniform float eclipserSize[NUM_ECLIPSERS];",
          "#endif",
        ],
      });
      // extend fragment shaders
      chunks.push({
        after: /<common>/,
        shader: [
          "  float lineDistToPoint(vec3 A, vec3 B, vec3 P) {",
          "    // represent the line segment AB as a vector.",
          "    vec3 AB = B - A;",
          "    // determine the direction of B relative to A.",
          "    vec3 AB_dir = normalize( AB );",
          "    // compute the distance between A and Q using the dot",
          "    // product trick.  The first argument is a unit length",
          "    // vector.  The second argument is a point *relative to",
          "    // that vector*.",
          "    float AQ_len = dot( AB_dir, P - A );",
          "    // Now that we know the length of AQ, we can compute Q.",
          "    // To do this, think of the following equation as start",
          "    // at A; move along the direction AB_dir by AQ_len units;",
          "    // that position is Q.",
          "    vec3 Q = A + AQ_len * AB_dir;",
          "    // return the length of PQ.",
          "    return length( Q - P );",
          "  }",
        ],
      });
      //***********************************************
      //***********************************************
      chunks.push({
        before: /<aomap_fragment>/,
        shader: ["float shadows = 1.0;"],
      });
      chunks.push({
        after: /<aomap_fragment>/,
        shader: [
          "#if NUM_STARS > 0 && NUM_ECLIPSERS > 0",
          "  float starIntensity[NUM_STARS];",
          "  #ifdef USE_ECLIPSE_LASER",
          "    vec3 laserDot = vec3(0.0, 0.0, 0.0);",
          "    vec3 laserCol = vec3(1.0, 0.0, 0.0);",
          "  #endif",
          THRAPP.StartStaticForLoop("n", "NUM_ECLIPSERS"),
          THRAPP.StartStaticForLoop("i", "NUM_STARS"),
          "      // Get light position from passed uniform. There seems to be other way",
          "      // to get these via `pointLings[n].position`, but unsure how exactly.",
          "      // Get closest distance from the vertex point to the light ray.",
          "      // We want to do this calculation in world space, but for best accuracy",
          "      // we need to get the vertex point into local space. We simply do that",
          "      // by translating all points into local space by subtracting the world",
          "      // position of the parent system (moving zero coordinate). Which would be:",
          "      // float dist = lineDistToPoint(eclipserPos[n], lightPos[i], vertexWorldPos - off);",
          "      // The last subtraction is problematic, as it looses a lot of precision.",
          "      // Instead we provide a uniform with world position of the parent frame.",
          "      // This probably ignores some scaling and maybe some rotations, but allows",
          "      // us to do the subtraction on values that are themselves rather big.",
          "      // vec3 light = (vec4(pointLights[ i ].position, 1.0) * viewMatrix).xyz;",
          "      float behind = step(0.0, length(vertexPos - lightPos[i]) - length(lightPos[i]));",
          "      float dist = lineDistToPoint(eclipserPos[n], lightPos[i], vertexPos) + behind * 9e32;",
          "      // inner umbra and quadratic falloff for outer penumbra",
          "      // calculate umbra and penumbra from radii and distances",
          "      // http://www.opticiansfriend.com/articles/equations.html#Shadows",
          "      // Length from light source to L1 & Length from L1 to Umbra",
          "      float L1 = length(lightPos[i] - eclipserPos[n]);",
          "      float L2 = length(eclipserPos[n]) - bodyRadius;",
          "      float D1 = lightSize[i];", // Diameter of light source
          "      float D2 = eclipserSize[n];", // Diameter of object between
          "      float P = D1 / L1 * L2;",
          "      float U = D2 / L1 * (L1 + L2) - P;",
          "      U = max(U, 0.0); P = max(P, U);", // 0 < U < P
          "      starIntensity[i] += pow(smoothstep(U*.97, P, dist), 0.5);",
          "      #ifdef USE_ECLIPSE_LASER",
          "        laserDot += smoothstep(laserSize, laserSize*.2, dist) * laserCol;",
          "      #endif",
          THRAPP.EndStaticForLoop("i", "NUM_STARS"),
          THRAPP.EndStaticForLoop("n", "NUM_ECLIPSERS"),
          "  float globalIntensity = 0.0;",
          THRAPP.StartStaticForLoop("m", "NUM_STARS"),
          "    starIntensity[m] /= float(NUM_ECLIPSERS);",
          "    globalIntensity += starIntensity[m] / float(NUM_STARS);",
          THRAPP.EndStaticForLoop("m", "NUM_STARS"),
          "  shadows *= pow(clamp(globalIntensity, 0.0, 1.0), 2.0);",
          "#endif",
        ],
      });
      //***********************************************
      //***********************************************
      chunks.push({
        after: /vec3 outgoingLight/,
        shader: [
          "outgoingLight *= clamp(0.0, 1.0, shadows);",
          "#if NUM_STARS > 0 && NUM_ECLIPSERS > 0",
          "  #ifdef USE_ECLIPSE_LASER",
          "    outgoingLight = clamp(outgoingLight + laserDot, 0.0, 1.0);",
          "  #endif",
          "#endif",
        ],
      });
      //***********************************************
      //***********************************************
      return chunks;
    }
    // EO getFragmentChunks
  }

  // ######################################################################
  // ######################################################################

  EclipseShader.prototype.pbody = null;
  EclipseShader.prototype.radius = null;
  EclipseShader.prototype.stars = null;
  EclipseShader.prototype.eclipsers = null;
  EclipseShader.prototype.laserSize = null;

  // assign class to global namespace
  THRAPP.EclipseShader = EclipseShader;

  // ######################################################################
  // ######################################################################
})(THREE, THRAPP);
// EO private scope
