# webglp

**A small, simple webGL library to setup and render multiple GLSL programs**

*webglp = Web Graphic Language Program library (Pronounced "web glip", "web glap"?)*

## Install

* Clone the repo and use `webglp.js`, or...
* Using npm: `npm install https://github.com/rocket-boots/webglp#master` (can replace *master* with a release version)

webglp has *no* dependencies.

## How to Use it

Put a canvas in your HTML: `<canvas id="canvas"></canvas>`.

Put your shaders into `.glsl` files. You'll need at least one vertex shader and one fragment shader. 

Import `webglp` and 

```js
import webglp from './webglp.js';
```

The `webglp` object contains a number of helpful functions, some constants, and a `Glp` class (with its own helpful methods).

Define your shaders in an array:

```js
const SHADERS = [
	['./vert-shader-1.glsl', './frag-shader-1.glsl'], // 0
	['./vert-shader-2.glsl', './frag-shader-2.glsl'], // 1
	// etc.
];
```

Each duo of vert and frag shaders will become one webGL *program*.

Initializing webglp will setup the webGL context on the canvas, load your shaders, and build the necessary programs.

```js
	// Initialize and build your "glp"
	const glp = await webglp.init('#canvas', SHADERS);
	// Optionally make it fullscreen
	webglp.fullscreen(glp.gl);
```

Your `glp` contains the webGL context (`glp.gl`), and an array of programs (`glp.p`). It is setup to use one program at a time, which it tracks with an index (`glp.i`).

When it is time to render (usually inside a `requestAnimationFrame` loop), you'll want to setup any uniforms and call a draw method.

```js
	const uniforms = [
		['viewerPosition', x, y, z], // vec3
		['iTime', t],
		['iResolution', gl.canvas.width, gl.canvas.height], // vec2
		// etc.
	];
	const verts = new Float32Array([ 0, 0, /* ... */]);
	const buffs = [
		['position', { size: 2 }],
	];
	// If you have only one program:
	glp.draw({ uniforms, buffs, verts, /* other options */ });
	// Draw can be chained for multiple programs:
	glp.draw({ uniforms, buffs, verts, i: 0 })
		.draw({ uniforms, buffs, verts, i: 1, clear: false })
		.draw({ uniforms, buffs, verts, i: 2, clear: false });
	// If you have multiple programs and are doing everything
	// with two screen triangles (i.e., for implementations
	// like seen in ShaderToys) then you can use this:
	glp.drawAll({ uniforms, buffs });
```

**But that's not all!** There are also methods for adding attributes, buffers, etc. See the source for more details.

## Inspiration

Thanks to Xem's excellent webGL guide: https://xem.github.io/articles/webgl-guide.html and https://github.com/xem/webgl-guide/blob/gh-pages/lib/webgl.js

## In Use

* https://github.com/rocket-boots/webgl-starfield
* (add your project here)

