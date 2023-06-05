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

  class PlanetShader extends THRAPP.EclipseShader {
    constructor(parameters) {
      super(parameters);
      this.setDefines({
        NUM_RINGS: 0,
      });
      this.rings = [];
      this.addRing(parameters.rings || []);
      if (parameters.nightMap) {
        this.defines["USE_UV"] = "";
        this.defines["USE_NIGHT_MAP"] = "";
        this.uniforms.nightMap.value = parameters.nightMap;
      }
      if (parameters.ringMap) {
        this.defines["USE_RING_MAP"] = "";
        this.uniforms.ringMap.value = parameters.ringMap;
      }
    }
    // EO constructor

    // Put a new ring around
    addRing(rings) {
      if (!Array.isArray(rings)) rings = [rings];
      for (var i = 0; i < rings.length; i++) {
        this.rings.push(rings[i]);
        var radii = new THREE.Vector2(
          rings[i].innerRadius || 0,
          rings[i].outerRadius || 0
        );
        this.uniforms.ringRadii.value.push(radii);
        this.uniforms.ringNorm.value.push(new THREE.Vector3());
        this.uniforms.ringWMat4.value.push(rings[i].matrixWorld || new THREE.Matrix4());
      }
      this.defines["NUM_RINGS"] += rings.length;
      this.needsUpdate = true;
    }
    // EO addRing

    updateUniforms() {
      var self = this,
        rings = self.rings,
        uniforms = self.uniforms;
      super.updateUniforms();
      if (self.pbody) mat4.copy(self.pbody.matrixWorld).invert();
      for (var i = 0; i < rings.length; i += 1) {
        uniforms.ringNorm.value[i].set(0, 0, 1)
          .applyMatrix4(rings[i].matrixWorld)
          .applyMatrix4(mat4);
      }
    }

    addUniforms(uniforms) {
      super.addUniforms(uniforms);
      uniforms.nightMap = { type: "t", value: null };
      uniforms.ringMap = { type: "t", value: null };
      uniforms.ringWMat4 = { type: "vm4", value: [] };
      uniforms.ringNorm = { type: "v3v", value: [] };
      uniforms.ringRadii = { type: "v2v", value: [] };
    }

    getVertexChunks() {
      var chunks = super.getVertexChunks();
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
          "#ifdef USE_NIGHT_MAP",
          "  uniform sampler2D nightMap;",
          "#endif",
        ],
      });
      chunks.push({
        after: /vec3 outgoingLight/,
        shader: [
          "#ifdef USE_NIGHT_MAP",
          "  float hasLight = 0.0;",
          THRAPP.StartStaticForLoop("i", "NUM_STARS"), 
          "    float girrad = dot(-normalize(vertexPos), normalize(lightPos[i]));",
          "    hasLight += pow(1.0 - clamp(girrad, 0.0, 1.0), 4.0);",
          "#ifdef DEBUG_DAYLIGHT_TERMINATOR",
          "    if (girrad < 0.01 && girrad > 0.0) outgoingLight.r = 1.0; ",
          "#endif",
          THRAPP.EndStaticForLoop("i", "NUM_STARS"), 
          "  outgoingLight += texture2D(nightMap, vUv).xyz * clamp(1.0 - hasLight, 0.0, 1.0);",
          "#else",
          "#endif",
        ],
      });
      //***********************************************
      //***********************************************
      chunks.push({
        after: /<common>/,
        shader: [
          "#ifdef USE_RING_MAP",
          "  uniform sampler2D ringMap;",
          "#endif",
          "#if NUM_RINGS > 0",
          "  uniform vec2 ringRadii[NUM_RINGS];",
          "  uniform mat4 ringWMat4[NUM_RINGS];",
          "  uniform vec3 ringNorm[NUM_RINGS];",
          "#endif",
        ],
      });
      chunks.push({
        after: /<aomap_fragment>/,
        shader: [
          "float ringShadows = 1.0;",
          "#if NUM_RINGS > 0 && NUM_STARS > 0",
          "  float ringShadow[NUM_STARS];",
          THRAPP.StartStaticForLoop("n", "NUM_RINGS"), 
          "    vec3 axisWorldDir = normalize(ringNorm[n]);",
          "    ringShadow[n] = 0.0;", // init value first
          THRAPP.StartStaticForLoop("i", "NUM_STARS"), 
          "      // Intersect the vertex point with the ring plane and return distance to center.",
          "      // From there we can calculate if it lies between inner and outer radius.",
          "      float d = dot(-vertexPos, axisWorldDir) / dot(lightPos[i], axisWorldDir);", // dot magic
          "      vec3 p = vertexPos + lightPos[i] * d;", // intersection point on plane
          "      // Check if distance is between inner and outer radius",
          "      float range = (ringRadii[n].y - ringRadii[n].x) / 2.0;",
          "      float dist = abs(length(p) - ringRadii[n].x - range);",
          "      float fact = 1.0 - clamp(pow(dist / range, 8.0), 0.0, 1.0);",
          "      fact *= step(0.0, d);", // Only shade behind ring is visible
          "#ifdef USE_RING_MAP",
          "        vec2 rUv = vec2(0.5, 1.0 - (length(p) - ringRadii[n].x) / range / 2.0);",
          "        vec4 tex = texture2D(ringMap, rUv);",
          "        // Calculate luminance at the texture position",
          "        float lum = 0.2126*tex.r + 0.7152*tex.g + 0.0722*tex.b;",
          "        ringShadow[n] += fact * pow(lum, 0.5) * pow(tex.a, 0.5);",
          "#else",
          "        ringShadow[n] += fact;",
          "#endif",
          THRAPP.EndStaticForLoop("i", "NUM_STARS"), 
          THRAPP.EndStaticForLoop("n", "NUM_RINGS"), 
          THRAPP.StartStaticForLoop("i", "NUM_RINGS"), 
          "    ringShadows -= ringShadow[i] / float(NUM_STARS);",
          THRAPP.EndStaticForLoop("i", "NUM_RINGS"), 
          "  shadows *= ringShadows;",
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

  PlanetShader.prototype.nightMap = null;
  PlanetShader.prototype.ringMap = null;

  // assign class to global namespace
  THRAPP.PlanetShader = PlanetShader;

  // ######################################################################
  // ######################################################################
})(THREE, THRAPP);
// EO private scope
