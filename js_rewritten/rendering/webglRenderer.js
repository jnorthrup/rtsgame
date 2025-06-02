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
import { UNIT_MODELS, BUILDING_MODELS, TERRAIN_TEXTURES, EFFECT_TEXTURES } from '../config/modelDefaults.js';

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
        this.camera = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, zoom: 0.5, canvasWidth: canvas.width, canvasHeight: canvas.height };
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
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        return gl;
    }

    initShaders() {
        const vertexShaderSource = `
            attribute vec3 aPosition;
            attribute vec2 aTexCoord;
            attribute vec4 aColor;
            attribute vec3 aNormal;
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            uniform mat4 uModelMatrix;
            varying vec2 vTexCoord;
            varying vec4 vColor;
            varying vec3 vNormal;
            void main() {
                gl_Position = uProjectionMatrix * uModelViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
                vTexCoord = aTexCoord;
                vColor = aColor;
                vNormal = aNormal;
            }
        `;
        const fragmentShaderSource = `
            precision mediump float;
            varying vec2 vTexCoord;
            varying vec4 vColor;
            varying vec3 vNormal;
            uniform sampler2D uTexture;
            uniform bool uUseTexture;
            uniform vec3 uLightDirection;
            void main() {
                float diffuse = max(dot(vNormal, uLightDirection), 0.0);
                vec4 lightEffect = vec4(diffuse * 0.5 + 0.5);
                if (uUseTexture) {
                    vec4 texColor = texture2D(uTexture, vTexCoord);
                    gl_FragColor = texColor * vColor * lightEffect;
                } else {
                    gl_FragColor = vColor * lightEffect;
                }
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
        this.attributes.color = this.gl.getAttribLocation(shaderProgram, 'aColor');
        this.attributes.normal = this.gl.getAttribLocation(shaderProgram, 'aNormal');
        this.uniforms.modelViewMatrix = this.gl.getUniformLocation(shaderProgram, 'uModelViewMatrix');
        this.uniforms.projectionMatrix = this.gl.getUniformLocation(shaderProgram, 'uProjectionMatrix');
        this.uniforms.modelMatrix = this.gl.getUniformLocation(shaderProgram, 'uModelMatrix');
        this.uniforms.texture = this.gl.getUniformLocation(shaderProgram, 'uTexture');
        this.uniforms.useTexture = this.gl.getUniformLocation(shaderProgram, 'uUseTexture');
        this.uniforms.lightDirection = this.gl.getUniformLocation(shaderProgram, 'uLightDirection');

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
                colors: this.gl.createBuffer(),
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

    initializeModels() {
        // Placeholder for loading 3D models from defined paths in modelDefaults.js
        this.models.units = {};
        this.models.buildings = {};

        // Initialize unit model references
        for (const [key, modelConfig] of Object.entries(UNIT_MODELS)) {
            this.models.units[key] = {
                modelPath: modelConfig.modelPath,
                scale: modelConfig.scale,
                size: modelConfig.size,
                loaded: false,
                geometry: null // Placeholder for loaded geometry data
                // Geometry loading logic will be implemented here or in a separate loader class
            };
        }

        // Initialize building model references
        for (const [key, modelConfig] of Object.entries(BUILDING_MODELS)) {
            this.models.buildings[key] = {
                modelPath: modelConfig.modelPath,
                scale: modelConfig.scale,
                size: modelConfig.size,
                loaded: false,
                geometry: null // Placeholder for loaded geometry data
            };
        }

        console.log('Initialized 3D model configurations for units and buildings.');
        // Actual model loading (e.g., OBJ files) would be asynchronous and implemented with fetch or a library
    }

    loadModel(modelPath) {
        // Placeholder for loading a 3D model (e.g., OBJ format)
        // This would typically involve fetching the model file and parsing its geometry
        console.log(`Loading model from ${modelPath}`);
        // Return a mock geometry object for now
        return {
            vertices: new Float32Array([]),
            indices: new Uint16Array([]),
            texCoords: new Float32Array([]),
            normals: new Float32Array([])
        };
    }

    render(gameContext) {
        if (!this.gl || !this.shaderProgram) {
            console.error('WebGL or shaders not initialized.');
            return;
        }

        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.useProgram(this.shaderProgram);

        // Calculate visible world bounds for frustum culling
        const visibleWorldLeft = this.camera.x - this.camera.canvasWidth / 2 / this.camera.zoom;
        const visibleWorldRight = this.camera.x + this.camera.canvasWidth / 2 / this.camera.zoom;
        const visibleWorldTop = this.camera.y - this.camera.canvasHeight / 2 / this.camera.zoom;
        const visibleWorldBottom = this.camera.y + this.camera.canvasHeight / 2 / this.camera.zoom;

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
        // Perspective projection matrix for true 3D rendering
        const fov = Math.PI / 4; // 45 degrees field of view
        const aspect = this.camera.canvasWidth / this.camera.canvasHeight;
        const near = 0.1;
        const far = 10000;

        const f = 1.0 / Math.tan(fov / 2);
        const projectionMatrix = [
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) / (near - far), (2 * far * near) / (near - far),
            0, 0, -1, 0
        ];

        // Model-view matrix with camera transformation
        const camX = this.camera.x;
        const camY = this.camera.y;
        const camZ = 500 / this.camera.zoom; // Adjust Z based on zoom for height perspective
        const modelViewMatrix = [
            1, 0, 0, -camX,
            0, 1, 0, -camY,
            0, 0, 1, -camZ,
            0, 0, 0, 1
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
        let colors = [];
        let texCoords = [];
        let normals = [];
        let indexOffset = 0;

        for (let x = startX; x < endX; x++) {
            for (let y = startY; y < endY; y++) {
                if (!terrain[x] || terrain[x][y] === undefined) continue;

                const posX = x * TILE_SIZE;
                const posY = y * TILE_SIZE;
                const size = TILE_SIZE;
                const height = terrain[x][y] === TERRAIN_TYPES.MOUNTAIN ? 10 : (terrain[x][y] === TERRAIN_TYPES.WATER ? -5 : 0);

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
                    default:
                        color = [0.1, 0.1, 0.1, 1.0]; // Dark gray
                }
                colors.push(...color, ...color, ...color, ...color); // Repeat color for all four vertices

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

        // Draw terrain
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.terrain.indices);
        this.gl.drawElements(this.gl.TRIANGLES, indices.length, this.gl.UNSIGNED_SHORT, 0);
    }

    renderEntities(gameContext, left, right, top, bottom) {
        // Helper function for visibility check
        const isVisible = (obj) => {
            const objSize = obj.type && obj.type.size ? obj.type.size : (obj.radius || (obj.width && obj.height ? Math.max(obj.width, obj.height) : 50));
            return obj.x + objSize > left && obj.x - objSize < right && obj.y + objSize > top && obj.y - objSize < bottom;
        };

        // Since full 3D model rendering requires geometry data, we'll use placeholder quads with scale and color
        // When models are loaded, this method would switch to rendering actual model geometry

        let vertices = [];
        let indices = [];
        let colors = [];
        let texCoords = [];
        let normals = [];
        let indexOffset = 0;

        // Render buildings with model-inspired scaling
        gameContext.buildings.forEach(building => {
            if (isVisible(building)) {
                let modelKey = Object.keys(BUILDING_MODELS).find(key => BUILDING_MODELS[key].name === building.type.name);
                if (!modelKey) modelKey = 'landFactory'; // Default fallback
                const modelInfo = this.models.buildings[modelKey];
                const size = modelInfo.size * modelInfo.scale;
                const height = modelInfo.scale * 10; // Simulated height for 3D effect
                const teamColor = building.team === 'blue' ? [0.3, 0.3, 1.0, 1.0] : [1.0, 0.3, 0.3, 1.0];

                // Create a simple 3D box as placeholder for building model
                // Front face
                vertices.push(building.x - size / 2, building.y - size / 2, 0);
                vertices.push(building.x + size / 2, building.y - size / 2, 0);
                vertices.push(building.x - size / 2, building.y + size / 2, 0);
                vertices.push(building.x + size / 2, building.y + size / 2, 0);
                // Back face (higher for 3D effect)
                vertices.push(building.x - size / 2, building.y - size / 2, height);
                vertices.push(building.x + size / 2, building.y - size / 2, height);
                vertices.push(building.x - size / 2, building.y + size / 2, height);
                vertices.push(building.x + size / 2, building.y + size / 2, height);

                // Indices for box faces (front, back, sides, top)
                // Front
                indices.push(indexOffset, indexOffset + 1, indexOffset + 2);
                indices.push(indexOffset + 1, indexOffset + 3, indexOffset + 2);
                // Back
                indices.push(indexOffset + 4, indexOffset + 5, indexOffset + 6);
                indices.push(indexOffset + 5, indexOffset + 7, indexOffset + 6);
                // Left
                indices.push(indexOffset, indexOffset + 4, indexOffset + 2);
                indices.push(indexOffset + 4, indexOffset + 6, indexOffset + 2);
                // Right
                indices.push(indexOffset + 1, indexOffset + 5, indexOffset + 3);
                indices.push(indexOffset + 5, indexOffset + 7, indexOffset + 3);
                // Top
                indices.push(indexOffset + 4, indexOffset + 5, indexOffset + 6);
                indices.push(indexOffset + 5, indexOffset + 7, indexOffset + 6);
                indexOffset += 8;

                // Colors for all vertices
                colors.push(...teamColor, ...teamColor, ...teamColor, ...teamColor, ...teamColor, ...teamColor, ...teamColor, ...teamColor);

                // Texture coordinates (placeholder)
                texCoords.push(0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1);

                // Normals for basic lighting (simplified)
                normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
            }
        });

        // Render units with model-inspired scaling
        gameContext.units.forEach(unit => {
            if (isVisible(unit)) {
                let modelKey = Object.keys(UNIT_MODELS).find(key => UNIT_MODELS[key].name === unit.type.name);
                if (!modelKey) modelKey = 'scout'; // Default fallback
                const modelInfo = this.models.units[modelKey];
                const size = modelInfo.size * modelInfo.scale;
                const height = modelInfo.scale * 5; // Simulated height for 3D effect
                const teamColor = unit.team === 'blue' ? [0.1, 0.1, 0.8, 1.0] : [0.8, 0.1, 0.1, 1.0];

                // Create a simple 3D box as placeholder for unit model
                // Front face
                vertices.push(unit.x - size / 2, unit.y - size / 2, 0);
                vertices.push(unit.x + size / 2, unit.y - size / 2, 0);
                vertices.push(unit.x - size / 2, unit.y + size / 2, 0);
                vertices.push(unit.x + size / 2, unit.y + size / 2, 0);
                // Back face (higher for 3D effect)
                vertices.push(unit.x - size / 2, unit.y - size / 2, height);
                vertices.push(unit.x + size / 2, unit.y - size / 2, height);
                vertices.push(unit.x - size / 2, unit.y + size / 2, height);
                vertices.push(unit.x + size / 2, unit.y + size / 2, height);

                // Indices for box faces (front, back, sides, top)
                // Front
                indices.push(indexOffset, indexOffset + 1, indexOffset + 2);
                indices.push(indexOffset + 1, indexOffset + 3, indexOffset + 2);
                // Back
                indices.push(indexOffset + 4, indexOffset + 5, indexOffset + 6);
                indices.push(indexOffset + 5, indexOffset + 7, indexOffset + 6);
                // Left
                indices.push(indexOffset, indexOffset + 4, indexOffset + 2);
                indices.push(indexOffset + 4, indexOffset + 6, indexOffset + 2);
                // Right
                indices.push(indexOffset + 1, indexOffset + 5, indexOffset + 3);
                indices.push(indexOffset + 5, indexOffset + 7, indexOffset + 3);
                // Top
                indices.push(indexOffset + 4, indexOffset + 5, indexOffset + 6);
                indices.push(indexOffset + 5, indexOffset + 7, indexOffset + 6);
                indexOffset += 8;

                // Colors for all vertices
                colors.push(...teamColor, ...teamColor, ...teamColor, ...teamColor, ...teamColor, ...teamColor, ...teamColor, ...teamColor);

                // Texture coordinates (placeholder)
                texCoords.push(0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1);

                // Normals for basic lighting (simplified)
                normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
            }
        });

        // Additional entity types (effects, projectiles, captions) can be rendered similarly

        // Upload data to buffers
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.vertices);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.DYNAMIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.colors);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.DYNAMIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.texCoords);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(texCoords), this.gl.DYNAMIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.normals);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(normals), this.gl.DYNAMIC_DRAW);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.entities.indices);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.DYNAMIC_DRAW);

        // Set up vertex attributes
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.vertices);
        this.gl.vertexAttribPointer(this.attributes.position, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.attributes.position);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.colors);
        this.gl.vertexAttribPointer(this.attributes.color, 4, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.attributes.color);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.texCoords);
        this.gl.vertexAttribPointer(this.attributes.texCoord, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.attributes.texCoord);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.entities.normals);
        this.gl.vertexAttribPointer(this.attributes.normal, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.attributes.normal);

        // Set uniforms
        this.gl.uniform1i(this.uniforms.useTexture, 0); // Not using texture for entities initially

        // Draw entities
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.entities.indices);
        this.gl.drawElements(this.gl.TRIANGLES, indices.length, this.gl.UNSIGNED_SHORT, 0);
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