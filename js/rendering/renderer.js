import { TERRAIN_TYPES, TILE_SIZE, GRID_SIZE, WORLD_SIZE } from '../config/gameConstants.js'; // Import necessary constants
// Building, Unit, Effect, Caption classes are not directly instantiated here,
// but their instances (from gameContext) have .draw() methods called.
// BUILDING_TYPES and UNIT_TYPES are used by drawMinimap for commander highlighting.
import { BUILDING_TYPES } from '../config/buildingTypes.js';
import { UNIT_TYPES } from '../config/unitTypes.js';
import { updateUI } from './ui.js'; // Import updateUI


// drawMinimap is a helper for render, so it's not exported.
function drawMinimap(gameContext) {
    const { minimapCtx, terrain, resourceNodes, units, buildings, camera } = gameContext;

    if (!minimapCtx) {
        console.warn("minimapCtx not found in gameContext. Skipping minimap draw.");
        return;
    }

    // Clear minimap
    minimapCtx.fillStyle = '#000';
    minimapCtx.fillRect(0, 0, 200, 200); // Assuming minimap size is fixed at 200x200

    // Draw terrain (simplified)
    const scale = 200 / GRID_SIZE;
    for (let x = 0; x < GRID_SIZE; x += 2) {
        for (let y = 0; y < GRID_SIZE; y += 2) {
            if (!terrain[x] || terrain[x][y] === undefined) continue;
            switch (terrain[x][y]) {
                case TERRAIN_TYPES.WATER:
                    minimapCtx.fillStyle = '#135';
                    break;
                case TERRAIN_TYPES.LAND:
                    minimapCtx.fillStyle = '#242';
                    break;
                case TERRAIN_TYPES.MOUNTAIN:
                    minimapCtx.fillStyle = '#444';
                    break;
                default:
                    minimapCtx.fillStyle = '#111';
            }
            minimapCtx.fillRect(x * scale, y * scale, scale * 2, scale * 2);
        }
    }

    // Draw resource nodes
    for (const node of resourceNodes) {
        if (node.amount > 0) {
            minimapCtx.fillStyle = node.type === 'mass' ? '#666' : '#880';
            const mx = (node.x / WORLD_SIZE) * 200;
            const my = (node.y / WORLD_SIZE) * 200;
            minimapCtx.fillRect(mx - 1, my - 1, 2, 2);
        }
    }

    // Draw units on minimap
    for (const unit of units) {
        minimapCtx.fillStyle = unit.team === 'blue' ? '#44f' : '#f44';
        const mx = (unit.x / WORLD_SIZE) * 200;
        const my = (unit.y / WORLD_SIZE) * 200;
        minimapCtx.fillRect(mx - 1, my - 1, 2, 2);
    }

    // Draw buildings on minimap
    for (const building of buildings) {
        minimapCtx.fillStyle = building.team === 'blue' ? '#88f' : '#f88';
        const mx = (building.x / WORLD_SIZE) * 200;
        const my = (building.y / WORLD_SIZE) * 200;
        minimapCtx.fillRect(mx - 2, my - 2, 4, 4);

        // The check for building.type === BUILDING_TYPES.commander was removed here.
        // Commanders are units (UNIT_TYPES.commander) and are highlighted in the loop below.
    }
    // Highlight ACUs (units) on minimap
     for (const unit of units) {
        if (unit.type === UNIT_TYPES.commander) { // UNIT_TYPES.commander is defined
            minimapCtx.strokeStyle = unit.team === 'blue' ? '#00f' : '#f00'; // Team specific commander highlight
            minimapCtx.lineWidth = 1; // thinner line for unit commander
            const mx = (unit.x / WORLD_SIZE) * 200;
            const my = (unit.y / WORLD_SIZE) * 200;
            minimapCtx.strokeRect(mx - 2, my - 2, 4, 4); // Slightly larger box for commander unit
        }
    }


    // Draw camera viewport
    minimapCtx.strokeStyle = '#0ff';
    minimapCtx.lineWidth = 2;
    const viewLeft = ((camera.x - camera.canvasWidth / 2 / camera.zoom) / WORLD_SIZE) * 200;
    const viewTop = ((camera.y - camera.canvasHeight / 2 / camera.zoom) / WORLD_SIZE) * 200;
    const viewWidth = (camera.canvasWidth / camera.zoom / WORLD_SIZE) * 200;
    const viewHeight = (camera.canvasHeight / camera.zoom / WORLD_SIZE) * 200;
    minimapCtx.strokeRect(viewLeft, viewTop, viewWidth, viewHeight);
}

