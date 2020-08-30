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

class Glp {
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
	use(i) {
		this.i = i;
		this.gl.useProgram(this.p[i]);
		return this;
	}
	// cp() { // current program
	// 	return this.p[this.i];
	// }

	/** Generic setting function -- v = variable storage property, g = get location GL function name, f = set GL function, n = name, a = arguments */
	v(v, g, f, n, a) {
		const o = this;
		const u = o[v][o.i][n] || o.gl[g](o.p[o.i], n); // get from storage or get location from GL
		o.gl[`${f}${a.length}f`](u, ...a); // set the values
		return o[v][this.i][n] = u; // store values and return
	}
	// An attribute is variable and can contain a float or a vector (vec2, vec3, vec4).
	// Your program should not exceed 16 attributes to work on all devices.
	attr(name, ...args) {
		return this.v('aV', 'getAttribLocation', 'vertexAttrib', name, args);
		// const a = this.aV[this.i][name] || this.gl.getAttribLocation(this.p[this.i], name);
		// this.gl[`vertexAttrib${args.length}f`](a, ...args);
		// return this.aV[this.i][name] = a;
	}
	// A uniform is constant can contain an int, a float, a vector or a matrix (mat2, mat3, mat4).
	// Your program should not exceed 128 vertex uniforms and 64 fragment uniforms.
	unif(name, ...args) {
		return this.v('uV', 'getUniformLocation', 'uniform', name, args);
		// const u = this.uV[this.i][name] || this.gl.getUniformLocation(this.p[this.i], name);
		// this.gl[`uniform${args.length}f`](u, ...args);
		// return this.uV[this.i][name] = u;
	}
	/* Set Uniforms from an array **/
	ua(a) {
		a.forEach(u => this.unif(...u));
	}
	buff(
		attr,
		data,
		{
			size = STNPV, // # of components per iteration
			type = this.gl.FLOAT, // what type is the data?
			norm = false, // don't normalize the data
			stride = 0, // offset in bytes (0 = move forward size * sizeof(type) each iteration to get the next position)
			offset = 0, // start at beginning of buffer
		}
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
	/** size = how many numbers per vertex */
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
		if (vertsToDraw === undefined) {
			vertsToDraw = verts.length / vertSize;
		}
		o.gl.drawArrays(type, 0, vertsToDraw);
		return o;
	}
	drawAll(uniforms) { // only works with changing uniforms right now
		this.p.forEach((p, i) => this.draw({ uniforms, i, clear: !i }));
	}
}

const webglp = {
	Glp,
	STV,
	STNPV,
	getRenderingContext: (selector, antialias = false) => {
		const canvas = document.querySelector(selector);
		const gl = canvas.getContext('webgl', { antialias }); // Get the WebGL rendering context
		if (!gl) {
			alert('Unable to initialize WebGL. Your browser or machine may not support it.');
		}
		return gl;
	},
	loadText: (url) => {
		return fetch(url).then(response => response.text());
	},
	loadShaders: (urls) => {
		return Promise.all(urls.map(u => webglp.loadText(u)));
	},
	compileShader: (gl, type, src) => {
		const shader = gl.createShader(type);
		gl.shaderSource(shader, src);
		gl.compileShader(shader);
		return shader;
	},
	fullscreen: (gl, win = window) => {
		gl.canvas.width = win.innerWidth;
		gl.canvas.height = win.innerHeight;
		webglp.setViewport(gl);
	},
	setViewport: (gl) => {
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	},
	// Based on https://xem.github.io/articles/webgl-guide.html
	// TODO: Remove
	// originalCompile: function (gl, vshader, fshader) {
	// 	const vs = this.compileShader(gl, gl.VERTEX_SHADER, vshader);
	// 	const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, fshader);
	
	// 	// Create the WebGL program and use it
	// 	const program = gl.createProgram();
	// 	gl.aS(program, vs);
	// 	gl.aS(program, fs);
	// 	gl.linkProgram(program);
	// 	gl.useProgram(program);
	
	// 	// Log compilation errors, if any
	// 	log('vertex shader:', gl.getShaderInfoLog(vs) || 'OK');
	// 	log('fragment shader:', gl.getShaderInfoLog(fs) || 'OK');
	// 	log('program:', gl.getProgramInfoLog(program) || 'OK');

	// 	return program;
	// },
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
	// Do it all - Create canvas rendering context, load shaders, compile, and return the context
	// First param can either be a selector or a GL object
	init: async (a, urlsArr, { fullscreen }) => {
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
