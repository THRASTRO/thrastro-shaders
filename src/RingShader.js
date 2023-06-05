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

  // ######################################################################
  // Shader to be used with a ring geometry to render a planetary ring
  // ######################################################################

  class RingShader extends THRAPP.CustomMeshPhysicalMaterial {
    constructor(parameters) {
      super(parameters);
      this.setDefines({
        NUM_ECLIPSERS: 0,
      });
      if (parameters.planetRadius) {
        this.uniforms.planetRadius.value = parameters.planetRadius;
      }
      if (parameters.eclipsers) {
        var eclipsers = parameters.eclipsers;
        if (!Array.isArray(eclipsers)) eclipsers = [eclipsers];
        this.defines["NUM_ECLIPSERS"] = eclipsers.length;
      }
    }
    // EO constructor

    addUniforms(uniforms) {
      super.addUniforms(uniforms);
      uniforms.planetRadius = { type: "f", value: 0 };
    }
    // EO addUniforms

    getVertexChunks() {
      var chunks = super.getVertexChunks();
      //***********************************************
      //***********************************************
      chunks.unshift({
        after: /<common>/,
        shader: [
          "  // The planetary radius",
          "  uniform float planetRadius;",
          "  // Pass world space to fragments",
          "  varying vec3 vertexPos;",
          "  varying vec3 originPos;",
        ],
      });
      chunks.unshift({
        after: /<begin_vertex>/,
        shader: [
          "  // convert from local space to camera space",
          "  vertexPos = vec3(modelViewMatrix * vec4(position, 1.0));",
          "  originPos = vec3(modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0));",
        ],
      });
      //***********************************************
      //***********************************************
      return chunks;
    }
    // EO getVertexChunks

    getFragmentChunks() {
      var chunks = super.getFragmentChunks();
      //***********************************************
      //***********************************************
      chunks.unshift({
        after: /<common>/,
        shader: [
          "  // The planetary radius",
          "  uniform float planetRadius;",
          "  // Pass world space to fragments",
          "  varying vec3 vertexPos;",
          "  varying vec3 originPos;",
          "  // Return distance between line AB and point P",
          "  // Positive if intersection is behind the object.",
          "  // Negative if intersection is in front of the object.",
          "  float lineDistToPoint(vec3 A, vec3 B, vec3 P) {",
          "    // represent the line segment AB as a vector.",
          "    vec3 AB = B - A;",
          "    // I am a bit worried about branch performance?",
          "    // http://stackoverflow.com/a/4176288/1550314",
          "    // if (length(B - P) > length(AB)) return 9e32;",
          "    // calculate front step value to determine on which",
          "    // side the shadow lies (only shade behind object).",
          "    float front = step(0.0, length(B - P) - length(AB));",
          "    // determine the direction of B relative to A.",
          "    vec3 AB_dir = normalize( AB );",
          "    // compute the distance between A and Q using the dot",
          "    // product trick. The first argument is a unit length",
          "    // vector. The second argument is a point *relative to",
          "    // that vector*.",
          "    float AQ_len = dot( AB_dir, P - A );",
          "    // Now that we know the length of AQ, we can compute Q.",
          "    // To do this, think of the following equation as start",
          "    // at A; move along the direction AB_dir by AQ_len units;",
          "    // that position is Q.",
          "    vec3 Q = A + AQ_len * AB_dir;",
          "    // return the length of PQ (negative if front).",
          "    return length( Q - P ) * (-front * 2.0 + 1.0);",
          "  }",
        ],
      });
      chunks.unshift({
        after: /<aomap_fragment>/,
        shader: [
          "  float shaded = 0.0;",
          "#if NUM_POINT_LIGHTS > 0 && NUM_ECLIPSERS > 0",
          THRAPP.StartStaticForLoop("i", "NUM_POINT_LIGHTS"),
          "    // Get camera position in eye/view coordinates",
          "    vec3 light = pointLights[ i ].position;",
          "    // Calculate distance from touch point from planet origin",
          "    float dist = lineDistToPoint(vertexPos, light, originPos);",
          "    shaded += 1.0 - clamp(pow(dist / planetRadius, 64.0), 0.0, 1.0);",
          THRAPP.EndStaticForLoop("i", "NUM_POINT_LIGHTS"),
          "#endif",
          "#if NUM_POINT_LIGHTS > 1",
          "  shaded /= float(NUM_POINT_LIGHTS);",
          "#endif",
        ],
      });
      chunks.unshift({
        after: /vec3 outgoingLight/,
        shader: [
          // Adjust for additional shading
          "outgoingLight *= 1.0 - shaded;",
        ],
      });
      //***********************************************
      //***********************************************
      return chunks;
    }
    // EO getVertexChunks
  }

  // ######################################################################
  // ######################################################################

  RingShader.prototype.planetRadius = null;
  RingShader.prototype.eclipsers = null;

  // assign class to global namespace
  THRAPP.RingShader = RingShader;

  // ######################################################################
  // ######################################################################
})(THREE, THRAPP);
// EO private scope
