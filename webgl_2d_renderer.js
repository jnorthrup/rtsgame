// webgl_2d_renderer.js
export class WebGL2DRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = this.initWebGL();
        if (!this.gl) return;
        this.shaderProgram = this.initShaders();
        if (!this.shaderProgram) return;

        this.positionBuffer = this.gl.createBuffer();
        this.colorBuffer = this.gl.createBuffer();

        this.attributes = {
            position: this.gl.getAttribLocation(this.shaderProgram, 'aPosition'),
            color: this.gl.getAttribLocation(this.shaderProgram, 'aColor'),
        };
        this.uniforms = {
            resolution: this.gl.getUniformLocation(this.shaderProgram, 'uResolution'),
        };

        this.gl.useProgram(this.shaderProgram);
        this.gl.uniform2f(this.uniforms.resolution, canvas.width, canvas.height);
    }

    initWebGL() {
        const gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
        if (!gl) {
            console.error('WebGL not supported or failed to initialize.');
            return null;
        }
        gl.clearColor(0.2, 0.2, 0.2, 1.0); // Dark gray background
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        return gl;
    }

    initShaders() {
        const vertexShaderSource = `
            attribute vec2 aPosition;
            attribute vec4 aColor;
            uniform vec2 uResolution;
            varying vec4 vColor;

            void main() {
                // convert the rectangle from pixels to 0.0 to 1.0
                vec2 zeroToOne = aPosition / uResolution;

                // convert from 0.0 to 1.0 to -1.0 to +1.0 (clip space)
                vec2 clipSpace = (zeroToOne * 2.0) - 1.0;

                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1); // Flip Y-axis
                vColor = aColor;
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            varying vec4 vColor;

            void main() {
                gl_FragColor = vColor;
            }
        `;

        const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

        const shaderProgram = this.gl.createProgram();
        this.gl.attachShader(shaderProgram, vertexShader);
        this.gl.attachShader(shaderProgram, fragmentShader);
        this.gl.linkProgram(shaderProgram);

        if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
            console.error('Shader program linking failed:', this.gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        return shaderProgram;
    }

    compileShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compilation failed:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    // Draws a filled rectangle (quad) with a single color
    drawRect(x, y, width, height, color) {
        if (!this.gl) return;

        const x1 = x;
        const y1 = y;
        const x2 = x + width;
        const y2 = y + height;

        const positions = [
            x1, y1,
            x2, y1,
            x1, y2,
            x1, y2,
            x2, y1,
            x2, y2,
        ];

        const colors = [
            ...color, ...color, ...color,
            ...color, ...color, ...color,
        ];

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.attributes.position, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.attributes.position);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.attributes.color, 4, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.attributes.color);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    clear() {
        if (!this.gl) return;
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
}