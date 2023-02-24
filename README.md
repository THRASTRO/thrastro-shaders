# THREE.js shaders for astronomy

This is a package of shaders and extensions for THREE.js to accurately
render various astronomical objects. From planets with atmosphere and
rings, to star clouds and planetary or other kepler trajectories.

## CustomShader

This is our base implementation to extend internal THREE.js shaders
and materials further. The vendor base shader (and raw shader) have
seen tremendous improvement to be extended in the past, I still need
to patch the original THREE.js code slightly in order to extend the
shaders as needed. This is what this base shader is enabling.

It basically allows us to insert specific shader code at specific
position, that are identified by regex matching. This has unfortunately
a high chance to fail on future core updates. So this package is only
compatible with specific THREE.js versions that I patched up!

The following classes are exported from this package:

- THRAPP.CustomMaterial: base with dynamic superclass (internal use)
- THRAPP.CustomRawShader: extends `THREE.RawShaderMaterial`
- THRAPP.CustomShaderMaterial: extends `THREE.ShaderMaterial`
- THRAPP.CustomMeshBasicMaterial: extends `THREE.MeshBasicMaterial`
- THRAPP.CustomMeshLambertMaterial: extends `THREE.MeshLambertMaterial`
- THRAPP.CustomMeshPhongMaterial: extends `THREE.MeshPhongMaterial`
- THRAPP.CustomMeshPhysicalMaterial: extends `THREE.MeshPhysicalMaterial`

## EclipseShader

Extending from `CustomMeshPhysicalMaterial` it is intended to render
planets or other objects that can be shaded by other objects. Normally
in 3D you would use a shadow-map or a similar technique to do shadows.
But for astronomical objects this approach is not really feasible, since
the distance between the eclipser (the object that blocks the light) and
the object being shaded and the light source are simply too far away.

The most efficient and accurate way to properly do shadows in this case
is IMO to let the shader directly know of potential objects that could
produce any shadow on the surface. This means we need to register any
potential eclipser with the shader, similarly of all shaders knowing
of all lights that contribute to the illumination.

On the shader level it will add an additional calculation, actually
a for loop over all potential eclipsers, for the illumination step
of each light. This means it doesn't scale well with many lights and
many potential eclipsers, but this shouldn't be a big issue with
regular astronomical objects, since you mostly have only one light
source and most objects aren't even capable to produce a shadow.

On the other hand it will produce great details since the calculation
is done on the fragment level, so zooming in isn't really an issue.
One still has to keep the eclipser positions up to date in terms of
time and camera position. This can lead to visual jitter in the frame
rendering. This can be due to out of sync positional updates or also
due to floating error (specially if you use 32bit floats, e.g. es2).

Note: currently we are forcing opengl es3 in order to get 64bit floats,
which improves the rendering details by a lot. This may cause problems
with some browsers, but I believe it is the right way forward. Some
browsers may only need some flags to be enabled to support it.

http://www.ocbnet.ch/thrastro-shaders/demo/demo-eclipser.html

## PlanetShader

This shader extends `EclipseShader` and adds a night texture and a
ring-shadow texture for planets with rings around. It basically adds
further shading capabilities to the `EclipseShader`. The `nightMap`
is a texture similar to `map`, but is only shown when no other light
reaches the fragment. Currently it is a bit undefined if the night
map should also be emissive during eclipses or not. This is still a
field I'm investigating (preferably having a runtime switch).

A bit more advanced is the usage of the `ringMap` parameter and it
has a few limitations. First and foremost the shader only supports
a single texture here, although the `GroundShader` does support
multiple rings to have shading. Without a map the shadow will range
from inner to outer radius (with some gradient on the outskirts).
This is good enough for non realistic planetary rings, but for e.g.
Saturn we want to have a more detailed shading. Also we don't really
know any planet with two distinct rings yet, so seems a fair tradeoff.

http://www.ocbnet.ch/thrastro-shaders/demo/demo-planet.html

## GroundShader

The `GroundShader` adds atmospheric (rayleigh and mie) scattering to
the `PlanetShader`. It gives a distinct gradient mainly on the daylight
terminator. I implemented it on the base of Nvidia GPU Gems 2 Chapter 16:

https://developer.nvidia.com/gpugems/gpugems2/part-ii-shading-lighting-and-shadows/chapter-16-accurate-atmospheric-scattering

http://www.ocbnet.ch/thrastro-shaders/demo/demo-ground.html

## SkyShader

A highly specific shader only inheriting from `THRAPP.CustomMaterial`. It
is also implemented according to the mentioned Nvidia GPU Gems 2 Chapter 16.
It renders a sphere behind a planet representing the mir and rayleigh
scattering of the atmosphere above a planet's surface. As such this shader
needs to be rendered only on the backfaces of the geometry. Since the
calculation is expensive it only calculates the effect on each vertex and
interpolates from there for fragments. This means the geometry needs to
have a lot of vertices to get good results. This is still a better tradeoff
than calculating the effect for every fragment. We should revisit this
decision once ray-tracing becomes a (well supported) reality for WebGL.

http://www.ocbnet.ch/thrastro-shaders/demo/demo-atmosphere.html

### FirmamentShader

Another highly specialized shader to render a star point cloud. It
needs to be feed with optimized data that is currently generated via
custom perl scripts, which are not yet published on GitHub (ToDo).

http://www.ocbnet.ch/thrastro-shaders/demo/demo-firmament.html

## RingShader

This shader is used to render a "donut" around a planet.

http://www.ocbnet.ch/thrastro-shaders/demo/demo-planet.html

### OrbitalsShader

Specialized shader to render instanced kepler orbital trails.

http://www.ocbnet.ch/thrastro-shaders/demo/demo-orbitals.html
