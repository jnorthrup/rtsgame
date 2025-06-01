// Imports for functions that might be called, if not accessed via gameContext:
// import { initGame, addEvent } from '../core/game.js'; // These will be on gameContext
import { WORLD_SIZE } from '../config/gameConstants.js'; // WORLD_SIZE is used in minimap click

export function initInputHandling(gameContext) {
    // Destructure what's needed from gameContext for convenience
    const { canvas, minimap, camera, gameState, units, initGame, addEvent, UNIT_TYPES } = gameContext;

    let mouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    // --- Canvas Event Listeners (Mouse for selection, panning) ---
    if (canvas) {
        canvas.addEventListener('mousedown', (e) => {
            if (gameState.aimingGrenade) {
                if (e.button === 0) { // Left click
                    const worldX = (e.clientX - camera.canvasWidth / 2) / camera.zoom + camera.x;
                    const worldY = (e.clientY - camera.canvasHeight / 2) / camera.zoom + camera.y;

                    if (gameState.selectedUnit && typeof gameState.selectedUnit.launchGrenade === 'function') {
                        gameState.selectedUnit.launchGrenade(worldX, worldY, gameContext);
                    }
                    console.log(`Grenade targeted at ${worldX.toFixed(0)}, ${worldY.toFixed(0)}`);
                    gameState.aimingGrenade = false;
                } else if (e.button === 2) { // Right click to cancel
                    gameState.aimingGrenade = false;
                    console.log("Grenade aiming cancelled by Right Click.");
                }
                e.preventDefault(); // Prevent other actions like panning/selection
                e.stopPropagation(); // Stop event from bubbling further
                return; // Important to stop further processing of this click
            }

            mouseDown = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;

            // Check minimap click first
            if (minimap && gameContext.minimapCtx) { // Ensure minimap and its context exist
                const rect = minimap.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {

                    // WORLD_SIZE is imported directly into this module
                    const mx = (e.clientX - rect.left) / minimap.width; // Use minimap.width
                    const my = (e.clientY - rect.top) / minimap.height; // Use minimap.height
                    camera.x = mx * WORLD_SIZE;
                    camera.y = my * WORLD_SIZE;
                    camera.autoCamera = false;
                    return; // Prevent further processing like unit selection
                }
            }

            // Select unit (if not in FPV mode and click is on main canvas)
            if (!gameState.fpvMode) {
                const worldX = (e.clientX - camera.canvasWidth / 2) / camera.zoom + camera.x;
                const worldY = (e.clientY - camera.canvasHeight / 2) / camera.zoom + camera.y;

                gameState.selectedUnit = null;
                units.forEach(unit => {
                    const dist = Math.sqrt((unit.x - worldX) ** 2 + (unit.y - worldY) ** 2);
                    if (dist < unit.type.size) { // Assuming unit.type.size is in world units
                        gameState.selectedUnit = unit;
                        unit.selected = true;
                    } else {
                        unit.selected = false;
                    }
                });
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (mouseDown && !gameState.fpvMode) {
                const dx = e.clientX - lastMouseX;
                const dy = e.clientY - lastMouseY;
                camera.x -= dx / camera.zoom;
                camera.y -= dy / camera.zoom;
                camera.autoCamera = false;
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
            }
        });

        canvas.addEventListener('mouseup', () => {
            mouseDown = false;
        });

        canvas.addEventListener('wheel', (e) => {
            if (!gameState.fpvMode) {
                const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                camera.zoom *= zoomFactor;
                camera.zoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, camera.zoom));
            }
            // e.preventDefault(); // Prevent page scrolling - removed for passive listener
        }, { passive: true }); // Added passive: true
    } else {
        console.error("Canvas element not found in gameContext for input handling.");
    }

    // --- Document Event Listeners (Keyboard shortcuts) ---
    document.addEventListener('keydown', (e) => {
        switch (e.key.toLowerCase()) {
            case ' ':
                gameState.paused = !gameState.paused;
                break;
            case 'r':
                initGame(gameContext); // initGame is from gameContext
                break;
            case 'f':
                if (gameState.selectedUnit) {
                    gameState.fpvMode = !gameState.fpvMode;
                }
                break;
            case 'c':
                camera.autoCamera = !camera.autoCamera;
                if (camera.autoCamera) {
                    addEvent(gameContext, 'strategic', 'Auto-camera enabled', 1); // addEvent is from gameContext
                }
                break;
            case 'g':
                if (gameState.selectedUnit &&
                    gameState.selectedUnit.type === UNIT_TYPES.commander && // Check if selected is Commander
                    (gameState.selectedUnit.grenadeCooldown === undefined || gameState.selectedUnit.grenadeCooldown <= 0)) { // Check cooldown (assume 0 or undefined if ready)
                    gameState.aimingGrenade = true;
                    // TODO: Add visual feedback for aiming mode (e.g., cursor change)
                    console.log("Grenade aiming activated.");
                } else if (gameState.aimingGrenade) {
                    gameState.aimingGrenade = false; // Pressing G again cancels
                    console.log("Grenade aiming cancelled by G.");
                }
                break;
            case 'tab':
                e.preventDefault(); // Prevent default browser focus shifting and scrolling
                // console.log("Tab key pressed and default behavior prevented."); // Optional: for testing
                break;
            case 'escape':
                gameState.fpvMode = false;
                if (gameState.aimingGrenade) {
                    gameState.aimingGrenade = false;
                    console.log("Grenade aiming cancelled by Escape.");
                }
                break;
        }
    });

    // --- Window Resize Listener ---
    window.addEventListener('resize', () => {
        if (canvas && camera) { // Ensure canvas and camera exist on gameContext
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            camera.canvasWidth = canvas.width;
            camera.canvasHeight = canvas.height; // CORRECTED
            // Note: The actual rendering update due to resize happens in the next gameLoop call.
        }
    });
}
