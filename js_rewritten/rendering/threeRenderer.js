// js_rewritten/rendering/threeRenderer.js - Simplified and perfected Three.js renderer

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WORLD_SIZE, TILE_SIZE, GRID_SIZE } from '../../js/config/gameConstants.js'; // Added GRID_SIZE
import { UNIT_MODELS, BUILDING_MODELS } from '../config/modelDefaults.js';

export class ThreeRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.modelManifest = null;
        this.gltfLoader = new GLTFLoader();
        this.textureLoader = new THREE.TextureLoader(); // For potential later use with glTF materials if needed
        
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
        // Manifest loading is deliberately not awaited in constructor to keep constructor synchronous.
        // The caller (initThreeRenderer) should handle the promise.
        this.manifestPromise = this.loadModelManifest();
        console.log('ThreeRenderer initialized, manifest loading started.');
    }

    async loadModelManifest() {
        try {
            const response = await fetch('assets/model-manifest.json');
            if (!response.ok) {
                throw new Error(`Failed to fetch model manifest: ${response.statusText}`);
            }
            this.modelManifest = await response.json();
            // Convert array to object for easier lookup
            this.modelManifest = this.modelManifest.reduce((acc, model) => {
                acc[model.id] = model;
                return acc;
            }, {});
            console.log('Model manifest loaded and processed successfully.');
        } catch (error) {
            console.error('Error loading model manifest:', error);
            this.modelManifest = {}; // Ensure it's an object to prevent errors
        }
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
        
        const mesh = new THREE.Group(); // Use a group to apply transformations and hold the model

        if (!this.modelManifest) {
            console.error("Model manifest not loaded yet. Cannot create unit mesh.");
            // Return a placeholder or empty group
            const placeholderGeometry = new THREE.BoxGeometry(modelConfig.size || TILE_SIZE, modelConfig.size || TILE_SIZE, modelConfig.size || TILE_SIZE);
            const placeholderMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true }); // Magenta placeholder
            mesh.add(new THREE.Mesh(placeholderGeometry, placeholderMaterial));
            this.setMeshPosition(mesh, unit);
            return mesh;
        }

        const modelIdentifier = modelConfig.modelPath; // This is now the ID, e.g., "commander"
        const manifestEntry = this.modelManifest[modelIdentifier];

        if (manifestEntry) {
            this.gltfLoader.load(
                manifestEntry.path, // Path from manifest, e.g., "models_optimized/commander.glb"
                (gltf) => {
                    const loadedScene = gltf.scene;
                    loadedScene.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            // Apply team color - glTF materials can be complex.
                            // This is a simple approach; might need refinement based on actual model structure.
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(m => this.applyTeamColor(m, unit.team));
                                } else {
                                    this.applyTeamColor(child.material, unit.team);
                                }
                            }
                        }
                    });
                    // Apply scale from modelDefaults.js
                    loadedScene.scale.set(modelConfig.scale, modelConfig.scale, modelConfig.scale);
                    mesh.add(loadedScene);
                },
                undefined, // onProgress callback (optional)
                (error) => {
                    console.error(`Error loading GLTF model ${modelIdentifier} (${manifestEntry.path}):`, error);
                    const placeholderGeometry = new THREE.BoxGeometry(modelConfig.size || TILE_SIZE, modelConfig.size || TILE_SIZE, modelConfig.size || TILE_SIZE);
                    const placeholderMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true }); // Red placeholder
                    mesh.add(new THREE.Mesh(placeholderGeometry, placeholderMaterial));
                }
            );
        } else {
            console.error(`Model identifier '${modelIdentifier}' not found in manifest.`);
            const placeholderGeometry = new THREE.BoxGeometry(modelConfig.size || TILE_SIZE, modelConfig.size || TILE_SIZE, modelConfig.size || TILE_SIZE);
            const placeholderMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true }); // Yellow placeholder
            mesh.add(new THREE.Mesh(placeholderGeometry, placeholderMaterial));
        }
        
        this.setMeshPosition(mesh, unit); // Helper function to set position based on terrain
        mesh.castShadow = true; // The group itself might not cast shadow, but its children will
        return mesh;
    }

    applyTeamColor(material, team) {
        // Ensure material is MeshStandardMaterial or similar that has a 'color' property.
        if (material.isMeshStandardMaterial || material.isMeshLambertMaterial) {
            material.color.set(team === 'blue' ? 0x0088FF : 0xFF2200);
            // Potentially preserve other material properties like maps if they exist
            // material.needsUpdate = true; // May be needed if materials are shared or cloned
        } else {
            // If it's a different material type, you might need specific handling
            // or create a new MeshStandardMaterial.
            // For simplicity, we'll try to color it if it has a color property.
            if (material.color) {
                 material.color.set(team === 'blue' ? 0x0088FF : 0xFF2200);
            }
        }
    }

    setMeshPosition(mesh, entity) {
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
                console.warn(`Could not get terrain Z for entity at (${entity.x}, ${entity.y}).`);
            }
        }
        mesh.position.set(
            entity.x - WORLD_SIZE / 2,
            entity.y - WORLD_SIZE / 2,
            terrainZ
        );
    }
    
    createBuildingMesh(building) {
        const modelConfig = BUILDING_MODELS[building.type];
        if (!modelConfig) {
            console.error(`No model config for building type: ${building.type}`);
            return new THREE.Mesh();
        }
        
        const mesh = new THREE.Group(); // Use a group to apply transformations and hold the model

        if (!this.modelManifest) {
            console.error("Model manifest not loaded yet. Cannot create building mesh.");
            const placeholderGeometry = new THREE.BoxGeometry(modelConfig.size || TILE_SIZE * 2, modelConfig.size || TILE_SIZE * 2, modelConfig.size || TILE_SIZE * 2);
            const placeholderMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true }); // Magenta placeholder
            mesh.add(new THREE.Mesh(placeholderGeometry, placeholderMaterial));
            this.setMeshPosition(mesh, building);
            return mesh;
        }

        const modelIdentifier = modelConfig.modelPath; // This is now the ID, e.g., "landFactory"
        const manifestEntry = this.modelManifest[modelIdentifier];

        if (manifestEntry) {
            this.gltfLoader.load(
                manifestEntry.path, // Path from manifest
                (gltf) => {
                    const loadedScene = gltf.scene;
                    loadedScene.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            // Apply team color or specific building material
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(m => this.applyTeamColor(m, building.team === 'blue' ? 'blue' : 'red')); // Ensure team string
                                } else {
                                    this.applyTeamColor(child.material, building.team === 'blue' ? 'blue' : 'red'); // Ensure team string
                                }
                            }
                        }
                    });
                    loadedScene.scale.set(modelConfig.scale, modelConfig.scale, modelConfig.scale);
                    mesh.add(loadedScene);
                },
                undefined, // onProgress
                (error) => {
                    console.error(`Error loading GLTF model ${modelIdentifier} (${manifestEntry.path}):`, error);
                    const placeholderGeometry = new THREE.BoxGeometry(modelConfig.size || TILE_SIZE * 2, modelConfig.size || TILE_SIZE * 2, modelConfig.size || TILE_SIZE * 2);
                    const placeholderMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true }); // Red placeholder
                    mesh.add(new THREE.Mesh(placeholderGeometry, placeholderMaterial));
                }
            );
        } else {
            console.error(`Model identifier '${modelIdentifier}' not found in manifest.`);
            const placeholderGeometry = new THREE.BoxGeometry(modelConfig.size || TILE_SIZE * 2, modelConfig.size || TILE_SIZE * 2, modelConfig.size || TILE_SIZE * 2);
            const placeholderMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true }); // Yellow placeholder
            mesh.add(new THREE.Mesh(placeholderGeometry, placeholderMaterial));
        }

        this.setMeshPosition(mesh, building); // Helper function to set position
        mesh.castShadow = true; // The group itself might not cast shadow, but its children will
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
                console.warn(`Could not get terrain Z for entity at (${entity.x}, ${entity.y}). Defaulting to 0.`);
            }
        }
         mesh.position.set(
            entity.x - WORLD_SIZE / 2,
            entity.y - WORLD_SIZE / 2,
            terrainZ
        );
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

export async function initThreeRenderer(canvas) {
    const renderer = new ThreeRenderer(canvas);
    await renderer.manifestPromise; // Ensure manifest is loaded before renderer is considered fully initialized
    return renderer;
}