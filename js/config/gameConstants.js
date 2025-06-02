const WORLD_SIZE = 5000;
const TILE_SIZE = 50;
const GRID_SIZE = WORLD_SIZE / TILE_SIZE; // Order is important here

const TERRAIN_TYPES = {
    WATER: 0,
    LAND: 1,
    MOUNTAIN: 2,
    RESOURCE: 3 // New terrain type for resources
};

const MIN_LAND_PERCENTAGE = 0.3;
const MAX_TERRAIN_RETRIES = 5;

export {
    WORLD_SIZE,
    TILE_SIZE,
    GRID_SIZE,
    TERRAIN_TYPES,
    MIN_LAND_PERCENTAGE,
    MAX_TERRAIN_RETRIES
};
