// Based on https://xem.github.io/articles/webgl-guide.html

/** STV = Screen Triangle Vertices */
const STV = new Float32Array([
	-1, -1, // first triangle
	1, -1,
	-1, 1,
	-1, 1, // second triangle
	1, -1,
	1, 1,
]);
/** Screen Triangles Numbers per vertex */
const STNPV = 2;

const log = (...args) => console.log(...args);

/** Graphic Language Program class */
class Glp {
	/**
	 * Glp constructor method
	 * @param {Object} gl - webGL object
	 * @param {Object[]} p - array of webGL program objects
	 */
	constructor(gl, p) {
		Object.assign(this, {
			gl, // webgl rendering context object
			p, // array of programs
			i: 0, // current program
			// variables - internal storage of attributes and uniforms
			// in a per-program array
			aV: p.map(()=>({})),
			uV: p.map(()=>({})),
		});
	}
	/**
	 * Use a program
	 * @param {number} i - index of program
	 */
	use(i) {
		this.i = i;
		this.gl.useProgram(this.p[i]);
		return this;
	}
	// cp() { // current program
	// 	return this.p[this.i];
	// }
	/**
	 * Generic setting function
	 * @param {string} v - variable storage property
	 * @param {string} g - get location GL function name
	 * @param {string} f - set GL function
	 * @param {string} n - name
	 * @param {*} a - arguments
	 */
	v(v, g, f, n, a) {
		const o = this;
		// Check to see if the value exists in storage already
		// ...if not then get location from gl with getAttribLocation or getUniformLocation method
		const d = o[v][o.i][n] || o.gl[g](o.p[o.i], n); // get from storage or get location from GL
		// Set the value based on the name (u) and the arguments (a), using the gl method
		// e.g., vertexAttribXf or uniformXf, where X is the length of the arguments
		o.gl[`${f}${a.length}f`](d, ...a);
		// Store location id values into this object and return them
		return o[v][this.i][n] = d;
	}
	/**
	 * Set an attribute value
	 * An attribute is variable and can contain a float or a vector (vec2, vec3, vec4).
	 * Your program should not exceed 16 attributes to work on all devices.
	 * @param {string} name 
	 * @param  {...any} args 
	 */
	attr(name, ...args) {
		return this.v('aV', 'getAttribLocation', 'vertexAttrib', name, args);
	}
	/**
	 * Set a uniform value
	 * A uniform is constant can contain an int, a float, a vector or a matrix (mat2, mat3, mat4).
	 * Your program should not exceed 128 vertex uniforms and 64 fragment uniforms.
	 * @param {string} name - the name (aka. location) of the uniform
	 * @param {...any} args - some number of arguments
	 */ 
	unif(name, ...args) {
		return this.v('uV', 'getUniformLocation', 'uniform', name, args);
	}
	/** Set Uniforms from an array */
	ua(a) {
		a.forEach(u => this.unif(...u));
	}
	/** Set buffer attribute */
	buff(
		attr,
		data,
		{
			size = STNPV, // # of components per iteration
			type = this.gl.FLOAT, // what type is the data?
			norm = false, // don't normalize the data
			stride = 0, // offset in bytes (0 = move forward size * sizeof(type) each iteration to get the next position)
			offset = 0, // start at beginning of buffer
		} = {}
	) {
		const {gl,p} = this;
		gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
		// TODO: There might be some efficiencies to be gained by not doing ^ the above
		// multiple times for multiple (interleaved) buffers

		// Need to know how big each item is in the data
		const sz = data.BYTES_PER_ELEMENT;
		// Get the position attribute location (an id)
		const id = gl.getAttribLocation(p[this.i], attr);
		// https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer
		gl.vertexAttribPointer(id,	size, type,	norm, stride * sz, offset * sz);
		gl.enableVertexAttribArray(id);
		return id;
	}
	/** Set buffers from an array */
	ba(data, a) {
		a.forEach(b => this.buff(b[0], data, b[1]));
	}
	/** Clear the GL context */
	clear() {
		this.gl.clearColor(0., 0., 0., 1.); // Set the clear color (black)
		// this.gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear the canvas AND the depth buffer.
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
	}
	/** Draw/render to the GL content -- vertSize = how many numbers per vertex */
	draw({
		uniforms = [],
		i = this.i,
		buffs = [],
		verts = STV,
		vertSize = STNPV,
		vertsToDraw,
		type = this.gl.TRIANGLES,
		clear = true,
	}) {
		const o = this;
		o.use(i); // use program
		o.ua(uniforms); // set uniforms
		o.ba(verts, buffs); // set buffers
		if (clear) { o.clear(); }
		// Calculate verts to draw if not defined
		if (vertsToDraw === undefined) {
			vertsToDraw = verts.length / vertSize;
		}
		o.gl.drawArrays(type, 0, vertsToDraw);
		return o;
	}
	/** Draw all programs (in order) */
	drawAll(opt = {}) {
		this.p.forEach((p, i) => this.draw(Object.assign({ i, clear: !i }, opt)));
	}
}

