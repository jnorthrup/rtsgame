import { WORLD_SIZE, TILE_SIZE, GRID_SIZE, TERRAIN_TYPES, MIN_LAND_PERCENTAGE, MAX_TERRAIN_RETRIES } from '../config/gameConstants.js';

// Note: gameContext is expected to be an object containing:
// gameContext.terrain (for the grid)
// gameContext.resourceNodes (for resource node generation)

export function isAreaClear(gameContext, gridX, gridY, size, terrainType) {
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const x = gridX + i;
            const y = gridY + j;
            // Check bounds and terrain type
            // GRID_SIZE is imported directly
            if (x >= GRID_SIZE || y >= GRID_SIZE || !gameContext.terrain[x] || gameContext.terrain[x][y] === undefined || gameContext.terrain[x][y] !== terrainType) {
                return false;
            }
        }
    }
    return true;
}

export function findLandPosition(gameContext, targetX, targetY, minAreaSize = 3) {
    let bestCandidate = null;
    let minDist = Infinity;

    // GRID_SIZE, TILE_SIZE, TERRAIN_TYPES are imported directly
    for (let x = 0; x <= GRID_SIZE - minAreaSize; x++) {
        for (let y = 0; y <= GRID_SIZE - minAreaSize; y++) {
            if (gameContext.terrain[x] && gameContext.terrain[x][y] === TERRAIN_TYPES.LAND) {
                // isAreaClear is now local to this module
                if (isAreaClear(gameContext, x, y, minAreaSize, TERRAIN_TYPES.LAND)) {
                    const areaCenterX = (x + minAreaSize / 2) * TILE_SIZE;
                    const areaCenterY = (y + minAreaSize / 2) * TILE_SIZE;

                    const dist = Math.sqrt((areaCenterX - targetX) ** 2 + (areaCenterY - targetY) ** 2);

                    if (dist < minDist) {
                        minDist = dist;
                        bestCandidate = { x: areaCenterX, y: areaCenterY };
                    }
                }
            }
        }
    }
    return bestCandidate;
}

export function findWaterPosition(gameContext, targetX, targetY) {
    let bestX = targetX;
    let bestY = targetY;
    let minDist = Infinity;

    // GRID_SIZE, TILE_SIZE, TERRAIN_TYPES are imported directly
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            if (gameContext.terrain[x] && gameContext.terrain[x][y] === TERRAIN_TYPES.WATER) {
                const worldX = x * TILE_SIZE + TILE_SIZE / 2;
                const worldY = y * TILE_SIZE + TILE_SIZE / 2;
                const dist = Math.sqrt((worldX - targetX) ** 2 + (worldY - targetY) ** 2);
                if (dist < minDist) {
                    minDist = dist;
                    bestX = worldX;
                    bestY = worldY;
                }
            }
        }
    }
    return { x: bestX, y: bestY };
}

export function generateTerrain(gameContext, retries = 0) {
    // GRID_SIZE, TERRAIN_TYPES, MIN_LAND_PERCENTAGE, MAX_TERRAIN_RETRIES, WORLD_SIZE are imported
    // gameContext.terrain and gameContext.resourceNodes are used
    for (let x = 0; x < GRID_SIZE; x++) {
        gameContext.terrain[x] = [];
        for (let y = 0; y < GRID_SIZE; y++) {
            const noise1 = Math.sin(x * 0.05) * Math.cos(y * 0.05);
            const noise2 = Math.sin(x * 0.1 + 100) * Math.cos(y * 0.1 + 100) * 0.5;
            const noise = noise1 + noise2 + Math.random() * 0.1;

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
        return generateTerrain(gameContext, retries + 1);
    } else if (landPercentage < MIN_LAND_PERCENTAGE) {
        console.warn(`Failed to achieve minimum land percentage after ${MAX_TERRAIN_RETRIES} attempts. Current land: ${landPercentage.toFixed(2)}`);
    }

    gameContext.resourceNodes.length = 0;
    for (let i = 0; i < 30; i++) { // Number of resource nodes
        const x = Math.random() * WORLD_SIZE;
        const y = Math.random() * WORLD_SIZE;
        const type = Math.random() < 0.5 ? 'mass' : 'energy';
        gameContext.resourceNodes.push({
            x: x,
            y: y,
            type: type,
            amount: 10000,
            maxAmount: 10000,
            occupied: false
        });
    }
}
