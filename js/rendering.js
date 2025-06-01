import { TERRAIN_TYPES, TILE_SIZE, GRID_SIZE } from './config.js';
// Needs: ctx, minimapCtx, canvas, camera, terrain, resourceNodes, buildings, units, effects, captions, gameState, updateUI
// updateUI will be imported from ui.js

export function renderGame(ctx, camera, canvas, terrain, resourceNodes, buildings, units, effects, captions, gameState, minimapCtx, uiUpdateFunc) {
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const startX = Math.floor((camera.x - canvas.width / 2 / camera.zoom) / TILE_SIZE);
    const endX = Math.ceil((camera.x + canvas.width / 2 / camera.zoom) / TILE_SIZE);
    const startY = Math.floor((camera.y - canvas.height / 2 / camera.zoom) / TILE_SIZE);
    const endY = Math.ceil((camera.y + canvas.height / 2 / camera.zoom) / TILE_SIZE);

    for (let x = Math.max(0, startX); x < Math.min(GRID_SIZE, endX); x++) {
        for (let y = Math.max(0, startY); y < Math.min(GRID_SIZE, endY); y++) {
            const screenX = (x * TILE_SIZE - camera.x) * camera.zoom + canvas.width / 2;
            const screenY = (y * TILE_SIZE - camera.y) * camera.zoom + canvas.height / 2;
            const size = TILE_SIZE * camera.zoom;

            if(terrain[x] && terrain[x][y] !== undefined) { // Check if terrain data exists
                switch (terrain[x][y]) {
                    case TERRAIN_TYPES.WATER:
                        const wave = Math.sin(Date.now() * 0.001 + x * 0.5) * 0.1;
                        ctx.fillStyle = `hsl(200, 50%, ${25 + wave * 10}%)`;
                        break;
                    case TERRAIN_TYPES.LAND: ctx.fillStyle = '#484'; break;
                    case TERRAIN_TYPES.MOUNTAIN: ctx.fillStyle = '#666'; break;
                }
                ctx.fillRect(screenX, screenY, size + 1, size + 1);
            }
        }
    }

    for (const node of resourceNodes) {
        if (node.amount > 0) {
            const screenX = (node.x - camera.x) * camera.zoom + canvas.width / 2;
            const screenY = (node.y - camera.y) * camera.zoom + canvas.height / 2;
            const size = 15 * camera.zoom;
            ctx.fillStyle = node.type === 'mass' ? '#888' : '#ff0';
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.003) * 0.2;
            ctx.fillRect(screenX - size/2, screenY - size/2, size, size);
            ctx.globalAlpha = 1;
            if (!node.occupied) {
                ctx.strokeStyle = node.type === 'mass' ? '#aaa' : '#ff8';
                ctx.strokeRect(screenX - size/2, screenY - size/2, size, size);
            }
        }
    }

    for (const building of buildings) building.draw(ctx, camera);
    for (const unit of units) unit.draw(ctx, camera);
    for (const effect of effects) effect.draw(ctx, camera);
    for (const caption of captions) caption.draw(ctx, camera);

    drawMinimap(minimapCtx, camera, canvas, terrain, resourceNodes, units, buildings);
    uiUpdateFunc(units, buildings, window.resources , camera, gameState); // Assuming resources is global for now

    if (gameState.winner) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = gameState.winner === 'BLUE' ? '#44f' : '#f44';
        ctx.font = '72px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(gameState.winner + ' WINS!', canvas.width / 2, canvas.height / 2);
        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        ctx.fillText('Press R to restart', canvas.width / 2, canvas.height / 2 + 60);
    }
}

function drawMinimap(minimapCtx, camera, canvas, terrain, resourceNodes, units, buildings) {
    const WORLD_SIZE_CONST = 5000; // This should come from config
    minimapCtx.fillStyle = '#000';
    minimapCtx.fillRect(0, 0, 200, 200);
    const scale = 200 / GRID_SIZE;

    for (let x = 0; x < GRID_SIZE; x += 2) {
        for (let y = 0; y < GRID_SIZE; y += 2) {
             if(terrain[x] && terrain[x][y] !== undefined) { // Check
                switch (terrain[x][y]) {
                    case TERRAIN_TYPES.WATER: minimapCtx.fillStyle = '#135'; break;
                    case TERRAIN_TYPES.LAND: minimapCtx.fillStyle = '#242'; break;
                    case TERRAIN_TYPES.MOUNTAIN: minimapCtx.fillStyle = '#444'; break;
                }
                minimapCtx.fillRect(x * scale, y * scale, scale * 2, scale * 2);
            }
        }
    }
    for (const node of resourceNodes) {
        if (node.amount > 0) {
            minimapCtx.fillStyle = node.type === 'mass' ? '#666' : '#880';
            const mx = (node.x / WORLD_SIZE_CONST) * 200;
            const my = (node.y / WORLD_SIZE_CONST) * 200;
            minimapCtx.fillRect(mx - 1, my - 1, 2, 2);
        }
    }
    for (const unit of units) {
        minimapCtx.fillStyle = unit.team === 'blue' ? '#44f' : '#f44';
        const mx = (unit.x / WORLD_SIZE_CONST) * 200;
        const my = (unit.y / WORLD_SIZE_CONST) * 200;
        minimapCtx.fillRect(mx - 1, my - 1, 2, 2);
    }
    for (const building of buildings) {
        minimapCtx.fillStyle = building.team === 'blue' ? '#88f' : '#f88';
        const mx = (building.x / WORLD_SIZE_CONST) * 200;
        const my = (building.y / WORLD_SIZE_CONST) * 200;
        minimapCtx.fillRect(mx - 2, my - 2, 4, 4);
        if (building.type.name === 'Commander') {
            minimapCtx.strokeStyle = '#ff0';
            minimapCtx.strokeRect(mx - 3, my - 3, 6, 6);
        }
    }
    minimapCtx.strokeStyle = '#0ff';
    minimapCtx.lineWidth = 2;
    const viewLeft = ((camera.x - canvas.width / 2 / camera.zoom) / WORLD_SIZE_CONST) * 200;
    const viewTop = ((camera.y - canvas.height / 2 / camera.zoom) / WORLD_SIZE_CONST) * 200;
    const viewWidth = (canvas.width / camera.zoom / WORLD_SIZE_CONST) * 200;
    const viewHeight = (canvas.height / camera.zoom / WORLD_SIZE_CONST) * 200;
    minimapCtx.strokeRect(viewLeft, viewTop, viewWidth, viewHeight);
}
