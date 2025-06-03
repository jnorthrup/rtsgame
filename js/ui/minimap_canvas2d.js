// js/ui/minimap_canvas2d.js - Handles 2D Canvas Minimap Rendering

import { TERRAIN_TYPES, WORLD_SIZE, GRID_SIZE, TILE_SIZE } from '../config/gameConstants.js';
import { UNIT_TYPES } from '../config/unitTypes.js';
// BUILDING_TYPES was imported in the old renderer.js for drawMinimap but not used.
// If any building-specific minimap logic is added later, it might be needed.

export function drawMinimap(minimapRenderContext) {
    const { minimapCtx, terrain, resourceNodes, units, buildings, camera } = minimapRenderContext;

    if (!minimapCtx) {
        // console.warn("minimapCtx not found in minimapRenderContext. Skipping minimap draw.");
        // This can be noisy if minimap canvas is optional.
        return;
    }

    // Clear minimap
    minimapCtx.fillStyle = '#000'; // Black background for minimap
    minimapCtx.fillRect(0, 0, 200, 200); // Assuming minimap size is fixed at 200x200

    // Draw terrain (simplified)
    const scale = 200 / GRID_SIZE;
    if (terrain && Object.keys(terrain).length > 0) {
        for (let x = 0; x < GRID_SIZE; x += 2) { // Optimized to draw larger blocks
            for (let y = 0; y < GRID_SIZE; y += 2) {
                if (!terrain[x] || terrain[x][y] === undefined) continue;
                const terrainType = terrain[x][y].type || terrain[x][y]; // Support both old and new format
                switch (terrainType) {
                    case TERRAIN_TYPES.WATER:
                        minimapCtx.fillStyle = '#135'; // Dark Blue
                        break;
                    case TERRAIN_TYPES.LAND:
                        minimapCtx.fillStyle = '#242'; // Dark Green
                        break;
                    case TERRAIN_TYPES.MOUNTAIN:
                        minimapCtx.fillStyle = '#444'; // Dark Grey
                        break;
                    default:
                        minimapCtx.fillStyle = '#111'; // Very Dark Grey for unknown
                }
                minimapCtx.fillRect(x * scale, y * scale, scale * 2, scale * 2);
            }
        }
    } else {
        minimapCtx.fillStyle = '#111';
        minimapCtx.fillRect(0,0,200,200);
        minimapCtx.fillStyle = '#FFF';
        minimapCtx.fillText("No terrain data", 50, 100);
    }


    // Draw resource nodes
    if (resourceNodes) {
        for (const node of resourceNodes) {
            if (node.amount > 0) {
                minimapCtx.fillStyle = node.type === 'mass' ? '#666' : '#880'; // Grey for mass, Dark Yellow for energy
                const mx = (node.x / WORLD_SIZE) * 200;
                const my = (node.y / WORLD_SIZE) * 200;
                minimapCtx.fillRect(mx - 1, my - 1, 2, 2);
            }
        }
    }

    // Draw units on minimap
    if (units) {
        for (const unit of units) {
            minimapCtx.fillStyle = unit.team === 'blue' ? '#66f' : '#f66'; // Brighter for units
            const mx = (unit.x / WORLD_SIZE) * 200;
            const my = (unit.y / WORLD_SIZE) * 200;
            minimapCtx.fillRect(mx - 1, my - 1, 2, 2);
        }
    }

    // Draw buildings on minimap
    if (buildings) {
        for (const building of buildings) {
            minimapCtx.fillStyle = building.team === 'blue' ? '#aaf' : '#faa'; // Lighter for buildings
            const mx = (building.x / WORLD_SIZE) * 200;
            const my = (building.y / WORLD_SIZE) * 200;
            minimapCtx.fillRect(mx - 2, my - 2, 4, 4); 
        }
    }
    
    // Highlight ACUs (units) on minimap
    if (units) {
        for (const unit of units) {
            if (unit.type === UNIT_TYPES.commander) { 
                minimapCtx.strokeStyle = unit.team === 'blue' ? '#00f' : '#f00'; 
                minimapCtx.lineWidth = 1; 
                const mx = (unit.x / WORLD_SIZE) * 200;
                const my = (unit.y / WORLD_SIZE) * 200;
                minimapCtx.strokeRect(mx - 2, my - 2, 4, 4); 
            }
        }
    }

    // Draw camera viewport
    if (camera) {
        minimapCtx.strokeStyle = '#0ff'; // Cyan
        minimapCtx.lineWidth = 1; // Thinner line for viewport
        const viewLeft = ((camera.x - camera.canvasWidth / 2 / camera.zoom) / WORLD_SIZE) * 200;
        const viewTop = ((camera.y - camera.canvasHeight / 2 / camera.zoom) / WORLD_SIZE) * 200;
        const viewWidth = (camera.canvasWidth / camera.zoom / WORLD_SIZE) * 200;
        const viewHeight = (camera.canvasHeight / camera.zoom / WORLD_SIZE) * 200;
        minimapCtx.strokeRect(viewLeft, viewTop, viewWidth, viewHeight);
    }
}
