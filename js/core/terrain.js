import { WORLD_SIZE, TILE_SIZE, GRID_SIZE, TERRAIN_TYPES } from '../config/gameConstants.js';
import { generateTerrain as generateManagedTerrain } from './terrainManager.js'; // Import the managed generator

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

