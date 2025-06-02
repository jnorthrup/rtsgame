import { WORLD_SIZE, TILE_SIZE, GRID_SIZE, TERRAIN_TYPES, MIN_LAND_PERCENTAGE, MAX_TERRAIN_RETRIES } from '../config/gameConstants.js';

/**
 * Generates terrain using a Perlin-like noise algorithm.
 * @param {object} gameContext - The game context object, containing seedRandom, terrain, and resourceNodes.
 * @param {number} retries - Current retry count for land percentage.
 */
export function generatePerlinNoiseTerrain(gameContext, retries = 0) {
    console.log("Generating Perlin noise terrain...");
    for (let x = 0; x < GRID_SIZE; x++) {
        gameContext.terrain[x] = [];
        for (let y = 0; y < GRID_SIZE; y++) {
            const noise1 = Math.sin(x * 0.05) * Math.cos(y * 0.05);
            const noise2 = Math.sin(x * 0.1 + 100) * Math.cos(y * 0.1 + 100) * 0.5;
            const noise = (noise1 + noise2 + (gameContext.seedRandom.random() * 0.1)) * 1.5;

            if (noise < -0.1) {
                gameContext.terrain[x][y] = TERRAIN_TYPES.WATER;
            } else if (noise > 0.7) {
                gameContext.terrain[x][y] = TERRAIN_TYPES.MOUNTAIN;
            } else {
                gameContext.terrain[x][y] = TERRAIN_TYPES.LAND;
            }
        }
    }

    let landTiles = 0;
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            if (gameContext.terrain[x][y] === TERRAIN_TYPES.LAND) {
                landTiles++;
            }
        }
    }

    const totalTiles = GRID_SIZE * GRID_SIZE;
    const landPercentage = landTiles / totalTiles;

    if (landPercentage < MIN_LAND_PERCENTAGE && retries < MAX_TERRAIN_RETRIES) {
        console.log(`Land percentage ${landPercentage.toFixed(2)} is less than ${MIN_LAND_PERCENTAGE}. Regenerating terrain (attempt ${retries + 1}/${MAX_TERRAIN_RETRIES}).`);
        // Recursive call to itself
        return generatePerlinNoiseTerrain(gameContext, retries + 1);
    } else if (landPercentage < MIN_LAND_PERCENTAGE) {
        console.warn(`Failed to achieve minimum land percentage after ${MAX_TERRAIN_RETRIES} attempts. Current land: ${landPercentage.toFixed(2)}. Falling back to default terrain.`);
        // Assuming generateDefaultTerrain is a function that returns a default terrain grid
        // This function would need to be defined or imported if it's external.
        // For now, let's assume it's defined elsewhere or we create a simple placeholder.
        gameContext.terrain = generateDefaultTerrain();
    }
}

// Placeholder for generateDefaultTerrain if it's not imported.
// In a real scenario, this would likely be in gameConstants or a utility.
function generateDefaultTerrain() {
    const defaultTerrain = [];
    for (let x = 0; x < GRID_SIZE; x++) {
        defaultTerrain[x] = [];
        for (let y = 0; y < GRID_SIZE; y++) {
            defaultTerrain[x][y] = TERRAIN_TYPES.LAND; // Default to all land for simplicity
        }
    }
    return defaultTerrain;
}