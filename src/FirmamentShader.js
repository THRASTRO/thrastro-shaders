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
  
    class FirmamentShader extends THRAPP.CustomRawShader {

        //prefixVertex() {
        //    debugger;
        //}

      constructor(parameters) {
        parameters = parameters || {};
        let defines = parameters.defines || {};
        super(parameters);
        this.isRawShaderMaterial = true;
        this.defines['USE_LOGDEPTHBUF'] = defines['USE_LOGDEPTHBUF'];
        this.defines['USE_LOGDEPTHBUF_EXT'] = defines['USE_LOGDEPTHBUF_EXT'];

        this.uniforms.time = { type: 'f', value: parameters.time || 0.0 },
        this.uniforms.fov = { type: 'f', value: parameters.fov || 4.0 },
        this.uniforms.scale = { type: 'f', value: parameters.scale || 0.0 },
        this.uniforms.minMag = { type: 'f', value: parameters.minMag || 0.0 },
        this.uniforms.maxMag = { type: 'f', value: parameters.maxMag || 0.0 },
        this.uniforms.opacity = { type: 'f', value: parameters.opacity || 0.0 },
        this.uniforms.magFact = { type: 'f', value: parameters.magFact || 0.0 },
        this.uniforms.magScale = { type: 'f', value: parameters.magScale || 0.0 },
        this.uniforms.sizeScale = { type: 'f', value: parameters.sizeScale || 0.0 },

        this.vertexShader = `

        #define varying out
        #define attribute in
        out highp vec4 pc_fragColor;
        #define gl_FragColor pc_fragColor
        #define gl_FragDepthEXT gl_FragDepth

        precision highp float;
        precision highp int;
        #define HIGH_PRECISION
        #define SHADER_NAME CustomLineMaterial
        #define GAMMA_FACTOR 2
        uniform mat4 viewMatrix;
        uniform vec3 cameraPosition;
        uniform bool isOrthographic;
        uniform mat4 modelMatrix;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform mat3 normalMatrix;

        // ***************************************************************
        // ***************************************************************
        #include <common>
        #include <logdepthbuf_pars_vertex>

        uniform float time;
        uniform float scale;
        uniform float min;
        
        uniform float fov;
        uniform float minMag;
        uniform float maxMag;
        
        uniform float norm;
        uniform float fact;
        uniform float opacity;
        
        uniform float magFact;
        uniform float magScale;
        
        uniform float sizeScale;
        
        attribute vec4 position;
        attribute vec4 attributes;
        
        varying vec4 col;
        varying float camdist;
        
        // create constant ensure best performance
        // const float kLogBase10 = 1.0 / log( 10.0 );
        const float kLogBase10 = 0.43429448190325176;
        
        float log10( in float n )
        {
            // calculate log2 to log10
            return log( n ) * kLogBase10;
        }
        
        // RGB <0,1> <- BV <-0.4,+2.0> [-]
        vec4 bv2rgb(float bv, float mag)
        {
            float t;
            float r = 0.0;
            float g = 0.0;
            float b = 0.0;
            if (bv<-0.4) bv=-0.4;
            if (bv> 1.95) bv= 1.95;
            // http://www.vendian.org/mncharity/dir3/starcolor/details.html
                 if ((bv>=-0.40)&&(bv<0.00)) { t=(bv+0.40)/(0.00+0.40); r=0.61+(0.11*t)+(0.1*t*t); }
            else if ((bv>= 0.00)&&(bv<0.40)) { t=(bv-0.00)/(0.40-0.00); r=0.83+(0.17*t)          ; }
            else if ((bv>= 0.40)&&(bv<2.10)) { t=(bv-0.40)/(2.10-0.40); r=1.00                   ; }
                 if ((bv>=-0.40)&&(bv<0.00)) { t=(bv+0.40)/(0.00+0.40); g=0.70+(0.07*t)+(0.1*t*t); }
            else if ((bv>= 0.00)&&(bv<0.40)) { t=(bv-0.00)/(0.40-0.00); g=0.87+(0.11*t)          ; }
            else if ((bv>= 0.40)&&(bv<1.60)) { t=(bv-0.40)/(1.60-0.40); g=0.98-(0.16*t)          ; }
            else if ((bv>= 1.60)&&(bv<2.00)) { t=(bv-1.60)/(2.00-1.60); g=0.82         -(0.5*t*t); }
                 if ((bv>=-0.40)&&(bv<0.40)) { t=(bv+0.40)/(0.40+0.40); b=1.00                   ; }
            else if ((bv>= 0.40)&&(bv<1.50)) { t=(bv-0.40)/(1.50-0.40); b=1.00-(0.47*t)+(0.1*t*t); }
            else if ((bv>= 1.50)&&(bv<1.94)) { t=(bv-1.50)/(1.94-1.50); b=0.63         -(0.6*t*t); }
            return vec4(r, g, b, mag);
        }
        
        void main()
        {
        
            // gl_PointSize = 200.0;
            // mag: -27 to 21 (abs: -17 to 20)
            // mag = (23.0 - position.a) / 50.0;
        
            float mag = position.a;
        
        
        
        /*
            if (mag < norm) {
                mag = 1.0;
                gl_PointSize = pow(abs(1.0 + norm - mag), fact);
            } else if (mag > min) {
                mag = 0.0;
                gl_PointSize = 0.0;
                // discard;
            } else {
                mag = (min - mag) / (min - norm);
                gl_PointSize = pow(abs(mag), fact);
                mag = pow(abs(mag), magScale);
            }
        */
        
        // I am distance away from zero point
        // Camera may be somewhere else
        // get the real distance
        
            col = bv2rgb(attributes.a, 1.0); // mag
            // gl_PointSize *= sizeScale * 2.0;
        
            float pm_ra = attributes.x;
            float pm_dec = attributes.y;
        
            float ra = position.x;
            float dec = position.y;
            float radius = position.z;
        
            // 206264806.2471
            // time is in julian years
            // movement is rads per year
            // hyg pmrarad/decrad (25,26)
            ra += pm_ra * time / 206300000.0;
            dec += pm_dec * time / 206300000.0;
        
            float x = cos(dec) * cos(ra) * radius;
            float y = cos(dec) * sin(ra) * radius;
            float z = sin(dec) * radius;
        
            vec4 pos = vec4(x, y, z, 1.0);
        
            // get distance between camera and star
        
            float factr = 206264.80748432202;
        
            // we probably want to calculate distance from stars to
            // camera in model space, even if the final results are
            // in scaled world coordinates. Otherwise the distance
            // will be in world coordinates and the falloff could
            // be way to fast. Using an uniform is the fastest way!
            // Otherwise we would need a full inverseModelMatrix.
            float camStarDist = distance(cameraPosition / factr, pos.xyz);
        
            // the camera distance can be usefull to enhance view
            // when far away from the center or close to it.
            // keep it in world space or also use factor?
            float camZoomDist = length(cameraPosition);
        
            camdist = camStarDist;
        
            // calculate apparent magnitude (physically accurate)
            float vmag = mag - 5.0 + 5.0 * log10(camStarDist);
        
            // calculate point size from visual magnitude
            gl_PointSize = magFact * exp(- magScale * vmag);
            // apply global point size scale
            gl_PointSize *= sizeScale;
            // make sure the point does not get too big
            gl_PointSize = clamp(gl_PointSize, 0.0, 75.0);
            // zoom field of view
            gl_PointSize *= fov;
        
            // attenuate sizes once we are far away
            gl_PointSize += clamp(camZoomDist / 50000000.0, 0.2, 3.5);
        
            // dim out stars that are very close to the camera
            // mostly needed for our sun to outshine the screen
            col.a *= clamp(camStarDist * 1.0e5, 0.0, 1.0);
        
            // apply min/max magnitude filtering
            col.a -= smoothstep(minMag, maxMag, vmag);
        
            // reduce flickering of very small and faintd stars
            col.a *= smoothstep(0.0, 3.0, pow(gl_PointSize, 0.5));
        
            // if (gl_PointSize < 3.0) col.a = 0.0;a
            // gl_PointSize = max(1.0, gl_PointSize);
        
            // apply global opacity
            col.a *= opacity;
        
            // Only dimm stars very close to the sun
            col.a *= 1.0 - smoothstep(1.0e6, 1.0e9, length(cameraPosition));
                //* (1.0 - smoothstep(1.0e4, 1.0e6, radius));
        
        
            // calculate screen position (the regular way)
            gl_Position = projectionMatrix * modelViewMatrix * pos;
        
            // THREE.ShaderChunk[ 'logdepthbuf_vertex'
            #include <logdepthbuf_vertex>
        
        }
        
        `;

        this.fragmentShader = `
        
        // ***************************************************************
        // ***************************************************************
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
        // ***************************************************************
        // ***************************************************************

        
varying vec4 col;
varying float camdist;

// static background color (transparent)
vec4 bg_col = vec4(0.0, 0.0, 0.0, 0.0);

// ***************************************************************
// ***************************************************************

mat2 rotate = mat2(
	0.707107, 0.707107,
	-0.707107, 0.707107
);

void main()
{

	// get uv coordinates (from -0.5 to +0.5)
	vec2 uv = gl_PointCoord - vec2(0.5, 0.5);

	// calculate distance to center
	float dist = 1.0 - length(uv) * 2.0;

    dist = smoothstep(0.0, 1.0, pow(dist, 6.0));

    float nearf = clamp(camdist * 0.5, 0.0, 1.0);
    float atten = 0.7; float atten2 = 3.0;
    float ax = exp(- pow(abs(uv.x * atten2), atten) ) * (1.0 - pow(abs(uv.y * atten2), atten));
    float bx = exp(- pow(abs(uv.y * atten2), atten) ) * (1.0 - pow(abs(uv.x * atten2), atten));
	// ax = smoothstep(0.0, 1.0, pow(ax, 1.0));
	// bx = smoothstep(0.0, 1.0, pow(bx, 1.0));
    // ax = 1.0 - (1.0 - ax) * (1.0 - pow(dist, 20.9));
    //ax *= pow(dist, 0.05); // attenuate spikes
    //bx *= pow(dist, 0.07); // attenuate spikes
    // bx = 1.0 - (1.0 - bx) * (1.0 - pow(dist, 20.9));
    // ax *= smoothstep(0.0, 1.0, pow(dist, 0.05));
    // bx *= smoothstep(0.0, 1.0, pow(dist, 0.05));

    dist = max(dist, pow(ax, 1.125) * nearf);
	dist = max(dist, pow(bx, 1.125) * nearf);

    // dist = pow(bx, 1.0);

    
	// if (dist > 0.9) dist = 1.0;
	// mix up the final circle color
	// gl_FragColor = mix(col, bg_col, t);
	gl_FragColor = col * pow(dist, 2.0);


	// float twinke = uv.x * uv.y * 2.0;
	// gl_FragColor.a *= 1.0 - clamp(twinke, 0.0, 1.0);

	// THREE.ShaderChunk[ 'logdepthbuf_fragment' ]
	#include <logdepthbuf_fragment>

}

        `;
      }
      // EO constructor
  
      // Add uniforms to material (called during ctor)
      // Do not call, this is for internal use only!
      addUniforms(uniforms) {
        super.addUniforms(uniforms);
      }
      // EO addUniforms
  
      updateUniforms() {
        var self = this,
          uniforms = self.uniforms,
          eclipsers = self.eclipsers,
          stars = self.stars;
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
  