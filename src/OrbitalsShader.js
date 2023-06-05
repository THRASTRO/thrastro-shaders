/*
    Copyright 2017-2023 Marcel Greter
    https://www.github.com/mgreter
*/

// https://meetingorganizer.copernicus.org/EPSC-DPS2011/EPSC-DPS2011-996.pdf
// https://github.com/astroswarm/skychart/blob/409feca34e5eecb539933eb935fb9a490a71bbf9/skychart/cu_smallsat.pas
// https://www.cloudynights.com/topic/699134-incorrect-positions-of-planetary-satellites-in-cartes-du-ciel-and-stellarium/


if (!window.THRAPP) {
  window.THRAPP = {};
}

// private scope
(function (THREE, THRAPP) {
  "use strict";

  class OrbitalsShader extends THRAPP.CustomRawShader {

    constructor(parameters) {
      super(parameters);
      //this.parameters.asd = 123;
      // this.defines['ELEMENTS_VSOP'] = 1;
      this.defines['USE_LOGDEPTHBUF'] = 1;
      this.defines['USE_LOGDEPTHBUF_EXT'] = 1;
      this.isRawShaderMaterial = true;

      this.uniforms.time = { type: 'f', value: parameters.time || 0.0 };
      this.uniforms.scale = { type: 'f', value: parameters.scale || 1.0 };
      this.uniforms.lucency = { type: 'f', value: parameters.lucency || 0.75 };
      this.uniforms.attenuate = { type: 'f', value: parameters.attenuate || 0.0 };
      this.uniforms.trailStart = { type: 'f', value: parameters.trailStart || 0.0 };
      this.uniforms.trailLength = { type: 'f', value: parameters.trailLength || 1.0 };

      if (this.defines['LAPLACE_PLANE'] != null) {
        this.uniforms.laplaceEpoch = { type: 'f', value: parameters.laplaceEpoch || 0.0 };

      }

      this.vertexShader = `

        #define varying out
        #define attribute in
        out highp vec4 pc_fragColor;
        #define gl_FragColor pc_fragColor
        #define gl_FragDepthEXT gl_FragDepth

        precision highp float;
        precision highp int;
        #define HIGH_PRECISION
        #define GAMMA_FACTOR 2
        uniform mat4 viewMatrix;
        uniform vec3 cameraPosition;
        uniform bool isOrthographic;
        uniform mat4 modelMatrix;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform mat3 normalMatrix;

        // ***************************************************************
        // orbit.vert
        // ***************************************************************
        #include <common>
        #include <logdepthbuf_pars_vertex>

        // Gravitational Constant
        #ifdef USE_GLOBAL_GM
        uniform float GM;
        #else
        attribute float GM;
        #endif
        
        // Gravitational Constant
        #ifdef USE_GLOBAL_EPOCH
        uniform float epoch;
        #else
        attribute float epoch;
        #endif

        // time in julian days
        // uniform float time;
        uniform float time;
        
        //uniform float itime;
        //uniform float ftime;
        
        // global lucency value
        uniform float lucency;
        uniform float attenuate;
        
        // scale the positions
        uniform float scale;
        uniform float trailLength;
        uniform float trailStart;
        
        // from interleaved buffer
        //attribute vec2 epoch;
        attribute vec3 color;
        attribute vec3 l_orbitals;
        attribute vec3 h_orbitals;
        attribute float rotate;

        // dynamic laplace plane
        #ifdef LAPLACE_PLANE
        attribute vec4 laplace;
        uniform float laplaceEpoch;
        #endif

        attribute vec2 precession;
        
        // position around ellipse
        attribute float position;
        attribute float position3;

        // pass to fragment shader
        varying vec4 fragColor;

// ***************************************************************
// calculate position from VSOP elements (alkhqp)
// this function is adapted from VSOP2013.f
// ***************************************************************
#ifdef ELEMENTS_VSOP

	vec3 orb2cart(float arc, float a, float l, float k, float h, float q, float p)
	{

		float fi = sqrt(1.0 - k*k - h*h);
		float ki = sqrt(1.0 - q*q - p*p);
		float u = 1.0 / (1.0 + fi);
		vec2 z = vec2(k, h);

		float ex = length(z);
		float ex2 = ex * ex;
		float ex3 = ex2 * ex;

    float n = sqrt(GM / a / a / a);
    // orbit._n = sqrt(orbit._G / pow(orbit._a, 3.0));
		float gl = mod(l + (time - epoch) * n + arc, PI2);
		float gm = gl - atan(h, k);
		float e = gl + (ex - 0.125 * ex3) * sin(gm)
				+ 0.5 * ex2 * sin(2.0 * gm)
				+ 0.375 * ex3 * sin(3.0 * gm);

		vec2 z3;
		vec2 zteta;
		float rsa = 0.0;

		for (int count = 0; count < 10; count ++) {
			zteta.x = cos(e);
			zteta.y = sin(e);
			z3.x = k*zteta.x+h*zteta.y;
			z3.y = k*zteta.y-h*zteta.x;
			float dl = gl - e + z3.y;
			rsa = 1.0 - z3.x;
			// not sure if the branching is more expensive
			// what we gain from not running the whole loop
			if (abs(dl) < 1e-15) break;
			e += dl / rsa;
		}

		// optimized for performance
		float ztox = (zteta.x - z.x + z.y * u * z3.y) / rsa;
		float ztoy = (zteta.y - z.y - z.x * u * z3.y) / rsa;

		float r = a * rsa;
		float m = p * ztox - q * ztoy;

		return vec3(
			r * (ztox - 2.0 * p * m),
			r * (ztoy + 2.0 * q * m),
			-2.0 * r * ki * m
		);

	}

// ***************************************************************
// calculate position from orbital elements
// ***************************************************************
#else

	vec3 orb2cart(float arc, float e, float a, float i, float O, float w, float M0)
	{

		// ToDo: time should be in double precision
		// needs two uniforms: 32ipart and 32fpart

		// Calculate mean anomaly M(t)
		// with u for sun as central body
		float dt = time - epoch; // + 0.5 / 365.25;

    // dynamic laplace plane
		#ifdef LAPLACE_PLANE
			// adjust for laplace precession
			//float rot_O = (time - laplaceEpoch) * laplace.z;
			// rot_O -= (laplaceEpoch * laplace.z);
			//float rot_W = (time - laplaceEpoch) * laplace.w;
			// rot_W -= (laplaceEpoch * laplace.w);
			// rotate into laplace plane
			//O -= laplace.x;
      //w -= laplace.y;
      //i -= laplace.z;

			//w += rot_W;
		#endif

    O += dt * precession.x;
    w += dt * precession.y;

		// calculate orbital period factor
		float n = sqrt(pow(a, 3.0) / GM);

		// M = CYCLE(orbit._n * (dt - orbit._T - epoch))
		float M = M0 + dt / n;
    // M += 0.1758;


		// solve the kepler equation
		// M(t) = E(t) - s * sin(E)
		// for the eccentric anomaly E(t)
		// this must be done iteratively
		float E = mod(M, PI2);

		// M = orbit._n * (dt - orbit._T - epoch);

		// we can either add arc first, to adjust
		// the offset with the actual speed the
		// object would travel. But this gives
		// a bad distribution of points on the
		// ellipsis. Comet icarus would have a
		// very rough bump on the periapsis.

		// Newton-Raphson method to solve
		// f(E) = M - E + e * sin(E) = 0
		for (int it = 0; it < 20; ++it) {
			float f = M - E + e * sin(E);
			float dfdE = e * cos(E) - 1.0;
			float dE = f / dfdE;
			E -= dE; // next iteration
		}

		// add offset now to distribute
		// the vertices accordingly
		E = mod(E, PI2) + arc;
		// E = 4.769749851054432 + arc;

		// Obtain the true anomaly vector(t)
		float v1 = sqrt(1.0 + e) * sin(E/2.0);
		float v2 = sqrt(1.0 - e) * cos(E/2.0);
		float m = 2.0 * atan( v1, v2 );

		// Distance to true anomaly position
		float r = a * (1.0 - e * cos(E));

		// Factors for projection
		float px = r * cos(m);
		float py = r * sin(m);

		// Precalculations
		float cosW = cos(w);
		float cosO = cos(O);
		float cosI = cos(i);
		float sinW = sin(w);
		float sinO = sin(O);
		float sinI = sin(i);

		float sinWcosO = sinW*cosO;
		float sinWsinO = sinW*sinO;
		float cosWcosO = cosW*cosO;
		float cosWsinO = cosW*sinO;

		float FxX = (cosW*cosO - sinW*sinO*cosI);
		float FyX = (cosW*sinO + sinW*cosO*cosI);
		float FxY = (cosW*sinO*cosI + sinW*cosO);
		float FyY = (cosW*cosO*cosI - sinW*sinO);
		float FzX = (sinW*sinI);
		float FzY = (cosW*sinI);

		// calculate cartesian coordinates
		float x = + px * FxX - py * FxY;
		float y = + px * FyX + py * FyY;
		float z = + px * FzX + py * FzY;

		vec3 coord = vec3(x, y, z);

		// dynamic laplace plane
		#ifdef LAPLACE_PLANE

			// laplace precession
			float node = (laplace.x + PI * 0.5);
			float incl = (PI * 0.5 - laplace.y);

			mat3 rotX = mat3(
				1.0, 0.0, 0.0,
				0.0, cos(incl), sin(incl),
				0.0, - sin(incl), cos(incl)
			);
//
//			mat3 rotY = mat3(
//				cos(ay), 0.0, sin(ay),
//				0.0, 1.0, 0.0,
//				- sin(ay), 0.0, cos(ay)
//			);
//
      mat3 rotZ = mat3(
				cos(node), sin(node), 0.0,
				- sin(node), cos(node), 0.0,
				0.0, 0.0, 1.0
			);
//return coord;
			return rotZ * rotX * coord;
			// return coord * rotX * rotZ;

		#else

			return vec3(
				x, y, z
			);

		#endif


		// Get derivates for velocity
		// float vf = sqrt(GM * a) / r;
		// float vx = vf * - sin(E);
		// float vy = vf * sqrt(1.0 - e*e) * cos(E);
		// Calculate velocity
		// return vec3(
		// 	+ vx * FxX - vy * FxY,
		// 	+ vx * FyX + vy * FyY,
		// 	+ vx * FzX + vy * FzY,
		// );

	}

#endif

// ***************************************************************
// ***************************************************************

void main()
{

	// attenuate the more away from current position
	// fragColor = vec4(color, 0.35 - 0.275 * pow(abs(position), .1));

    fragColor = vec4(color, 1.0); // vec4(color, (1.0 - position) * 0.75 + 0.25);

	// attenuate the orbit to create a trail (position is linear from 0 to 1)
	fragColor.a *= (pow(exp(-position * attenuate), 2.0)) * lucency;

    float foo = 1.0 + smoothstep(0.9, 1.0, position) * (step(attenuate, 0.0) - 1.0);

    fragColor.a *= foo;

    //fragColor.a *= (1.0 - position);

	// calculate the actual position
	vec3 pos = orb2cart((position * - trailLength) * PI2 + (trailStart) * PI2,
		l_orbitals[0], l_orbitals[1], l_orbitals[2],
		h_orbitals[0], h_orbitals[1], h_orbitals[2]
	);

	// calculate the final world position to be drawn
	gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 );

	// THREE.ShaderChunk[ 'logdepthbuf_vertex'
	#include <logdepthbuf_vertex>

}

// ***************************************************************
// ***************************************************************


        `;

      this.fragmentShader = `
        #define varying in
        out highp vec4 pc_fragColor;
        #define gl_FragColor pc_fragColor
        #define gl_FragDepthEXT gl_FragDepth

        // ***************************************************************
        // orbit.frag
        // ***************************************************************
        precision highp float;
        precision highp int;
        #include <common>
        #include <logdepthbuf_pars_fragment>
        
        uniform float lucency;
        varying vec4 fragColor;
        
        // ***************************************************************
        // ***************************************************************

        void main()
        {

            // passed from vertex shader
            gl_FragColor = fragColor;
        
            // we use translucency, since this is less error prone
            // in case you forgot to define opacity (default is 0)
            // gl_FragColor.a *= 1.0 - lucency;
        
             // gl_FragColor.a = max(gl_FragColor.a, 0.0);
            
        
            // THREE.ShaderChunk[ 'logdepthbuf_fragment' ]
            #include <logdepthbuf_fragment>

        }
        
        // ***************************************************************
        // ***************************************************************
        
        `;
      // Hookup optional dat.gui
      if (!parameters.datgui) return;
      var gui = parameters.datgui;
      var uniforms = this.uniforms;
      if (parameters.name) gui = gui.addFolder(parameters.name)
      gui.add(uniforms.lucency, 'value', 0, 1).step(0.001).name('lucency');
      gui.add(uniforms.attenuate, 'value', 0, 9).step(0.001).name('attenuate');
      gui.add(uniforms.trailStart, 'value', 0, 1).step(0.001).name('trailStart');
      gui.add(uniforms.trailLength, 'value', -1, 1).step(0.001).name('trailLength');
    }
    // EO constructor

    // Add a new light source
    addOrbital(orbital) {
      //        if (!Array.isArray(stars)) stars = [stars];
      //        for (var i = 0; i < stars.length; i++) {
      //          this.stars.push(stars[i]);
      //          this.uniforms.lightPos.value.push(new THREE.Vector3());
      //          this.uniforms.lightSize.value.push((stars[i].radius || 0) * 2);
      //        }
      //        this.defines["NUM_STARS"] += stars.length;
      //        this.needsUpdate = true;
    }
    // EO addStar

    // Add uniforms to material (called during ctor)
    // Do not call, this is for internal use only!
    addUniforms(uniforms) {
      super.addUniforms(uniforms);
      // uniforms.trail = { type: 'f', value: 0 };
      // uniforms.scale = { type: 'f', value: 0 };
      // uniforms.lucency = { type: 'f', value: 0 };


      // uniforms.eclipserSize = { type: "fv1", value: [] };
      // uniforms.eclipserPos = { type: "v3v", value: [] };
      // uniforms.lightSize = { type: "fv1", value: [] };
      // uniforms.lightPos = { type: "v3v", value: [] };
      // uniforms.laserSize = { type: "f", value: 5e-7 };
      // uniforms.bodyRadius = { type: "f", value: 5e-7 };
    }
    // EO addUniforms

    updateUniforms() {
      var self = this,
        uniforms = self.uniforms,
        eclipsers = self.eclipsers,
        stars = self.stars;
      super.updateUniforms();
      // if (self.pbody) {
      //   self.pbody.updateMatrix();
      //   mat4.copy(self.pbody.matrixWorld).invert();
      // }
      // // Update eclipser positions
      // for (var i = 0; i < eclipsers.length; i += 1) {
      //   uniforms.eclipserPos.value[i].setFromMatrixPosition(eclipsers[i].matrixWorld)
      //   uniforms.eclipserPos.value[i].applyMatrix4(mat4);
      // }
      // // Update star positions
      // for (var i = 0; i < stars.length; i += 1) {
      //   uniforms.lightPos.value[i].setFromMatrixPosition(stars[i].matrixWorld)
      //   uniforms.lightPos.value[i].applyMatrix4(mat4);
      // }
    }
    // EO updateUniforms

    getVertexChunks() {
      var chunks = super.getVertexChunks();
      //***********************************************
      //***********************************************
      chunks.push({
        after: /<common>/,
        shader: [
        ],
      });

      chunks.push({
        before: /<begin_vertex>/,
        shader: [
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
        ],
      });
      //***********************************************
      //***********************************************
      chunks.push({
        before: /<aomap_fragment>/,
        shader: [],
      });
      chunks.push({
        after: /<aomap_fragment>/,
        shader: [
        ],
      });
      //***********************************************
      //***********************************************
      chunks.push({
        after: /vec3 outgoingLight/,
        shader: [
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

  OrbitalsShader.prototype.lucency = null;
  OrbitalsShader.prototype.attenuate = null;
  OrbitalsShader.prototype.trailLength = null;
  OrbitalsShader.prototype.trailStart = null;
  OrbitalsShader.prototype.trailEnd = null;

  // assign class to global namespace
  THRAPP.OrbitalsShader = OrbitalsShader;

  // ######################################################################
  // ######################################################################
})(THREE, THRAPP);
  // EO private scope
