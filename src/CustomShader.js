/*
    Copyright 2017-2022 Marcel Greter
    https://www.github.com/mgreter
*/

if (!window.THRAPP) {
  window.THRAPP = {};
}

// ######################################################################
// Base class Implementation for all of our custom shaders.
// ######################################################################

// private scope
(function (THREE, THRAPP) {
  "use strict";

  // ######################################################################
  // ######################################################################
  // Function to create a mixin class
  class CustomRawShader extends THREE.RawShaderMaterial {
    constructor(parameters) {
      parameters = parameters || {};
      parameters.glslVersion = "300 es";
      super(parameters);
    }
    // type = "CustomRawShader";
    vertexShaderPrefix(render) {
      return '';
    }
  }

  // ######################################################################
  // ######################################################################
  // Helper class for materials depending on mesh
  // E.g. we get world position or radius from it
  class Mesh extends THREE.Mesh {
    constructor(geometry, material) {
      super(geometry, material);
      material.pbody = this;
    }
  }

  // ######################################################################
  // ######################################################################

  // helper for shader chunk manipulation
  function insertChunk(chunks, idx, chunk, replace) {
    var insert = chunk.shader || "",
      replace = replace ? 1 : 0;
    if (Array.isArray(insert)) insert = insert.join("\n");
    return chunks.splice(idx, replace, insert);
  }
  // EO insertChunk

  // helper for shader chunk manipulation
  function insertChunks(inserts, chunks) {
    if (!inserts || !inserts.length) return;
    for (var i = 0; i < inserts.length; i++) {
      var found = false,
        chunk = inserts[i];
      for (var n = 0; n < chunks.length; n++) {
        if (chunk.after && chunk.after.test(chunks[n])) {
          insertChunk(chunks, n + 1, chunk, false);
          n += 2; // skip added
          found = true;
        } else if (chunk.before && chunk.before.test(chunks[n])) {
          insertChunk(chunks, n, chunk, false);
          n += 2; // skip added
          found = true;
        } else if (chunk.replace && chunk.replace.test(chunks[n])) {
          insertChunk(chunks, n, chunk, true);
          n += 1; // skip added
          found = true;
        }
      }
      // this only happens if source changed or dev error
      if (!found) throw Error("Shader Chunk not found");
    }
  }
  // EO insertChunks

  // ######################################################################
  // ######################################################################

  const includePattern = /^[ \t]*#include +<([\w\d./]+)>/gm;

  // Helper to replace include occurrence
  function includeReplacer(match, include) {
    const string = THREE.ShaderChunk[include];

    if (string === undefined) {
      throw new Error("Can not resolve #include <" + include + ">");
    }

    // Recursively resolve includes
    return resolveIncludes(string);
  }
  // EO includeReplacer

  // Entry function to resolve includes
  function resolveIncludes(string) {
    return string.replace(includePattern, includeReplacer);
  }
  // EO resolveIncludes

  // ######################################################################
  // ######################################################################

  THREE.ShaderLib.none = {
    uniforms: {},
    vertexShader: '',
    fragmentShader: '',
  };

  // Function to create a mixin class
  function CustomMaterial(SuperClass, typename, lib) {
    class CustomMaterial extends SuperClass {
      constructor(parameters) {
        parameters = parameters || {};
        super(parameters);
        this.type = typename;
        var base = THREE.ShaderLib[lib];
        this.defines = this.defines || [];
        // Create a copy of the base vertex shader
        var shaderVerts = base.vertexShader.split(/\n+/);
        insertChunks(this.getVertexChunks(), shaderVerts);
        // Create a copy of the base fragment shader
        var shaderFrags = base.fragmentShader.split(/\n+/);
        insertChunks(this.getFragmentChunks(), shaderFrags);
        // Assign the shaders by going through overloadable methods
        this.vertexShader = this.getVertexShader(shaderVerts.join("\n"));
        this.fragmentShader = this.getFragmentShader(shaderFrags.join("\n"));

        // Resolve includes to extend shader sub-chunks
        this.vertexShader = resolveIncludes(this.vertexShader);
        this.fragmentShader = resolveIncludes(this.fragmentShader);

        // Create a copy of the base vertex shader
        var shaderSubVerts = this.vertexShader.split(/\n+/);
        insertChunks(this.getVertexSubChunks(), shaderSubVerts);
        // Create a copy of the base fragment shader
        var shaderSubFrags = this.fragmentShader.split(/\n+/);
        insertChunks(this.getFragmentSubChunks(), shaderSubFrags);

        // Create the final joined snippets to compile
        this.vertexShader = shaderSubVerts.join("\n");
        this.fragmentShader = shaderSubFrags.join("\n");

        // Merge uniforms passed by parameters with the base material uniforms
        this.uniforms = THREE.UniformsUtils.merge([
          parameters.uniforms,
          base.uniforms,
        ]);

        // Add uniforms for specializations
        this.addUniforms(this.uniforms);
        // Set the material parameters
        this.setValues(parameters);
      }
      // EO constructor

      // Set defines during setup
      setDefines(defines) {
        for (var key in defines) {
          this.defines[key] = defines[key];
        }
      }
      // EO constructor

      // Overload to alter shader-code
      getFragmentShader(shader) {
        return shader;
      }
      // EO getFragmentShader

      // Overload to alter shader-code
      getVertexShader(shader) {
        return shader;
      }
      // EO getVertexShader

      // Overload to add chunks
      getVertexChunks() {
        return [];
      }
      // EO getVertexChunks

      // Overload to add chunks
      getFragmentChunks() {
        return [];
      }
      // EO getFragmentChunks

      // Overload to add chunks
      getVertexSubChunks() {
        return [];
      }
      // EO getVertexSubChunks

      // Overload to add chunks
      getFragmentSubChunks() {
        return [];
      }
      // EO getFragmentSubChunks

      // Method to add uniforms during setup
      addUniforms(uniforms) {}

      // Called during render to update stuff
      updateUniforms() {}
    }

    // Return mixed in class
    return CustomMaterial;
  }

  // ######################################################################
  // ######################################################################

  // assign class to global namespace
  THRAPP.CustomMaterial = CustomMaterial;

  // ######################################################################
  // ######################################################################

  class CustomShaderMaterial extends CustomMaterial(
    THREE.ShaderMaterial,
    "CustomShaderMaterial",
    "basic"
  ) {
    constructor(parameters) {
      super(parameters);
    }
  }

  class CustomMeshBasicMaterial extends CustomMaterial(
    THREE.MeshBasicMaterial,
    "CustomMeshBasicMaterial",
    "basic"
  ) {
    constructor(parameters) {
      super(parameters);
    }
  }

  class CustomMeshLambertMaterial extends CustomMaterial(
    THREE.MeshLambertMaterial,
    "CustomMeshLambertMaterial",
    "lambert"
  ) {
    constructor(parameters) {
      super(parameters);
    }
  }

  class CustomMeshPhongMaterial extends CustomMaterial(
    THREE.MeshPhongMaterial,
    "CustomMeshPhongMaterial",
    "phong"
  ) {
    constructor(parameters) {
      super(parameters);
    }
  }

  class CustomMeshPhysicalMaterial extends CustomMaterial(
    THREE.MeshPhysicalMaterial,
    "CustomMeshPhysicalMaterial",
    "physical"
  ) {
    constructor(parameters) {
      super(parameters);
    }
  }

  // ######################################################################
  // ######################################################################

  // Small helper class
  THRAPP.Mesh = Mesh;

  // assign class to global namespace
  THRAPP.CustomRawShader = CustomRawShader;
  THRAPP.CustomShaderMaterial = CustomShaderMaterial;
  THRAPP.CustomMeshBasicMaterial = CustomMeshBasicMaterial;
  THRAPP.CustomMeshLambertMaterial = CustomMeshLambertMaterial;
  THRAPP.CustomMeshPhongMaterial = CustomMeshPhongMaterial;
  THRAPP.CustomMeshPhysicalMaterial = CustomMeshPhysicalMaterial;

  // ######################################################################
  // ######################################################################

  THRAPP.StartStaticForLoop = function(name, len) {
    return [
      `#if ${len} > 0`,
      `#if ${len} > 1`,
      `  for ( int ${name} = 0; ${name} < ${len}; ++ ${name} ) {`,
      "#else",
      `  { int ${name} = 0;`,
      "#endif",
      "",
    ].join("\n");
  }

  THRAPP.EndStaticForLoop = function(name, len) {
    return [
      "  }",
      "#endif",
      "",
    ].join("\n");
  }

  // ######################################################################
  // ######################################################################
})(THREE, THRAPP);
// EO private scope
