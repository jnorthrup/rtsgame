// Imports for functions that might be called, if not accessed via gameContext:
// import { initGame, addEvent } from '../core/game.js'; // These will be on gameContext
import { WORLD_SIZE } from '../config/gameConstants.js'; // WORLD_SIZE is used in minimap click
import { WindowManager, BorderLayoutContainer, BorderRegion, TextComponent } from '../ui/borderLayout.js';
import { IntrospectionManager } from '../ui/talentRenderers.js';
import { CommandStatusRenderer } from '../ui/commandStatusRenderer.js';

export function initInputHandling(gameContext) {
    // Destructure what's needed from gameContext for convenience
    const { canvas, minimap, camera, gameState, units, initGame, addEvent, UNIT_TYPES } = gameContext;

    let mouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    // Initialize window manager and introspection system
    gameContext.windowManager = new WindowManager();
    gameContext.introspectionManager = new IntrospectionManager(gameContext.windowManager);
    
    // Initialize command status renderers
    gameContext.commandStatusRenderers = new Map();
    gameContext.commandStatusRenderers.set('blue', new CommandStatusRenderer('blue', gameContext));
    gameContext.commandStatusRenderers.set('red', new CommandStatusRenderer('red', gameContext));

    // --- Canvas Event Listeners (Mouse for selection, panning) ---
    if (canvas) {
        canvas.addEventListener('mousedown', (e) => {
            // Check if window manager handled the click first
            if (gameContext.windowManager && gameContext.windowManager.handleMouseDown(e.clientX, e.clientY, e.button)) {
                e.preventDefault();
                return; // Window system consumed the click
            }

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
                let selectedObject = null;

                // Check units first
                units.forEach(unit => {
                    const dist = Math.sqrt((unit.x - worldX) ** 2 + (unit.y - worldY) ** 2);
                    if (dist < unit.type.size) { // Assuming unit.type.size is in world units
                        gameState.selectedUnit = unit;
                        unit.selected = true;
                        selectedObject = unit;
                    } else {
                        unit.selected = false;
                    }
                });

                // Check buildings if no unit selected
                if (!selectedObject && gameContext.buildings) {
                    gameContext.buildings.forEach(building => {
                        const dist = Math.sqrt((building.x - worldX) ** 2 + (building.y - worldY) ** 2);
                        if (dist < (building.type.size || 50)) {
                            selectedObject = building;
                        }
                    });
                }

                // Create introspection window for selected object (Ctrl+Click)
                if (selectedObject && e.ctrlKey && gameContext.introspectionManager) {
                    gameContext.introspectionManager.createIntrospectionWindow(
                        selectedObject, 
                        e.clientX + 20, 
                        e.clientY + 20, 
                        gameContext
                    );
                }
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            // Update window manager
            if (gameContext.windowManager) {
                gameContext.windowManager.handleMouseMove(e.clientX, e.clientY);
            }

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

        canvas.addEventListener('mouseup', (e) => {
            // Update window manager
            if (gameContext.windowManager) {
                gameContext.windowManager.handleMouseUp(e.clientX, e.clientY, e.button);
            }
            
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
            case 'w':
                // Create a sample window with border layout
                createSampleWindow(gameContext);
                break;
            case 'q':
                // Create a unit inspector window
                createUnitInspectorWindow(gameContext);
                break;
            case 'i':
                // Create introspection window for selected object
                if (gameState.selectedUnit && gameContext.introspectionManager) {
                    gameContext.introspectionManager.createIntrospectionWindow(
                        gameState.selectedUnit,
                        200,
                        100,
                        gameContext
                    );
                }
                break;
            case 'h':
                // Show command hierarchy for blue team
                const blueRenderer = gameContext.commandStatusRenderers.get('blue');
                if (blueRenderer && !blueRenderer.isVisible()) {
                    const window = blueRenderer.createWindow(50, 50);
                    gameContext.windowManager.addWindow(window);
                }
                break;
            case 'j':
                // Show command hierarchy for red team
                const redRenderer = gameContext.commandStatusRenderers.get('red');
                if (redRenderer && !redRenderer.isVisible()) {
                    const window = redRenderer.createWindow(600, 50);
                    gameContext.windowManager.addWindow(window);
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

function createSampleWindow(gameContext) {
    const window = new BorderLayoutContainer(100, 100, 400, 300, {
        title: 'Sample Border Layout Window',
        backgroundColor: 'rgba(40, 40, 50, 0.95)',
        borderColor: '#666666'
    });

    // Add components to different regions
    window.addComponent(
        new TextComponent('North Panel\nToolbar Area', { 
            backgroundColor: 'rgba(60, 60, 80, 0.8)',
            alignment: 'center'
        }), 
        BorderRegion.NORTH
    );

    window.addComponent(
        new TextComponent('West\nSidebar\nNavigation', { 
            backgroundColor: 'rgba(80, 60, 60, 0.8)',
            fontSize: 10
        }), 
        BorderRegion.WEST
    );

    window.addComponent(
        new TextComponent('East\nProperties\nPanel', { 
            backgroundColor: 'rgba(60, 80, 60, 0.8)',
            fontSize: 10
        }), 
        BorderRegion.EAST
    );

    window.addComponent(
        new TextComponent('Center Content Area\n\nThis is where the main content goes.\nIt automatically fills the remaining space\nafter other regions are laid out.', { 
            backgroundColor: 'rgba(50, 50, 70, 0.8)',
            alignment: 'center'
        }), 
        BorderRegion.CENTER
    );

    window.addComponent(
        new TextComponent('South Status Bar', { 
            backgroundColor: 'rgba(70, 70, 60, 0.8)',
            alignment: 'center',
            fontSize: 10
        }), 
        BorderRegion.SOUTH
    );

    // Set custom region sizes
    window.setRegionSize(BorderRegion.NORTH, 60);
    window.setRegionSize(BorderRegion.SOUTH, 30);
    window.setRegionSize(BorderRegion.WEST, 120);
    window.setRegionSize(BorderRegion.EAST, 100);

    gameContext.windowManager.addWindow(window);
}

function createUnitInspectorWindow(gameContext) {
    const window = new BorderLayoutContainer(200, 50, 350, 400, {
        title: 'Unit Inspector',
        backgroundColor: 'rgba(30, 40, 50, 0.95)',
        borderColor: '#888888'
    });

    // Unit selection display
    window.addComponent(
        new TextComponent('Selected Unit Info', { 
            backgroundColor: 'rgba(50, 60, 70, 0.8)',
            alignment: 'center',
            fontSize: 11
        }), 
        BorderRegion.NORTH
    );

    // Unit stats
    const selectedUnit = gameContext.gameState.selectedUnit;
    let unitInfo = 'No unit selected';
    if (selectedUnit) {
        unitInfo = `Type: ${selectedUnit.type.name}\n` +
                  `Team: ${selectedUnit.team.toUpperCase()}\n` +
                  `HP: ${Math.ceil(selectedUnit.hp)}/${selectedUnit.maxHp}\n` +
                  `Position: ${Math.floor(selectedUnit.x)}, ${Math.floor(selectedUnit.y)}\n` +
                  `Speed: ${selectedUnit.type.speed}\n` +
                  `Range: ${selectedUnit.type.range}`;
        
        if (selectedUnit.shields > 0) {
            unitInfo += `\nShields: ${Math.ceil(selectedUnit.shields)}/${selectedUnit.maxShields}`;
        }
        
        if (selectedUnit.target) {
            unitInfo += `\nTarget: ${selectedUnit.target.type ? selectedUnit.target.type.name : 'Position'}`;
        }
    }

    window.addComponent(
        new TextComponent(unitInfo, { 
            backgroundColor: 'rgba(40, 50, 60, 0.8)',
            fontSize: 10,
            padding: 10
        }), 
        BorderRegion.CENTER
    );

    // Commands
    window.addComponent(
        new TextComponent('Unit Commands\n• Click to select\n• F for FPV mode\n• G for grenade (Commander)', { 
            backgroundColor: 'rgba(60, 50, 40, 0.8)',
            fontSize: 9,
            padding: 8
        }), 
        BorderRegion.SOUTH
    );

    window.setRegionSize(BorderRegion.NORTH, 40);
    window.setRegionSize(BorderRegion.SOUTH, 80);

    gameContext.windowManager.addWindow(window);
}