const webglp = {
	/** Glp class */
	Glp,
	/** Screen Triangle Vertices */
	STV,
	/** Screen Triangles Numbers per vertex */
	STNPV,
	/** Get the rendering context from a canvas via the DOM selector */
	getRenderingContext: (selector, antialias = false) => {
		const canvas = document.querySelector(selector);
		const gl = canvas.getContext('webgl', { antialias }); // Get the WebGL rendering context
		if (!gl) {
			alert('Unable to initialize WebGL. Your browser or machine may not support it.');
		}
		return gl;
	},
	/** Load text from a URL using fetch */
	loadText: (url) => {
		return fetch(url).then(response => response.text());
	},
	/** Load multiple shaders */
	loadShaders: (urls) => {
		return Promise.all(urls.map(u => webglp.loadText(u)));
	},
	/**
	 * Compile a webGL shader
	 * @param {Object} gl - webGL object
	 * @param {*} type - type of shader, e.g. gl.VERTEX_SHADER
	 * @param {string} src - source text for shader
	 */
	compileShader: (gl, type, src) => {
		const shader = gl.createShader(type);
		gl.shaderSource(shader, src);
		gl.compileShader(shader);
		return shader;
	},
	/** Make the GL canvas match the window's width and height */
	fullscreen: (gl, win = window) => {
		gl.canvas.width = win.innerWidth;
		gl.canvas.height = win.innerHeight;
		webglp.setViewport(gl);
	},
	/** Set the GL viewport to match the canvas width and height */
	setViewport: (gl) => {
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	},
	/**
	 * Compile a webGL program
	 * @param {Object} gl - webGL object
	 * @param {string[]} shaders - array of shader program text
	 */
	compile: (gl, shaders) => { // shaders = array of text
		// Create the WebGL program
		const program = gl.createProgram();

		const S = [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER];
		const L = ['vertex', 'fragment'];
		shaders.map((t, i) => {
			const s = webglp.compileShader(gl, S[i], t);
			gl.attachShader(program, s);
			log(L[i] + ' shader:', gl.getShaderInfoLog(s) || 'OK');
		});

		gl.linkProgram(program);
		gl.useProgram(program);
	
		log('program:', gl.getProgramInfoLog(program) || 'OK');

		return program;
	},
	/**
	 * Initialize - Create canvas rendering context, load shaders, compile, and return a Glp object
	 * @param {string|object} a - A DOM selector string for the canvas, or a webGL object
	 * @param {String[]} urlsArr - Array of vertex and fragment shader URLs
	 * @param {Object} options - options, e.g. fullscreen
	 */
	init: async (a, urlsArr, { fullscreen } = {}) => {
		const gl = (typeof a === 'string') ? webglp.getRenderingContext(a) : a;
		// Do aliases?
		// const aliases = {attachShader: 'aS'};
		// for (const k in aliases) {
		// 	gl[aliases[k]] = gl[k];
		// }
		const promises = urlsArr.map(urls => (
			webglp.loadShaders(urls).then((s) => webglp.compile(gl, s))
		));
		const programs = await Promise.all(promises);
		// const program = await webglp.loadShaders(urlsArr[0]).then((s) => webglp.compile(gl, s));
		// log(programs);
		if (fullscreen) {
			webglp.fullscreen(gl);
		}
		return new Glp(gl, programs);
	}
};

export default webglp;
