import { GRID_SIZE, TILE_SIZE, TERRAIN_TYPES, UNIT_TYPES, BUILDING_TYPES } from './config.js';
import { addEvent } from './eventSystem.js'; // Will be circular if eventSystem imports entities, handle later
// Forward declare or pass global objects like 'captions', 'effects', 'resources' if they are directly manipulated
// For now, assuming they might be passed to methods or accessed via a global context if necessary
// This will be a major part of the refactoring in step 5.


export { Unit };

export { Building };

export { Effect };

export { Caption };
