import { camera, gameState } from './gameState.js';
import { WORLD_SIZE } from './constants.js';
// Import of initGame from gameLoop.js will be needed. For now, define a placeholder.
// import { initGame as restartGame } from './gameLoop.js';
function restartGamePlaceholder() { console.log("Restart Game Triggered (placeholder)"); }
import { addEvent } from './eventSystem.js';

let gameCanvasEl, minimapEl;
// This is tricky: input handler needs access to the list of units for selection.
// We'll assume gameLoop.js will populate gameState.currentUnits.
// Alternatively, a callback/getter could be passed to initInputHandlers.

let mouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;

function handleMouseDown(e) {
    if (!gameCanvasEl || !minimapEl) return; // Ensure elements are set

    mouseDown = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    const minimapRect = minimapEl.getBoundingClientRect();
    if (e.clientX >= minimapRect.left && e.clientX <= minimapRect.right &&
        e.clientY >= minimapRect.top && e.clientY <= minimapRect.bottom) {
        const mx = (e.clientX - minimapRect.left) / minimapRect.width;
        const my = (e.clientY - minimapRect.top) / minimapRect.height;
        camera.x = mx * WORLD_SIZE;
        camera.y = my * WORLD_SIZE;
        camera.autoCamera = false;
        return;
    }

    if (!gameState.fpvMode && gameState.currentUnits && Array.isArray(gameState.currentUnits)) {
        const worldX = (e.clientX - gameCanvasEl.width / 2) / camera.zoom + camera.x;
        const worldY = (e.clientY - gameCanvasEl.height / 2) / camera.zoom + camera.y;

        gameState.selectedUnit = null; // Deselect previous
        for (const unit of gameState.currentUnits) {
            unit.selected = false; // Deselect all first
        }
        for (const unit of gameState.currentUnits) {
            // Ensure unit.type is defined and has a size property
            if (unit.type && typeof unit.type.size === 'number') {
                const dist = Math.sqrt((unit.x - worldX) ** 2 + (unit.y - worldY) ** 2);
                if (dist < unit.type.size) {
                    gameState.selectedUnit = unit;
                    unit.selected = true;
                    break; // Select only one
                }
            }
        }
    }
}

function handleMouseMove(e) {
    if (mouseDown && !gameState.fpvMode && camera) { // Added camera check
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        camera.x -= dx / camera.zoom;
        camera.y -= dy / camera.zoom;
        camera.autoCamera = false; // Disable auto-camera on manual pan
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
    if (gameState) { // Added gameState check
      gameState.mouseX = e.clientX;
      gameState.mouseY = e.clientY;
    }
}

function handleMouseUp() {
    mouseDown = false;
}

function handleWheel(e) {
    if (!gameState.fpvMode && camera) { // Added camera check
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        camera.zoom *= zoomFactor;
        camera.zoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, camera.zoom));
    }
    e.preventDefault();
}

function handleKeyDown(e) {
    if (!gameState || !camera) return; // Added checks

    switch (e.key.toLowerCase()) {
        case ' ':
            gameState.paused = !gameState.paused;
            break;
        case 'r':
            // This will be replaced by import { initGame as restartGame } from './gameLoop.js';
            // For now, it's a placeholder that needs to be connected.
            if (typeof window.restartGame === 'function') { // Check if global restartGame is available
                 window.restartGame();
            } else {
                restartGamePlaceholder(); // Fallback if not connected via module
            }
            break;
        case 'f':
            if (gameState.selectedUnit) {
                gameState.fpvMode = !gameState.fpvMode;
            }
            break;
        case 'c':
            camera.autoCamera = !camera.autoCamera;
            if (camera.autoCamera) {
                addEvent('strategic', 'Auto-camera enabled', 1);
            }
            break;
        case 'escape':
            gameState.fpvMode = false;
            break;
    }
}

export function initInputHandlers(canvasElement, minimapElement) {
    if (!canvasElement || !minimapElement) {
        console.error("Canvas or Minimap element not provided to initInputHandlers");
        return;
    }
    gameCanvasEl = canvasElement;
    minimapEl = minimapElement;

    gameCanvasEl.addEventListener('mousedown', handleMouseDown);
    gameCanvasEl.addEventListener('mousemove', handleMouseMove);
    // It's common to add mouseup and wheel to window or document to catch events outside canvas
    window.addEventListener('mouseup', handleMouseUp);
    gameCanvasEl.addEventListener('wheel', handleWheel);
    document.addEventListener('keydown', handleKeyDown);
}