export function render(gameContext) {
    const { ctx, canvas, camera, terrain, resourceNodes, buildings, units, effects, captions, gameState } = gameContext;

    if (!ctx || !canvas) {
        console.error("Canvas context or canvas not found in gameContext for render.");
        return;
    }

    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw terrain
    const startX = Math.floor((camera.x - camera.canvasWidth / 2 / camera.zoom) / TILE_SIZE);
    const endX = Math.ceil((camera.x + camera.canvasWidth / 2 / camera.zoom) / TILE_SIZE);
    const startY = Math.floor((camera.y - camera.canvasHeight / 2 / camera.zoom) / TILE_SIZE);
    const endY = Math.ceil((camera.y + camera.canvasHeight / 2 / camera.zoom) / TILE_SIZE);

    for (let x = Math.max(0, startX); x < Math.min(GRID_SIZE, endX); x++) {
        for (let y = Math.max(0, startY); y < Math.min(GRID_SIZE, endY); y++) {
            if (!terrain[x] || terrain[x][y] === undefined) continue;
            const screenX = (x * TILE_SIZE - camera.x) * camera.zoom + camera.canvasWidth / 2;
            const screenY = (y * TILE_SIZE - camera.y) * camera.zoom + camera.canvasHeight / 2;
            const size = TILE_SIZE * camera.zoom;

            switch (terrain[x][y]) {
                case TERRAIN_TYPES.WATER:
                    const wave = Math.sin(Date.now() * 0.001 + x * 0.5) * 0.1;
                    ctx.fillStyle = `hsl(200, 50%, ${25 + wave * 10}%)`;
                    break;
                case TERRAIN_TYPES.LAND:
                    ctx.fillStyle = '#484';
                    break;
                case TERRAIN_TYPES.MOUNTAIN:
                    ctx.fillStyle = '#666';
                    break;
                default:
                    ctx.fillStyle = '#222';
            }
            ctx.fillRect(screenX, screenY, size + 1, size + 1);
        }
    }

    for (const node of resourceNodes) {
        if (node.amount > 0) {
            const screenX = (node.x - camera.x) * camera.zoom + camera.canvasWidth / 2;
            const screenY = (node.y - camera.y) * camera.zoom + camera.canvasHeight / 2;
            const nodeSize = 15 * camera.zoom;

            ctx.fillStyle = node.type === 'mass' ? '#888' : '#ff0';
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.003) * 0.2;
            ctx.fillRect(screenX - nodeSize / 2, screenY - nodeSize / 2, nodeSize, nodeSize);
            ctx.globalAlpha = 1;

            if (!node.occupied) {
                ctx.strokeStyle = node.type === 'mass' ? '#aaa' : '#ff8';
                ctx.strokeRect(screenX - nodeSize / 2, screenY - nodeSize / 2, nodeSize, nodeSize);
            }
        }
    }

    for (const building of buildings) {
        building.draw(ctx, camera);
    } 
    for (const unit of units) {
        unit.draw(ctx, camera, gameContext); // Pass gameContext 
    }

    for (const effect of effects) {
        effect.draw(ctx, camera);
    }

    // Draw projectiles
    if (gameContext.projectiles) { // Ensure projectiles array exists
        for (const projectile of gameContext.projectiles) {
            projectile.draw(ctx, camera); // Assuming projectile.draw takes ctx and camera
        }
    }

    for (const caption of captions) {
        caption.draw(ctx, camera);
    }

    // Draw windows on top of everything
    if (gameContext.windowManager) {
        gameContext.windowManager.draw(ctx);
    }

    drawMinimap(gameContext);

    // Call the imported updateUI function directly
    updateUI(gameContext);

    if (gameState.winner) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, camera.canvasWidth, camera.canvasHeight);

        ctx.fillStyle = gameState.winner === 'BLUE' ? '#44f' : '#f44';
        ctx.font = '72px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(gameState.winner + ' WINS!', camera.canvasWidth / 2, camera.canvasHeight / 2);

        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        ctx.fillText('Press R to restart', camera.canvasWidth / 2, camera.canvasHeight / 2 + 60);
    }
}
