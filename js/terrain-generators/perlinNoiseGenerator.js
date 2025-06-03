import { WORLD_SIZE, TILE_SIZE, GRID_SIZE, TERRAIN_TYPES, MIN_LAND_PERCENTAGE, MAX_TERRAIN_RETRIES } from '../config/gameConstants.js';

// Perlin noise implementation
class PerlinNoise {
    constructor(seed = null) {
        this.seed = seed || Math.random();
        this.permutation = this.generatePermutation();
        this.p = [...this.permutation, ...this.permutation]; // Duplicate for wrapping
    }

    generatePermutation() {
        const perm = Array.from({length: 256}, (_, i) => i);
        // Fisher-Yates shuffle with seed
        let random = this.seed;
        for (let i = perm.length - 1; i > 0; i--) {
            random = (random * 9301 + 49297) % 233280; // Linear congruential generator
            const j = Math.floor((random / 233280) * (i + 1));
            [perm[i], perm[j]] = [perm[j], perm[i]];
        }
        return perm;
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(t, a, b) {
        return a + t * (b - a);
    }

    grad(hash, x, y) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    noise(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        
        x -= Math.floor(x);
        y -= Math.floor(y);
        
        const u = this.fade(x);
        const v = this.fade(y);
        
        const A = this.p[X] + Y;
        const AA = this.p[A];
        const AB = this.p[A + 1];
        const B = this.p[X + 1] + Y;
        const BA = this.p[B];
        const BB = this.p[B + 1];
        
        return this.lerp(v,
            this.lerp(u, this.grad(this.p[AA], x, y), this.grad(this.p[BA], x - 1, y)),
            this.lerp(u, this.grad(this.p[AB], x, y - 1), this.grad(this.p[BB], x - 1, y - 1))
        );
    }

    octaveNoise(x, y, octaves = 4, persistence = 0.5, scale = 0.01) {
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            value += this.noise(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }

        return value / maxValue;
    }
}

/**
 * Generates terrain using proper Perlin noise with elevation model and sea level.
 * @param {object} gameContext - The game context object, containing seedRandom, terrain, and resourceNodes.
 * @param {number} retries - Current retry count for land percentage.
 */
export function generatePerlinNoiseTerrain(gameContext, retries = 0) {
    console.log("Generating Perlin noise terrain with elevation model...");
    
    const SEA_LEVEL = 0.0;
    const perlin = new PerlinNoise(gameContext.GAME_SEED);
    
    // Initialize terrain and mobility mesh
    gameContext.terrain = [];
    gameContext.mobilityMesh = [];
    
    for (let x = 0; x < GRID_SIZE; x++) {
        gameContext.terrain[x] = [];
        gameContext.mobilityMesh[x] = [];
        
        for (let y = 0; y < GRID_SIZE; y++) {
            // Generate elevation using multiple octaves of Perlin noise
            const baseElevation = perlin.octaveNoise(x, y, 4, 0.5, 0.02);
            const detailNoise = perlin.octaveNoise(x, y, 2, 0.3, 0.08) * 0.3;
            const elevation = baseElevation + detailNoise;
            
            // Determine terrain type based on elevation relative to sea level
            let terrainType;
            if (elevation < SEA_LEVEL - 0.1) {
                terrainType = TERRAIN_TYPES.WATER;
            } else if (elevation > SEA_LEVEL + 0.6) {
                terrainType = TERRAIN_TYPES.MOUNTAIN;
            } else {
                terrainType = TERRAIN_TYPES.LAND;
            }

            gameContext.terrain[x][y] = {
                type: terrainType,
                elevation: elevation
            };

            // Generate mobility mesh - movement cost based on terrain
            let movementCost = 1.0; // Default movement cost
            switch (terrainType) {
                case TERRAIN_TYPES.WATER:
                    movementCost = 999.0; // Very high cost for land units
                    break;
                case TERRAIN_TYPES.MOUNTAIN:
                    movementCost = 3.0; // High cost for mountains
                    break;
                case TERRAIN_TYPES.LAND:
                    const steepness = Math.abs(elevation - SEA_LEVEL);
                    movementCost = 1.0 + steepness * 0.5; // Gradual cost increase with elevation
                    break;
            }

            gameContext.mobilityMesh[x][y] = {
                cost: movementCost,
                passable: terrainType !== TERRAIN_TYPES.WATER
            };
        }
    }

    // Calculate land percentage for validation
    let landTiles = 0;
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            if (gameContext.terrain[x][y].type === TERRAIN_TYPES.LAND) {
                landTiles++;
            }
        }
    }

    const totalTiles = GRID_SIZE * GRID_SIZE;
    const landPercentage = landTiles / totalTiles;

    console.log(`Terrain generated with ${landPercentage.toFixed(2)} land percentage.`);

    // Validate land percentage
    if (landPercentage < MIN_LAND_PERCENTAGE && retries < MAX_TERRAIN_RETRIES) {
        console.log(`Land percentage ${landPercentage.toFixed(2)} is less than ${MIN_LAND_PERCENTAGE}. Regenerating terrain (attempt ${retries + 1}/${MAX_TERRAIN_RETRIES}).`);
        return generatePerlinNoiseTerrain(gameContext, retries + 1);
    } else if (landPercentage < MIN_LAND_PERCENTAGE) {
        console.warn(`Failed to achieve minimum land percentage after ${MAX_TERRAIN_RETRIES} attempts. Current land: ${landPercentage.toFixed(2)}. Using current terrain anyway.`);
    }

    // Generate resource nodes on land tiles
    if (!gameContext.resourceNodes) {
        gameContext.resourceNodes = [];
    }
    
    // Place some resource nodes on suitable land tiles
    const resourceDensity = 0.002; // 0.2% of land tiles get resources
    const maxResources = Math.floor(landTiles * resourceDensity);
    let resourcesPlaced = 0;

    for (let attempts = 0; attempts < maxResources * 10 && resourcesPlaced < maxResources; attempts++) {
        const x = Math.floor(gameContext.seedRandom ? gameContext.seedRandom.random() * GRID_SIZE : Math.random() * GRID_SIZE);
        const y = Math.floor(gameContext.seedRandom ? gameContext.seedRandom.random() * GRID_SIZE : Math.random() * GRID_SIZE);
        
        if (gameContext.terrain[x] && gameContext.terrain[x][y] &&
            gameContext.terrain[x][y].type === TERRAIN_TYPES.LAND &&
            gameContext.terrain[x][y].elevation > SEA_LEVEL + 0.1) { // Only on elevated land
            
            // Check if resource already exists nearby
            let tooClose = false;
            for (const existing of gameContext.resourceNodes) {
                const dx = existing.x - x;
                const dy = existing.y - y;
                if (dx * dx + dy * dy < 100) { // Minimum distance between resources
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                gameContext.terrain[x][y].type = TERRAIN_TYPES.RESOURCE;
                gameContext.resourceNodes.push({
                    x: x,
                    y: y,
                    type: 'mass', // Default resource type
                    amount: 1000
                });
                resourcesPlaced++;
            }
        }
    }

    console.log(`Placed ${resourcesPlaced} resource nodes on terrain.`);
    console.log("Terrain generated using perlinNoiseGenerator.");
}

// Helper function for generating fallback terrain with proper structure
function generateDefaultTerrain() {
    const defaultTerrain = [];
    for (let x = 0; x < GRID_SIZE; x++) {
        defaultTerrain[x] = [];
        for (let y = 0; y < GRID_SIZE; y++) {
            // Create proper terrain objects with type and elevation
            defaultTerrain[x][y] = {
                type: TERRAIN_TYPES.LAND,
                elevation: 0.1
            };
        }
    }
    return defaultTerrain;
}