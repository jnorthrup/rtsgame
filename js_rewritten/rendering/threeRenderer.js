// js_rewritten/rendering/threeRenderer.js - Simplified and perfected Three.js renderer

import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { WORLD_SIZE, TILE_SIZE, GRID_SIZE } from '../../js/config/gameConstants.js'; // Added GRID_SIZE
import { UNIT_MODELS, BUILDING_MODELS } from '../config/modelDefaults.js';

export class ThreeRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a); // Dark grey background for better contrast
        
        // Camera setup for Supreme Commander-style top-down RTS view
        const frustumSize = WORLD_SIZE * 1.5; // Base viewing area
        const aspect = canvas.width / canvas.height;
        this.camera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2, // left
            frustumSize * aspect / 2,  // right
            frustumSize / 2,           // top
            -frustumSize / 2,          // bottom
            10,                        // near plane
            WORLD_SIZE * 3            // far plane
        );
        
        // Position camera directly overhead for clean top-down view
        this.camera.position.set(0, 0, WORLD_SIZE * 2); // High above center, looking straight down
        this.camera.lookAt(0, 0, 0); // Look straight down at battlefield center
        this.camera.up.set(0, 1, 0); // Ensure proper orientation
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true
        });
        this.renderer.setSize(canvas.width, canvas.height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Top-down RTS lighting setup
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Bright ambient for clear visibility
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7); // Strong directional light from above
        directionalLight.position.set(0, 0, WORLD_SIZE * 2); // Positioned directly overhead
        directionalLight.target.position.set(0, 0, 0); // Shining straight down
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 4096; // High-quality shadows
        directionalLight.shadow.mapSize.height = 4096;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = WORLD_SIZE * 4;
        directionalLight.shadow.camera.left = -WORLD_SIZE;
        directionalLight.shadow.camera.right = WORLD_SIZE;
        directionalLight.shadow.camera.top = WORLD_SIZE;
        directionalLight.shadow.camera.bottom = -WORLD_SIZE;
        this.scene.add(directionalLight);
        this.scene.add(directionalLight.target);
        
        // Groups for organizing scene objects
        this.terrainGroup = new THREE.Group();
        this.entityGroup = new THREE.Group();
        this.scene.add(this.terrainGroup);
        this.scene.add(this.entityGroup);

        // Disable right-click context menu to prevent default browser behavior
        this.canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
        
        // No initial terrain creation here; it will be created dynamically when data is ready.
        console.log('ThreeRenderer initialized with simple setup');
    }
    
    // Enhanced terrain generation with proper RTS features
    updateTerrain(terrainData) {
        if (!terrainData || Object.keys(terrainData).length === 0) {
            console.error("Terrain data is invalid or not provided to updateTerrain.");
            return;
        }

        // Clear existing terrain objects
        this.terrainGroup.clear();

        const segments = GRID_SIZE;
        const geometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, segments - 1, segments - 1);
        geometry.rotateX(-Math.PI / 2); // Orient the plane horizontally

        const vertices = geometry.attributes.position.array;
        const colors = new Float32Array(vertices.length); // Color array for vertex colors
        const elevationScaleFactor = TILE_SIZE * 8; // Reduced for more reasonable terrain height

        // Adjust vertices and assign colors based on terrain type
        for (let i = 0; i < vertices.length; i += 3) {
            const x = Math.floor((vertices[i] + WORLD_SIZE / 2) / TILE_SIZE);
            const y = Math.floor((vertices[i + 1] + WORLD_SIZE / 2) / TILE_SIZE);

            if (terrainData[x] && terrainData[x][y] !== undefined) {
                const tile = terrainData[x][y];
                vertices[i + 2] = tile.elevation * elevationScaleFactor;
                
                // Assign colors based on terrain type
                let color = new THREE.Color();
                switch(tile.type) {
                    case 0: // WATER
                        color.setHex(0x1E90FF); // Deep sky blue
                        vertices[i + 2] = Math.min(vertices[i + 2], -TILE_SIZE); // Water below ground
                        break;
                    case 1: // LAND
                        color.setHex(0x228B22); // Forest green
                        break;
                    case 2: // MOUNTAIN
                        color.setHex(0x8B4513); // Saddle brown
                        vertices[i + 2] += TILE_SIZE * 4; // Mountains higher
                        break;
                    case 3: // RESOURCE
                        color.setHex(0xFFD700); // Gold
                        break;
                    default:
                        color.setHex(0x228B22); // Default green
                }
                
                colors[i] = color.r;
                colors[i + 1] = color.g;
                colors[i + 2] = color.b;
            }
        }
        
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshLambertMaterial({
            vertexColors: true,
            side: THREE.DoubleSide
        });
        
        this.terrainMesh = new THREE.Mesh(geometry, material);
        this.terrainMesh.position.set(0, 0, 0);
        this.terrainMesh.receiveShadow = true;
        this.terrainGroup.add(this.terrainMesh);
        
        // Add environmental objects
        this.addEnvironmentalObjects(terrainData);
        
        console.log('Enhanced RTS terrain generated with colors and environmental objects');
    }
    
    // Add trees, rocks, debris, and resource nodes
    addEnvironmentalObjects(terrainData) {
        const objectCount = {trees: 0, rocks: 0, debris: 0, resources: 0};
        
        for (let x = 0; x < GRID_SIZE; x += 2) { // Sample every other tile for performance
            for (let y = 0; y < GRID_SIZE; y += 2) {
                if (terrainData[x] && terrainData[x][y]) {
                    const tile = terrainData[x][y];
                    const worldX = x * TILE_SIZE - WORLD_SIZE / 2;
                    const worldY = y * TILE_SIZE - WORLD_SIZE / 2;
                    const worldZ = tile.elevation * TILE_SIZE * 8;
                    
                    // Add trees on land (15% chance)
                    if (tile.type === 1 && Math.random() < 0.15) {
                        this.addTree(worldX, worldY, worldZ);
                        objectCount.trees++;
                    }
                    
                    // Add rocks on mountains (25% chance)
                    if (tile.type === 2 && Math.random() < 0.25) {
                        this.addRock(worldX, worldY, worldZ + TILE_SIZE * 4);
                        objectCount.rocks++;
                    }
                    
                    // Add debris scattered around (5% chance)
                    if (tile.type === 1 && Math.random() < 0.05) {
                        this.addDebris(worldX, worldY, worldZ);
                        objectCount.debris++;
                    }
                    
                    // Add resource nodes (already marked in terrain data)
                    if (tile.type === 3) {
                        this.addResourceNode(worldX, worldY, worldZ, Math.random() < 0.5 ? 'metal' : 'energy');
                        objectCount.resources++;
                    }
                }
            }
        }
        
        console.log(`Added environmental objects: ${objectCount.trees} trees, ${objectCount.rocks} rocks, ${objectCount.debris} debris, ${objectCount.resources} resources`);
    }
    
    addTree(x, y, z) {
        // Simple tree: brown trunk + green top
        const trunkGeometry = new THREE.CylinderGeometry(TILE_SIZE * 0.3, TILE_SIZE * 0.5, TILE_SIZE * 2);
        const trunkMaterial = new THREE.MeshLambertMaterial({color: 0x8B4513}); // Brown
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        
        const leavesGeometry = new THREE.SphereGeometry(TILE_SIZE * 1.2);
        const leavesMaterial = new THREE.MeshLambertMaterial({color: 0x228B22}); // Green
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = TILE_SIZE * 1.5;
        
        const tree = new THREE.Group();
        tree.add(trunk);
        tree.add(leaves);
        tree.position.set(x, y, z + TILE_SIZE);
        tree.castShadow = true;
        
        this.terrainGroup.add(tree);
    }
    
    addRock(x, y, z) {
        const geometry = new THREE.SphereGeometry(TILE_SIZE * 0.8, 6, 4); // Low-poly rock
        const material = new THREE.MeshLambertMaterial({color: 0x696969}); // Dark gray
        const rock = new THREE.Mesh(geometry, material);
        rock.position.set(x, y, z + TILE_SIZE * 0.4);
        rock.castShadow = true;
        this.terrainGroup.add(rock);
    }
    
    addDebris(x, y, z) {
        const geometry = new THREE.BoxGeometry(TILE_SIZE * 0.3, TILE_SIZE * 0.3, TILE_SIZE * 0.2);
        const material = new THREE.MeshLambertMaterial({color: 0x4A4A4A}); // Dark gray
        const debris = new THREE.Mesh(geometry, material);
        debris.position.set(x, y, z + TILE_SIZE * 0.1);
        debris.rotation.y = Math.random() * Math.PI;
        this.terrainGroup.add(debris);
    }
    
    addResourceNode(x, y, z, type) {
        const geometry = new THREE.CylinderGeometry(TILE_SIZE * 0.8, TILE_SIZE * 0.8, TILE_SIZE * 1.5);
        const color = type === 'metal' ? 0xC0C0C0 : 0x0000FF; // Silver for metal, blue for energy
        const material = new THREE.MeshLambertMaterial({color: color, emissive: color, emissiveIntensity: 0.2});
        const resource = new THREE.Mesh(geometry, material);
        resource.position.set(x, y, z + TILE_SIZE * 0.75);
        resource.castShadow = true;
        this.terrainGroup.add(resource);
    }
    
    updateCamera(cameraData) {
        if (!cameraData) return;
        
        // Supreme Commander-style top-down camera positioning
        const zoom = Math.max(0.1, cameraData.zoom || 1.0);
        const frustumSize = (WORLD_SIZE * 1.5) / zoom; // Zoom controls viewing area
        const aspect = this.canvas.width / this.canvas.height;
        
        // Update orthographic camera frustum for zoom
        this.camera.left = -frustumSize * aspect / 2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = -frustumSize / 2;
        
        // Transform camera position to match entity coordinate system (centered at 0,0,0)
        const camX = (cameraData.x || 0) - WORLD_SIZE / 2;
        const camY = (cameraData.y || 0) - WORLD_SIZE / 2;
        
        // Keep camera directly overhead, just move the viewing area
        this.camera.position.set(camX, camY, WORLD_SIZE * 2);
        this.camera.lookAt(camX, camY, 0); // Look straight down at target point
        
        this.camera.updateProjectionMatrix();
    }
    
    createUnitMesh(unit) {
        const modelConfig = UNIT_MODELS[unit.type];
        if (!modelConfig) {
            console.error(`No model config for unit type: ${unit.type}`);
            return new THREE.Mesh();
        }
        
        const loader = new OBJLoader();
        const mesh = new THREE.Group();
        
        loader.load(
            modelConfig.modelPath,
            (object) => {
                object.traverse((child) => {
                    if (child.isMesh) {
                        child.material = new THREE.MeshStandardMaterial({
                            color: unit.team === 'blue' ? 0x0088FF : 0xFF2200
                        });
                        child.castShadow = true;
                    }
                });
                object.scale.set(modelConfig.scale, modelConfig.scale, modelConfig.scale);
                mesh.add(object);
            },
            undefined,
            (error) => {
                console.error(`Error loading model ${modelConfig.modelPath}:`, error);
            }
        );
        
        let terrainZ = 0;
        if (this.terrainMesh) {
            const worldX = unit.x - WORLD_SIZE / 2;
            const worldY = unit.y - WORLD_SIZE / 2;
            const halfWorld = WORLD_SIZE / 2;
            const segmentSize = WORLD_SIZE / (GRID_SIZE - 1);
            const xIndex = Math.floor((worldX + halfWorld) / segmentSize);
            const yIndex = Math.floor((worldY + halfWorld) / segmentSize);
            const vertexIndex = (yIndex * GRID_SIZE + xIndex) * 3;
            if (this.terrainMesh.geometry.attributes.position.array[vertexIndex + 2] !== undefined) {
                terrainZ = this.terrainMesh.geometry.attributes.position.array[vertexIndex + 2];
            } else {
                console.warn(`Could not get terrain Z for unit at (${unit.x}, ${unit.y}).`);
            }
        }
        
        mesh.position.set(
            unit.x - WORLD_SIZE / 2,
            unit.y - WORLD_SIZE / 2,
            terrainZ
        );
        mesh.castShadow = true;
        return mesh;
    }
    
    createBuildingMesh(building) {
        const modelConfig = BUILDING_MODELS[building.type];
        if (!modelConfig) {
            console.error(`No model config for building type: ${building.type}`);
            return new THREE.Mesh();
        }
        
        const loader = new OBJLoader();
        const mesh = new THREE.Group();
        
        loader.load(
            modelConfig.modelPath,
            (object) => {
                object.traverse((child) => {
                    if (child.isMesh) {
                        child.material = new THREE.MeshStandardMaterial({
                            color: building.team === 'blue' ? 0x4488FF : 0xFF4488
                        });
                        child.castShadow = true;
                    }
                });
                object.scale.set(modelConfig.scale, modelConfig.scale, modelConfig.scale);
                mesh.add(object);
            },
            undefined,
            (error) => {
                console.error(`Error loading model ${modelConfig.modelPath}:`, error);
            }
        );

        let terrainZ = 0;
        if (this.terrainMesh) {
            const worldX = building.x - WORLD_SIZE / 2;
            const worldY = building.y - WORLD_SIZE / 2;
            
            const halfWorld = WORLD_SIZE / 2;
            const segmentSize = WORLD_SIZE / (GRID_SIZE - 1);

            const xIndex = Math.floor((worldX + halfWorld) / segmentSize);
            const yIndex = Math.floor((worldY + halfWorld) / segmentSize);

            const vertexIndex = (yIndex * GRID_SIZE + xIndex) * 3;

            if (this.terrainMesh.geometry.attributes.position.array[vertexIndex + 2] !== undefined) {
                terrainZ = this.terrainMesh.geometry.attributes.position.array[vertexIndex + 2];
            } else {
                console.warn(`Could not get terrain Z for building at (${building.x}, ${building.y}). Defaulting to 0.`);
            }
        }
        
        mesh.position.set(
            building.x - WORLD_SIZE / 2,
            building.y - WORLD_SIZE / 2,
            terrainZ
        );
        mesh.castShadow = true;
        
        return mesh;
    }
    
    render(simulation, gameContext) {
        // Animate battling units
        if (simulation?.entityManager?.units) {
            for (const unit of simulation.entityManager.units) {
                if (unit.mesh && unit.state === 'attacking') {
                    unit.mesh.rotation.y += 0.05;  // Simple rotation animation
                }
            }
        }
        
        // Clear previous entities
        this.entityGroup.clear();
        
        let unitCount = 0;
        let buildingCount = 0;

        // Create terrain only once
        if (!this.terrainMesh && simulation?.terrain) {
            this.updateTerrain(simulation.terrain);
        }
        
        // Add units
        if (simulation?.entityManager?.units) {
            for (const unit of simulation.entityManager.units) {
                const mesh = this.createUnitMesh(unit);
                this.entityGroup.add(mesh);
                unitCount++;
            }
        }
        
        // Add buildings
        if (simulation?.entityManager?.buildings) {
            for (const building of simulation.entityManager.buildings) {
                const mesh = this.createBuildingMesh(building);
                this.entityGroup.add(mesh);
                buildingCount++;
            }
        }
        
        // Only log occasionally to avoid spam
        if (Math.random() < 0.01) {
            console.log(`Scene contains: ${unitCount} units, ${buildingCount} buildings`);
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    resize(width, height) {
        // Update orthographic camera aspect ratio
        const aspect = width / height;
        const frustumSize = WORLD_SIZE * 1.5;
        this.camera.left = -frustumSize * aspect / 2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = -frustumSize / 2;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}

export function initThreeRenderer(canvas) {
    return new ThreeRenderer(canvas);
}