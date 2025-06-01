import { camera, gameState } from './gameState.js';
import { TERRAIN_TYPES, TILE_SIZE, GRID_SIZE, WORLD_SIZE } from './constants.js';

let canvasCtx, minimapCtx; // Changed minimapCtxEl to minimapCtx for consistency
let gameCanvasElRef, minimapElRef;

export function initRenderer(canvasElement, minimapElement) {
    if (!canvasElement || !minimapElement) {
        console.error("Canvas or Minimap element not provided to initRenderer");
        return;
    }
    gameCanvasElRef = canvasElement;
    minimapElRef = minimapElement;
    canvasCtx = gameCanvasElRef.getContext('2d');
    minimapCtx = minimapElRef.getContext('2d'); // Corrected variable name
}

function drawMinimap(currentTerrain, currentResourceNodes, currentUnits, currentBuildings) {
    if (!minimapCtx || !currentTerrain || currentTerrain.length === 0 || !gameCanvasElRef || !minimapElRef) return;

    minimapCtx.fillStyle = '#000';
    minimapCtx.fillRect(0, 0, minimapElRef.width, minimapElRef.height);

    const scale = minimapElRef.width / GRID_SIZE;
    for (let x = 0; x < GRID_SIZE; x += 2) {
        for (let y = 0; y < GRID_SIZE; y += 2) {
            if (!currentTerrain[x] || currentTerrain[x][y] === undefined) continue;
            switch (currentTerrain[x][y]) {
                case TERRAIN_TYPES.WATER: minimapCtx.fillStyle = '#135'; break;
                case TERRAIN_TYPES.LAND: minimapCtx.fillStyle = '#242'; break;
                case TERRAIN_TYPES.MOUNTAIN: minimapCtx.fillStyle = '#444'; break;
                default: minimapCtx.fillStyle = '#111';
            }
            minimapCtx.fillRect(x * scale, y * scale, scale * 2, scale * 2);
        }
    }

    if (currentResourceNodes) {
      for (const node of currentResourceNodes) {
          if (node.amount > 0) {
              minimapCtx.fillStyle = node.type === 'mass' ? '#666' : '#880';
              const mx = (node.x / WORLD_SIZE) * minimapElRef.width;
              const my = (node.y / WORLD_SIZE) * minimapElRef.height;
              minimapCtx.fillRect(mx - 1, my - 1, 2, 2);
          }
      }
    }

    if (currentUnits) {
      for (const unit of currentUnits) {
          minimapCtx.fillStyle = unit.team === 'blue' ? '#44f' : '#f44';
          const mx = (unit.x / WORLD_SIZE) * minimapElRef.width;
          const my = (unit.y / WORLD_SIZE) * minimapElRef.height;
          minimapCtx.fillRect(mx - 1, my - 1, 2, 2);
      }
    }

    if (currentBuildings) {
      for (const building of currentBuildings) {
          minimapCtx.fillStyle = building.team === 'blue' ? '#88f' : '#f88';
          const mx = (building.x / WORLD_SIZE) * minimapElRef.width;
          const my = (building.y / WORLD_SIZE) * minimapElRef.height;
          minimapCtx.fillRect(mx - 2, my - 2, 4, 4);
          if (building.type.name === 'Commander') {
              minimapCtx.strokeStyle = '#ff0';
              minimapCtx.strokeRect(mx - 3, my - 3, 6, 6);
          }
      }
    }

    minimapCtx.strokeStyle = '#0ff';
    minimapCtx.lineWidth = 2;
    const viewLeft = ((camera.x - gameCanvasElRef.width / 2 / camera.zoom) / WORLD_SIZE) * minimapElRef.width;
    const viewTop = ((camera.y - gameCanvasElRef.height / 2 / camera.zoom) / WORLD_SIZE) * minimapElRef.height;
    const viewWidth = (gameCanvasElRef.width / camera.zoom / WORLD_SIZE) * minimapElRef.width;
    const viewHeight = (gameCanvasElRef.height / camera.zoom / WORLD_SIZE) * minimapElRef.height;
    minimapCtx.strokeRect(viewLeft, viewTop, viewWidth, viewHeight);
}

