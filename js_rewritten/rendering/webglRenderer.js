// js_rewritten/rendering/webglRenderer.js

/**
 * WebGL Renderer for the RTS Game
 * Rewritten from first principles to utilize WebGL for enhanced rendering performance.
 * Handles rendering of game entities, terrain, and UI elements in a 3D context with systematic precision,
 * integrating 3D models inspired by large-scale mechanized warfare themes.
 */

import { TERRAIN_TYPES, TILE_SIZE, GRID_SIZE, WORLD_SIZE } from '../../js/config/gameConstants.js';
import { BUILDING_TYPES } from '../../js/config/buildingTypes.js';
import { UNIT_TYPES } from '../../js/config/unitTypes.js';
import { UNIT_MODELS, BUILDING_MODELS, TERRAIN_MODELS, TERRAIN_TEXTURES, EFFECT_TEXTURES } from '../config/modelDefaults.js';

// WebGL Renderer Class
export class WebGLRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = this.initWebGL();
        this.attributes = {}; // Initialize attributes before initShaders
        this.uniforms = {}; // Initialize uniforms before initShaders
        this.shaderProgram = this.initShaders();
        this.buffers = this.initBuffers();
        this.textures = {};
        this.models = {};
        this.camera = { x: 400, y: 400, zoom: 2.0, canvasWidth: canvas.width, canvasHeight: canvas.height };
        this.initializeModels();
    }

    initWebGL() {
        const gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
        if (!gl) {
            console.error('WebGL not supported or failed to initialize.');
            return null;
        }
        gl.clearColor(0.2, 0.2, 0.2, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE); // Enable back-face culling
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        return gl;
    }

    initShaders() {
        const vertexShaderSource = `
            attribute vec3 aPosition;
            attribute vec2 aTexCoord;
            attribute vec3 aNormal;
            attribute vec4 aColor;
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            varying vec2 vTexCoord;
            varying vec3 vNormal;
            varying vec4 vColor;
            void main() {
                vec4 worldPos = vec4(aPosition, 1.0);
                gl_Position = uProjectionMatrix * uModelViewMatrix * worldPos;
                vTexCoord = aTexCoord;
                vNormal = aNormal;
                vColor = aColor;
            }
        `;
        const fragmentShaderSource = `
            precision mediump float;
            varying vec2 vTexCoord;
            varying vec3 vNormal;
            varying vec4 vColor;
            uniform sampler2D uTexture;
            uniform bool uUseTexture;
            uniform bool uUseVertexColor;
            uniform vec3 uLightDirection;
            uniform vec4 uObjectColor;
            void main() {
                vec4 finalColor = uUseVertexColor ? vColor : uObjectColor;
                gl_FragColor = finalColor;
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

        // Cache attribute and uniform locations
        this.attributes.position = this.gl.getAttribLocation(shaderProgram, 'aPosition');
        this.attributes.texCoord = this.gl.getAttribLocation(shaderProgram, 'aTexCoord');
        this.attributes.normal = this.gl.getAttribLocation(shaderProgram, 'aNormal');
        this.attributes.color = this.gl.getAttribLocation(shaderProgram, 'aColor');
        this.uniforms.modelViewMatrix = this.gl.getUniformLocation(shaderProgram, 'uModelViewMatrix');
        this.uniforms.projectionMatrix = this.gl.getUniformLocation(shaderProgram, 'uProjectionMatrix');
        this.uniforms.texture = this.gl.getUniformLocation(shaderProgram, 'uTexture');
        this.uniforms.useTexture = this.gl.getUniformLocation(shaderProgram, 'uUseTexture');
        this.uniforms.useVertexColor = this.gl.getUniformLocation(shaderProgram, 'uUseVertexColor');
        this.uniforms.lightDirection = this.gl.getUniformLocation(shaderProgram, 'uLightDirection');
        this.uniforms.objectColor = this.gl.getUniformLocation(shaderProgram, 'uObjectColor');

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

    initBuffers() {
        const buffers = {
            terrain: {
                vertices: this.gl.createBuffer(),
                indices: this.gl.createBuffer(),
                texCoords: this.gl.createBuffer(),
                colors: this.gl.createBuffer(),
                normals: this.gl.createBuffer()
            },
            entities: {
                vertices: this.gl.createBuffer(),
                indices: this.gl.createBuffer(),
                texCoords: this.gl.createBuffer(),
                // Removed colors buffer as we're using a uniform
                normals: this.gl.createBuffer()
            }
        };
        return buffers;
    }

    createTexture(image) {
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        return texture;
    }

    async initializeModels() { // Made async
        this.models.units = {};
        this.models.buildings = {};
        this.models.terrainModels = {}; // Add terrainModels to this.models

        const loadPromises = [];

        // Initialize and load unit models
        for (const [key, modelConfig] of Object.entries(UNIT_MODELS)) {
            const model = {
                modelPath: modelConfig.modelPath,
                scale: modelConfig.scale,
                size: modelConfig.size,
                loaded: false,
                geometry: null
            };
            this.models.units[key] = model;

            loadPromises.push(
                this.loadModel(modelConfig.modelPath)
                    .then(geometry => {
                        model.geometry = geometry;
                        model.loaded = true;
                        console.log(`Loaded unit model: ${key}`);
                    })
                    .catch(error => {
                        console.error(`Failed to load unit model ${key}:`, error);
                        // Ensure model is still marked as loaded (even if empty) to prevent infinite waiting
                        model.loaded = true;
                    })
            );
        }

        // Initialize and load building models
        for (const [key, modelConfig] of Object.entries(BUILDING_MODELS)) {
            const model = {
                modelPath: modelConfig.modelPath,
                scale: modelConfig.scale,
                size: modelConfig.size,
                loaded: false,
                geometry: null
            };
            this.models.buildings[key] = model;

            loadPromises.push(
                this.loadModel(modelConfig.modelPath)
                    .then(geometry => {
                        model.geometry = geometry;
                        model.loaded = true;
                        console.log(`Loaded building model: ${key}`);
                    })
                    .catch(error => {
                        console.error(`Failed to load building model ${key}:`, error);
                        model.loaded = true;
                    })
            );
        }

        // Initialize and load terrain models (e.g., resources)
        for (const [key, modelConfig] of Object.entries(TERRAIN_MODELS)) {
            const model = {
                modelPath: modelConfig.modelPath,
                scale: modelConfig.scale,
                size: modelConfig.size,
                loaded: false,
                geometry: null
            };
            this.models.terrainModels[key] = model;

            loadPromises.push(
                this.loadModel(modelConfig.modelPath)
                    .then(geometry => {
                        model.geometry = geometry;
                        model.loaded = true;
                        console.log(`Loaded terrain model: ${key}`);
                    })
                    .catch(error => {
                        console.error(`Failed to load terrain model ${key}:`, error);
                        model.loaded = true;
                    })
            );
        }

        await Promise.all(loadPromises);
        console.log('All 3D models initialized and loaded.');
    }

    async loadModel(modelPath) { // Made async
        console.log(`Loading model from ${modelPath}`);
        try {
            const response = await fetch(modelPath);
            if (!response.ok) {
                throw new Error(`Failed to load OBJ: ${response.statusText}`);
            }
            const text = await response.text();
            return this.parseOBJ(text);
        } catch (error) {
            console.error(`Error loading model ${modelPath}:`, error);
            // Return an empty geometry object on error to prevent crashes
            return {
                vertices: new Float32Array([]),
                indices: new Uint16Array([]),
                texCoords: new Float32Array([]),
                normals: new Float32Array([])
            };
        }
    }

    parseOBJ(objText) {
        const lines = objText.split('\n');
        const rawVertices = [];
        const rawNormals = [];
        const rawTexCoords = [];
        const faces = []; // Stores arrays of [vIndex, vtIndex, vnIndex] for each vertex of a face

        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const type = parts[0];

            switch (type) {
                case 'v':
                    rawVertices.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
                    break;
                case 'vn':
                    rawNormals.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
                    break;
                case 'vt':
                    rawTexCoords.push(parseFloat(parts[1]), parseFloat(parts[2]));
                    break;
                case 'f':
                    const faceVertices = [];
                    for (let i = 1; i < parts.length; i++) {
                        const indices = parts[i].split('/').map(s => parseInt(s, 10));
                        faceVertices.push(indices);
                    }
                    faces.push(faceVertices);
                    break;
            }
        }

        const vertices = [];
        const normals = [];
        const texCoords = [];
        const indices = [];
        const vertexMap = new Map(); // Map from "v/vt/vn" string to new index

        const getOrAddVertex = (v, vt, vn) => {
            const key = `${v}/${vt}/${vn}`;
            if (vertexMap.has(key)) {
                return vertexMap.get(key);
            }

            const newIndex = vertices.length / 3;
            vertexMap.set(key, newIndex);

            // OBJ indices are 1-based, convert to 0-based
            vertices.push(rawVertices[(v - 1) * 3], rawVertices[(v - 1) * 3 + 1], rawVertices[(v - 1) * 3 + 2]);
            
            if (vn && rawNormals.length > 0 && !isNaN(vn)) { // Check for valid vn index
                normals.push(rawNormals[(vn - 1) * 3], rawNormals[(vn - 1) * 3 + 1], rawNormals[(vn - 1) * 3 + 2]);
            } else {
                // If no normal, push a default (0,0,1)
                normals.push(0, 0, 1);
            }

            if (vt && rawTexCoords.length > 0 && !isNaN(vt)) { // Check for valid vt index
                texCoords.push(rawTexCoords[(vt - 1) * 2], rawTexCoords[(vt - 1) * 2 + 1]);
            } else {
                texCoords.push(0, 0); // Default if no tex coord
            }

            return newIndex;
        };

        for (const face of faces) {
            // Triangulate n-gons (for quads, create two triangles)
            if (face.length === 3) { // Triangle
                indices.push(
                    getOrAddVertex(face[0][0], face[0][1], face[0][2]),
                    getOrAddVertex(face[1][0], face[1][1], face[1][2]),
                    getOrAddVertex(face[2][0], face[2][1], face[2][2])
                );
            } else if (face.length === 4) { // Quad
                const i0 = getOrAddVertex(face[0][0], face[0][1], face[0][2]);
                const i1 = getOrAddVertex(face[1][0], face[1][1], face[1][2]);
                const i2 = getOrAddVertex(face[2][0], face[2][1], face[2][2]);
                const i3 = getOrAddVertex(face[3][0], face[3][1], face[3][2]);
                indices.push(i0, i1, i2);
                indices.push(i0, i2, i3);
            }
            // Other n-gons would require more complex triangulation
        }

        return {
            vertices: new Float32Array(vertices),
            indices: new Uint16Array(indices),
            texCoords: new Float32Array(texCoords),
            normals: new Float32Array(normals)
        };
    }

    render(gameContext) {
        if (!this.gl || !this.shaderProgram) {
            console.error('WebGL or shaders not initialized.');
            return;
        }

        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.useProgram(this.shaderProgram);

        // Calculate visible world bounds for frustum culling - make bounds much more generous
        const visibleWorldLeft = this.camera.x - this.camera.canvasWidth / this.camera.zoom;
        const visibleWorldRight = this.camera.x + this.camera.canvasWidth / this.camera.zoom;
        const visibleWorldTop = this.camera.y - this.camera.canvasHeight / this.camera.zoom;
        const visibleWorldBottom = this.camera.y + this.camera.canvasHeight / this.camera.zoom;
        

        // Set up projection and model-view matrices
        this.setupMatrices();

        // Set light direction for basic lighting
        this.gl.uniform3f(this.uniforms.lightDirection, 0.5, 0.5, -0.5);

        // Render terrain
        this.renderTerrain(gameContext.terrain, visibleWorldLeft, visibleWorldRight, visibleWorldTop, visibleWorldBottom);

        // Render entities
        this.renderEntities(gameContext, visibleWorldLeft, visibleWorldRight, visibleWorldTop, visibleWorldBottom);

        // Render UI elements like minimap and captions if applicable
        // Placeholder for UI rendering logic
    }

    setupMatrices() {
        // Use orthographic projection for simplicity and debugging
        const left = -this.camera.canvasWidth / 2;
        const right = this.camera.canvasWidth / 2;
        const bottom = -this.camera.canvasHeight / 2;
        const top = this.camera.canvasHeight / 2;
        const near = -1000;
        const far = 1000;

        const projectionMatrix = [
            2 / (right - left), 0, 0, 0,
            0, 2 / (top - bottom), 0, 0,
            0, 0, -2 / (far - near), 0,
            -(right + left) / (right - left), -(top + bottom) / (top - bottom), -(far + near) / (far - near), 1
        ];

        // Simple view matrix - just translate by camera position
        const modelViewMatrix = [
            this.camera.zoom, 0, 0, 0,
            0, this.camera.zoom, 0, 0,
            0, 0, 1, 0,
            -this.camera.x * this.camera.zoom, -this.camera.y * this.camera.zoom, 0, 1
        ];

        this.gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, projectionMatrix);
        this.gl.uniformMatrix4fv(this.uniforms.modelViewMatrix, false, modelViewMatrix);
    }

    renderTerrain(terrain, left, right, top, bottom) {
        const startX = Math.max(0, Math.floor(left / TILE_SIZE));
        const endX = Math.min(GRID_SIZE, Math.ceil(right / TILE_SIZE));
        const startY = Math.max(0, Math.floor(top / TILE_SIZE));
        const endY = Math.min(GRID_SIZE, Math.ceil(bottom / TILE_SIZE));

        let vertices = [];
        let indices = [];
        let colors = []; // Keep for terrain, as terrain colors are fixed
        let texCoords = [];
        let normals = [];
        let indexOffset = 0;
        
        // Disable color attribute if not using it for terrain models, otherwise enable
        if (this.attributes.color !== -1) {
            this.gl.disableVertexAttribArray(this.attributes.color); // Disable for model rendering
        }

        for (let x = startX; x < endX; x++) {
            for (let y = startY; y < endY; y++) {
                if (!terrain[x] || terrain[x][y] === undefined) continue;

                const posX = x * TILE_SIZE;
                const posY = y * TILE_SIZE;
                const size = TILE_SIZE;
                let height = terrain[x][y] === TERRAIN_TYPES.MOUNTAIN ? 10 : (terrain[x][y] === TERRAIN_TYPES.WATER ? -5 : 0);
                
                // If it's a resource, we'll render its model, so don't render a quad for it
                if (terrain[x][y] === TERRAIN_TYPES.RESOURCE) {
                    continue; // Skip quad rendering for resource tiles
                }

                // Vertices for a quad (two triangles) with height variation for 3D effect
                vertices.push(posX, posY, height); // Top-left
                vertices.push(posX + size, posY, height); // Top-right
                vertices.push(posX, posY + size, height); // Bottom-left
                vertices.push(posX + size, posY + size, height); // Bottom-right

                // Indices for two triangles forming a quad
                indices.push(indexOffset, indexOffset + 1, indexOffset + 2);
                indices.push(indexOffset + 1, indexOffset + 3, indexOffset + 2);
                indexOffset += 4;

                // Determine color based on terrain type
                let color;
                switch (terrain[x][y]) {
                    case TERRAIN_TYPES.WATER:
                        color = [0.07, 0.2, 0.3, 1.0]; // Dark blue
                        break;
                    case TERRAIN_TYPES.LAND:
                        color = [0.28, 0.5, 0.25, 1.0]; // Green
                        break;
                    case TERRAIN_TYPES.MOUNTAIN:
                        color = [0.4, 0.4, 0.4, 1.0]; // Gray
                        break;
                    case TERRAIN_TYPES.RESOURCE:
                        color = [0.8, 0.8, 0.2, 1.0]; // Yellow for resources
                        break;
                    default:
                        color = [0.1, 0.1, 0.1, 1.0]; // Dark gray
                }
                colors.push(...color, ...color, ...color, ...color); // Repeat color for all four vertices

                // Adjust height for resources to be slightly elevated like mountains
                if (terrain[x][y] === TERRAIN_TYPES.RESOURCE) {
                    vertices[vertices.length - 12 + 2] = 5; // Top-left Z
                    vertices[vertices.length - 12 + 5] = 5; // Top-right Z
                    vertices[vertices.length - 12 + 8] = 5; // Bottom-left Z
                    vertices[vertices.length - 12 + 11] = 5; // Bottom-right Z
                }

                // Texture coordinates
                texCoords.push(0, 0, 1, 0, 0, 1, 1, 1);

                // Simple normals for basic lighting (pointing upwards)
                const normal = [0, 0, 1];
                normals.push(...normal, ...normal, ...normal, ...normal);
            }
        }

        // Bind and upload data to buffers
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.terrain.vertices);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.terrain.colors);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.terrain.texCoords);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(texCoords), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.terrain.normals);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(normals), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.terrain.indices);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);

        // Set up vertex attributes
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.terrain.vertices);
        this.gl.vertexAttribPointer(this.attributes.position, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.attributes.position);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.terrain.colors);
        this.gl.vertexAttribPointer(this.attributes.color, 4, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.attributes.color);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.terrain.texCoords);
        this.gl.vertexAttribPointer(this.attributes.texCoord, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.attributes.texCoord);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.terrain.normals);
        this.gl.vertexAttribPointer(this.attributes.normal, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.attributes.normal);

        // Set uniforms
        this.gl.uniform1i(this.uniforms.useTexture, 0); // Not using texture for terrain initially
        this.gl.uniform1i(this.uniforms.useVertexColor, 1); // Use vertex colors for terrain
        this.gl.uniform4f(this.uniforms.objectColor, 1.0, 1.0, 1.0, 1.0); // Default white for terrain

        // Draw terrain
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.terrain.indices);
        this.gl.drawElements(this.gl.TRIANGLES, indices.length, this.gl.UNSIGNED_SHORT, 0);

        // Re-enable color attribute for subsequent rendering if it was disabled
        if (this.attributes.color !== -1) {
            this.gl.enableVertexAttribArray(this.attributes.color);
        }

        // Render terrain models (like resources)
        this.renderTerrainModels(terrain, left, right, top, bottom);
    }

    renderTerrainModels(terrain, left, right, top, bottom) {
        if (this.attributes.color !== -1) {
            this.gl.disableVertexAttribArray(this.attributes.color);
        }

        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                if (terrain[x] && terrain[x][y] === TERRAIN_TYPES.RESOURCE) {
                    const modelInfo = this.models.terrainModels.resource; // Assuming only one resource model
                    if (!modelInfo || !modelInfo.loaded || !modelInfo.geometry || modelInfo.geometry.indices.length === 0) {
                        continue;
                    }

                    const geometry = modelInfo.geometry;
                    const effectiveSize = modelInfo.size * modelInfo.scale;

                    const objWorldX = x * TILE_SIZE;
                    const objWorldY = y * TILE_SIZE;

                    // Visibility check for resource models
                    if (!(objWorldX + effectiveSize > left && objWorldX - effectiveSize < right &&
                          objWorldY + effectiveSize > top && objWorldY - effectiveSize < bottom)) {
                        continue;
                    }

                    // Bind buffers for the resource model
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.vertices);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, geometry.vertices, this.gl.DYNAMIC_DRAW);

                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.normals);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, geometry.normals, this.gl.DYNAMIC_DRAW);

                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.texCoords);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, geometry.texCoords, this.gl.DYNAMIC_DRAW);

                    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.entities.indices);
                    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, geometry.indices, this.gl.DYNAMIC_DRAW);

                    // Set up vertex attributes
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.vertices);
                    this.gl.vertexAttribPointer(this.attributes.position, 3, this.gl.FLOAT, false, 0, 0);
                    this.gl.enableVertexAttribArray(this.attributes.position);

                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.normals);
                    this.gl.vertexAttribPointer(this.attributes.normal, 3, this.gl.FLOAT, false, 0, 0);
                    this.gl.enableVertexAttribArray(this.attributes.normal);

                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.texCoords);
                    this.gl.vertexAttribPointer(this.attributes.texCoord, 2, this.gl.FLOAT, false, 0, 0);
                    this.gl.enableVertexAttribArray(this.attributes.texCoord);

                    this.gl.uniform1i(this.uniforms.useTexture, 0);
                    this.gl.uniform1i(this.uniforms.useVertexColor, 0);
                    this.gl.uniform4f(this.uniforms.objectColor, 0.8, 0.8, 0.2, 1.0); // Yellow for resources

                    // Apply transformation
                    const scaleFactor = modelInfo.scale * TILE_SIZE;
                    const modelMatrix = [
                        this.camera.zoom * scaleFactor, 0, 0, 0,
                        0, this.camera.zoom * scaleFactor, 0, 0,
                        0, 0, this.camera.zoom * scaleFactor, 0, // Apply zoom to Z as well for consistent scaling
                        (objWorldX - this.camera.x) * this.camera.zoom, (objWorldY - this.camera.y) * this.camera.zoom, 0, 1
                    ];
                    this.gl.uniformMatrix4fv(this.uniforms.modelViewMatrix, false, modelMatrix);
                    this.gl.drawElements(this.gl.TRIANGLES, geometry.indices.length, this.gl.UNSIGNED_SHORT, 0);
                }
            }
        }
    }

    renderEntities(gameContext, left, right, top, bottom) {
        // Helper function for visibility check - make it much more permissive for debugging
        const isVisible = (obj, modelSize) => {
            const effectiveSize = modelSize || 50; // Use modelSize if available, else default
            const objWorldX = obj.x * TILE_SIZE;
            const objWorldY = obj.y * TILE_SIZE;
            
            return objWorldX + effectiveSize > left && objWorldX - effectiveSize < right &&
                   objWorldY + effectiveSize > top && objWorldY - effectiveSize < bottom;
        };
        
        // Disable the color attribute for entities since we're using a uniform color
        if (this.attributes.color !== -1) {
            this.gl.disableVertexAttribArray(this.attributes.color);
        }

        // Render units
        for (const [modelKey, modelInfo] of Object.entries(this.models.units)) {
            if (!modelInfo.loaded || !modelInfo.geometry || modelInfo.geometry.indices.length === 0) {
                continue;
            }

            const geometry = modelInfo.geometry;

            // Bind buffers for the current model
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.vertices);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, geometry.vertices, this.gl.DYNAMIC_DRAW);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.normals);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, geometry.normals, this.gl.DYNAMIC_DRAW);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.texCoords);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, geometry.texCoords, this.gl.DYNAMIC_DRAW);

            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.entities.indices);
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, geometry.indices, this.gl.DYNAMIC_DRAW);

            // Set up vertex attributes - bind each buffer before setting up its attribute
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.vertices);
            this.gl.vertexAttribPointer(this.attributes.position, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.attributes.position);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.normals);
            this.gl.vertexAttribPointer(this.attributes.normal, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.attributes.normal);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.texCoords);
            this.gl.vertexAttribPointer(this.attributes.texCoord, 2, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.attributes.texCoord);

            this.gl.uniform1i(this.uniforms.useTexture, 0); // Not using texture for entities for now
            this.gl.uniform1i(this.uniforms.useVertexColor, 0); // Use uniform color for entities

            // Render instances of this unit type
            gameContext.units.forEach(unit => {
                let unitModelKey = Object.keys(UNIT_MODELS).find(key => UNIT_MODELS[key].name === unit.type.name);
                if (!unitModelKey) unitModelKey = 'scout'; // Default fallback
                if (unitModelKey !== modelKey) return; // Only render units of the current model type

                const effectiveSize = modelInfo.size * modelInfo.scale;
                if (!isVisible(unit, effectiveSize)) return;

                const teamColor = unit.team === 'blue' ? [0.1, 0.1, 0.8, 1.0] : [0.8, 0.1, 0.1, 1.0];
                this.gl.uniform4f(this.uniforms.objectColor, teamColor[0], teamColor[1], teamColor[2], teamColor[3]);

                // Apply simple transformation by modifying the model-view matrix
                const scaleFactor = modelInfo.scale * 20; // Make units visible
                const posX = unit.x * TILE_SIZE;
                const posY = unit.y * TILE_SIZE;
                
                // Create a temporary model-view matrix for this unit
                const unitMatrix = [
                    this.camera.zoom * scaleFactor, 0, 0, 0,
                    0, this.camera.zoom * scaleFactor, 0, 0,
                    0, 0, 1, 0,
                    (posX - this.camera.x) * this.camera.zoom, (posY - this.camera.y) * this.camera.zoom, 0, 1
                ];

                this.gl.uniformMatrix4fv(this.uniforms.modelViewMatrix, false, unitMatrix);
                this.gl.drawElements(this.gl.TRIANGLES, geometry.indices.length, this.gl.UNSIGNED_SHORT, 0);
            });
        }
        // Render buildings (similar logic)
        for (const [modelKey, modelInfo] of Object.entries(this.models.buildings)) {
            if (!modelInfo.loaded || !modelInfo.geometry || modelInfo.geometry.indices.length === 0) {
                // console.warn(`Model ${modelKey} not loaded or has no geometry, skipping rendering.`);
                continue;
            }

            const geometry = modelInfo.geometry;

            // Bind buffers for the current model
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.vertices);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, geometry.vertices, this.gl.DYNAMIC_DRAW);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.normals);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, geometry.normals, this.gl.DYNAMIC_DRAW);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.texCoords);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, geometry.texCoords, this.gl.DYNAMIC_DRAW);

            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.entities.indices);
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, geometry.indices, this.gl.DYNAMIC_DRAW);

            // Set up vertex attributes - bind each buffer before setting up its attribute
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.vertices);
            this.gl.vertexAttribPointer(this.attributes.position, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.attributes.position);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.normals);
            this.gl.vertexAttribPointer(this.attributes.normal, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.attributes.normal);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.texCoords);
            this.gl.vertexAttribPointer(this.attributes.texCoord, 2, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.attributes.texCoord);

            this.gl.uniform1i(this.uniforms.useTexture, 0);
            this.gl.uniform1i(this.uniforms.useVertexColor, 0); // Use uniform color for buildings

            // Render instances of this building type
            gameContext.buildings.forEach(building => {
                let buildingModelKey = Object.keys(BUILDING_MODELS).find(key => BUILDING_MODELS[key].name === building.type.name);
                if (!buildingModelKey) buildingModelKey = 'landFactory'; // Default fallback
                if (buildingModelKey !== modelKey) return;

                const effectiveSize = modelInfo.size * modelInfo.scale;
                if (!isVisible(building, effectiveSize)) return;

                const teamColor = building.team === 'blue' ? [0.3, 0.3, 1.0, 1.0] : [1.0, 0.3, 0.3, 1.0];
                this.gl.uniform4f(this.uniforms.objectColor, teamColor[0], teamColor[1], teamColor[2], teamColor[3]);

                // Apply simple transformation for buildings
                const scaleFactor = modelInfo.scale * 30; // Make buildings larger
                const posX = building.x * TILE_SIZE;
                const posY = building.y * TILE_SIZE;
                
                const buildingMatrix = [
                    this.camera.zoom * scaleFactor, 0, 0, 0,
                    0, this.camera.zoom * scaleFactor, 0, 0,
                    0, 0, 1, 0,
                    (posX - this.camera.x) * this.camera.zoom, (posY - this.camera.y) * this.camera.zoom, 0, 1
                ];

                this.gl.uniformMatrix4fv(this.uniforms.modelViewMatrix, false, buildingMatrix);

                this.gl.drawElements(this.gl.TRIANGLES, geometry.indices.length, this.gl.UNSIGNED_SHORT, 0);
            });
        }
    }

    updateCamera(cameraData) {
        this.camera.x = cameraData.x;
        this.camera.y = cameraData.y;
        this.camera.zoom = cameraData.zoom;
        this.camera.canvasWidth = cameraData.canvasWidth;
        this.camera.canvasHeight = cameraData.canvasHeight;
    }
}

// Utility function to initialize the renderer
export function initRenderer(canvas) {
    return new WebGLRenderer(canvas);
}