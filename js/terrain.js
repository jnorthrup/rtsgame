import { GRID_SIZE, WORLD_SIZE, TILE_SIZE, TERRAIN_TYPES } from './constants.js';
import { _setUnitDependencies } from './entities/Unit.js';

export let terrain = [];
export let resourceNodes = [];

export function generateTerrain() {
    // Clear existing terrain and resource nodes before generating new ones
    terrain.length = 0;
    resourceNodes.length = 0;

    for (let x = 0; x < GRID_SIZE; x++) {
        terrain[x] = [];
        for (let y = 0; y < GRID_SIZE; y++) {
            const noise1 = Math.sin(x * 0.05) * Math.cos(y * 0.05);
            const noise2 = Math.sin(x * 0.1 + 100) * Math.cos(y * 0.1 + 100) * 0.5;
            const noise = noise1 + noise2 + Math.random() * 0.3;

            if (noise < -0.2) {
                terrain[x][y] = TERRAIN_TYPES.WATER;
            } else if (noise > 0.6) {
                terrain[x][y] = TERRAIN_TYPES.MOUNTAIN;
            } else {
                terrain[x][y] = TERRAIN_TYPES.LAND;
            }
        }
    }

    for (let i = 0; i < 30; i++) {
        const x = Math.random() * WORLD_SIZE;
        const y = Math.random() * WORLD_SIZE;
        const type = Math.random() < 0.5 ? 'mass' : 'energy';
        resourceNodes.push({
            x: x,
            y: y,
            type: type,
            amount: 10000,
            maxAmount: 10000,
            occupied: false
        });
    }
    // Pass the initialized arrays to Unit module
    // This assumes Unit.js is loaded and _setUnitDependencies is ready.
    // If there are circular dependency issues, this might need to be called later from main.js or gameLoop.js
    _setUnitDependencies({ terrain: terrain, resourceNodes: resourceNodes });
}

export function findLandPosition(targetX, targetY) {
    let bestX = targetX;
    let bestY = targetY;
    let minDist = Infinity;

    if (terrain.length === 0) { // Guard against empty terrain array
        console.warn("findLandPosition called before terrain generation.");
        return {x: targetX, y: targetY};
    }

    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            if (terrain[x] && terrain[x][y] === TERRAIN_TYPES.LAND) { // Check terrain[x] exists
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

export function findWaterPosition(targetX, targetY) {
    let bestX = targetX;
    let bestY = targetY;
    let minDist = Infinity;

    if (terrain.length === 0) { // Guard against empty terrain array
        console.warn("findWaterPosition called before terrain generation.");
        return {x: targetX, y: targetY};
    }

    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            if (terrain[x] && terrain[x][y] === TERRAIN_TYPES.WATER) { // Check terrain[x] exists
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