export function render(currentTerrain, currentResourceNodes, currentUnits, currentBuildings, currentEffects, currentCaptions) {
    if (!canvasCtx || !currentTerrain || currentTerrain.length === 0 || !gameCanvasElRef) return;

    canvasCtx.fillStyle = '#333';
    canvasCtx.fillRect(0, 0, gameCanvasElRef.width, gameCanvasElRef.height);

    const startX = Math.max(0, Math.floor((camera.x - gameCanvasElRef.width / 2 / camera.zoom) / TILE_SIZE));
    const endX = Math.min(GRID_SIZE, Math.ceil((camera.x + gameCanvasElRef.width / 2 / camera.zoom) / TILE_SIZE));
    const startY = Math.max(0, Math.floor((camera.y - gameCanvasElRef.height / 2 / camera.zoom) / TILE_SIZE));
    const endY = Math.min(GRID_SIZE, Math.ceil((camera.y + gameCanvasElRef.height / 2 / camera.zoom) / TILE_SIZE));

    for (let x = startX; x < endX; x++) {
        for (let y = startY; y < endY; y++) {
            if (!currentTerrain[x] || currentTerrain[x][y] === undefined) continue;
            const screenX = (x * TILE_SIZE - camera.x) * camera.zoom + gameCanvasElRef.width / 2;
            const screenY = (y * TILE_SIZE - camera.y) * camera.zoom + gameCanvasElRef.height / 2;
            const size = TILE_SIZE * camera.zoom;

            switch (currentTerrain[x][y]) {
                case TERRAIN_TYPES.WATER:
                    const wave = Math.sin(Date.now() * 0.001 + x * 0.5) * 0.1;
                    canvasCtx.fillStyle = `hsl(200, 50%, ${25 + wave * 10}%)`;
                    break;
                case TERRAIN_TYPES.LAND: canvasCtx.fillStyle = '#484'; break;
                case TERRAIN_TYPES.MOUNTAIN: canvasCtx.fillStyle = '#666'; break;
                default: canvasCtx.fillStyle = '#111';
            }
            canvasCtx.fillRect(screenX, screenY, size + 1, size + 1); // +1 for no gaps
        }
    }

    if (currentResourceNodes) {
      for (const node of currentResourceNodes) {
          if (node.amount > 0) {
              const screenX = (node.x - camera.x) * camera.zoom + gameCanvasElRef.width / 2;
              const screenY = (node.y - camera.y) * camera.zoom + gameCanvasElRef.height / 2;
              const size = 15 * camera.zoom;
              canvasCtx.fillStyle = node.type === 'mass' ? '#888' : '#ff0';
              canvasCtx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.003) * 0.2;
              canvasCtx.fillRect(screenX - size / 2, screenY - size / 2, size, size);
              canvasCtx.globalAlpha = 1;
              if (!node.occupied) {
                  canvasCtx.strokeStyle = node.type === 'mass' ? '#aaa' : '#ff8';
                  canvasCtx.strokeRect(screenX - size / 2, screenY - size / 2, size, size);
              }
          }
      }
    }

    if (currentBuildings) {
      for (const building of currentBuildings) {
          building.draw(canvasCtx, camera);
      }
    }
    if (currentUnits) {
      for (const unit of currentUnits) {
          unit.draw(canvasCtx, camera);
      }
    }
    if (currentEffects) {
      for (const effect of currentEffects) {
          effect.draw(canvasCtx, camera);
      }
    }
    if (currentCaptions) {
      for (const caption of currentCaptions) {
          caption.draw(canvasCtx, camera);
      }
    }

    drawMinimap(currentTerrain, currentResourceNodes, currentUnits, currentBuildings);

    if (gameState.winner) {
        canvasCtx.fillStyle = 'rgba(0,0,0,0.8)';
        canvasCtx.fillRect(0, 0, gameCanvasElRef.width, gameCanvasElRef.height);
        canvasCtx.fillStyle = gameState.winner === 'BLUE' ? '#44f' : '#f44';
        canvasCtx.font = '72px Arial';
        canvasCtx.textAlign = 'center';
        canvasCtx.fillText(gameState.winner + ' WINS!', gameCanvasElRef.width / 2, gameCanvasElRef.height / 2);
        canvasCtx.fillStyle = '#fff';
        canvasCtx.font = '24px Arial';
        canvasCtx.fillText('Press R to restart', gameCanvasElRef.width / 2, gameCanvasElRef.height / 2 + 60);
    }
}
