// Define gameContext as a global object for the game
let gameContext = window.gameContext || {};
if (!window.gameContext) {
    window.gameContext = gameContext;

    // Get the canvas element and its 2D rendering context, add them to gameContext
    window.gameContext.canvas = gameContext.canvas || document.getElementById('gameCanvas');
    if (window.gameContext.canvas) {
        // Ensure canvas dimensions match window dimensions for full-screen rendering
        window.gameContext.canvas.width = window.innerWidth;
        window.gameContext.canvas.height = window.innerHeight;
        console.log("Main game canvas initialized successfully in main.js!");
    } else {
        console.error("Main game canvas element not found!");
    }

    // Initialize Minimap Canvas Context
    gameContext.minimapCanvas = document.getElementById('minimapCanvas'); 
    if (gameContext.minimapCanvas) {
        gameContext.minimapCtx = gameContext.minimapCanvas.getContext('2d');
        // Set fixed size for minimap, can be adjusted via CSS for display size
        gameContext.minimapCanvas.width = 200; 
        gameContext.minimapCanvas.height = 200;
        console.log("Minimap canvas initialized successfully.");
    } else {
        console.warn("Minimap canvas element with ID 'minimapCanvas' not found. Minimap will not be rendered.");
        gameContext.minimapCtx = null; 
    }

    // Initialize core game functions if they aren't already
    // window.gameContext.initGame = initGame; // OLD
    // window.gameContext.gameLoop = gameLoop; // OLD

    // Initialize input handling function
    if (!window.gameContext.initInputHandling) {
        window.gameContext.initInputHandling = initInputHandling;
    }
}

// Import necessary modules
import React from 'react'; 
import ReactDOM from 'react-dom/client'; 
import UiRoot from './ui/components/UiRoot.jsx'; 
import { InputManager } from './input/inputManager.js'; // NEW: Import InputManager

import { initInputHandling } from './input/inputHandler.js';
// import { gameLoop, initGame } from './core/game.js'; // OLD: To be replaced
import { Simulation } from '../js_rewritten/core/simulation.js'; 
import { startRandomSeedRecording } from './core/recordingUtils.js';
import { SIMULATION_CONFIG } from './config/simulationConfig.js';
import battleJournal from './ai/battleJournal.js'; // Import battleJournal
import { Effect } from './core/effect.js'; // Import Effect class
import { Caption } from './core/caption.js'; // Import Caption class
import { initRenderer as initWebGLRenderer } from './js_rewritten/rendering/webglRenderer.js'; // Import WebGL renderer
import { drawMinimap } from './ui/minimap_canvas2d.js'; // NEW: Import drawMinimap
import { updateUI } from './rendering/ui.js'; // NEW: Import updateUI

// Initial game setup
// Initialize gameContext properties for the first time
gameContext.battleJournal = battleJournal; // Assign battleJournal to gameContext
gameContext.Effect = Effect; // Assign Effect class to gameContext
gameContext.Caption = Caption; // Assign Caption class to gameContext
gameContext.units = [];
gameContext.buildings = [];
gameContext.effects = [];
gameContext.captions = [];
gameContext.projectiles = [];
gameContext.terrain = []; // Initialize terrain
gameContext.resourceNodes = []; // Initialize resource nodes
gameContext.pathfindingGrid = []; // Initialize pathfinding grid
gameContext.resources = { blue: {}, red: {} }; // Initialize resources
// Camera constants (some might be duplicates from SIMULATION_CONFIG, consolidate if necessary)
const ZOOM_FACTOR = 1.2;
const MIN_ZOOM_APP = 0.01; // Renamed to avoid conflict if SIMULATION_CONFIG has MIN_ZOOM
const MAX_ZOOM_APP = 50.0; // Renamed
const CAMERA_SMOOTHING = 0.15;
const MOMENTUM_DECAY = 0.95;
const MAX_STRATEGIC_ZOOM_APP = 2.0; // Renamed
const MIN_TACTICAL_ZOOM_APP = 8.0;  // Renamed
const MAX_TACTICAL_ANGLE_APP = 45;  // Renamed
const KEYBOARD_MOVE_SPEED = 1500; // Adjusted for world units per second (approx)
const MODIFIER_SPEED_MULTIPLIER = 3;

gameContext.camera = {
    x: SIMULATION_CONFIG.CAMERA_START_X || 0,
    y: SIMULATION_CONFIG.CAMERA_START_Y || 0,
    zoom: SIMULATION_CONFIG.CAMERA_START_ZOOM || 1.0,
    targetX: SIMULATION_CONFIG.CAMERA_START_X || 0, // From main_simulation.js
    targetY: SIMULATION_CONFIG.CAMERA_START_Y || 0, // From main_simulation.js
    targetZoom: SIMULATION_CONFIG.CAMERA_START_ZOOM || 1.0, // From main_simulation.js
    velocityX: 0, // From main_simulation.js
    velocityY: 0, // From main_simulation.js
    velocityZoom: 0, // From main_simulation.js
    isDragging: false, // From main_simulation.js
    lastMouseX: 0, // From main_simulation.js
    lastMouseY: 0, // From main_simulation.js
    angle: 30, 
    targetAngle: 30, // From main_simulation.js
    rotation: 45, 
    targetRotation: 45, // From main_simulation.js
    canvasWidth: window.innerWidth,
    canvasHeight: window.innerHeight,
    minZoom: MIN_ZOOM_APP, // Use new constant
    maxZoom: MAX_ZOOM_APP, // Use new constant
    autoCamera: true, // This was from the old app.js camera, might be overridden by new controls
    cameraTarget: null, // This was from the old app.js camera
    cameraTimer: 0, // This was from the old app.js camera
};
gameContext.gameState = {
    paused: false,
    gameTime: 0,
    winner: null,
    events: [],
    fpvMode: false,
    aimingGrenade: false
};

// Initialize the WebGL renderer
gameContext.renderer = initWebGLRenderer(gameContext.canvas);

// Initialize the enhanced journaling system
import { initializeRecordingSystem } from './core/recordingUtils.js';
  
// Initialize the random seed system using native Math.random()
// For production, you might want a more robust seed generation or a fixed seed for reproducibility.
gameContext.GAME_SEED = SIMULATION_CONFIG.GAME_SEED || battleJournal.seed;
// Replaced Math.seedrandom with a simple wrapper around Math.random for browser compatibility
gameContext.seedRandom = {
    random: function() { return Math.random(); },
    init: function(seed) { /* Not truly seeded without a library, but keeps the API */ }
};

// Initialize simulation parameters from config
gameContext.RECORD_AI_DECISIONS = SIMULATION_CONFIG.RECORD_AI_DECISIONS;
gameContext.RECORD_AI_DECISIONS_DURATION_SECONDS = 10; // Set to exactly 10 seconds for this simulation
gameContext.HEADLESS_MODE = SIMULATION_CONFIG.HEADLESS_MODE;
gameContext.JOURNALING_MODE = SIMULATION_CONFIG.JOURNALING_MODE;
gameContext.JOURNALING_TIMEOUT = SIMULATION_CONFIG.JOURNALING_TIMEOUT_SECONDS;

// Initialize the enhanced journaling system with current game context
initializeRecordingSystem();

// Start a random seed recording based on configured duration if not using full journaling
if (gameContext.JOURNALING_MODE !== 'FULL') {
    startRandomSeedRecording(gameContext, gameContext.RECORD_AI_DECISIONS_DURATION_SECONDS);
}

// Initialize SelectionManager
import SelectionManager from './ui/selectionManager.js';
import { WindowManager } from './ui/borderLayout.js'; // Import WindowManager
gameContext.selectionManager = new SelectionManager(gameContext); // Pass gameContext to manager

// Initialize WindowManager and allow drawing
gameContext.windowManager = new WindowManager();
gameContext.allowWindowDrawing = true;

// Keyboard state tracking for advanced camera controls
const keys = {
    w: false, a: false, s: false, d: false,
    q: false, e: false, // For rotation or other controls if needed
    shift: false, ctrl: false, alt: false
};

// Camera control functions (adapted from main_simulation.js)
function handleKeyDown(e) {
    if (e.code === 'KeyW') keys.w = true;
    if (e.code === 'KeyA') keys.a = true;
    if (e.code === 'KeyS') keys.s = true;
    if (e.code === 'KeyD') keys.d = true;
    if (e.code === 'KeyQ') keys.q = true; // Example for rotation
    if (e.code === 'KeyE') keys.e = true; // Example for rotation
    if (e.key === 'Shift') keys.shift = true;
    if (e.key === 'Control') keys.ctrl = true;
    if (e.key === 'Alt') keys.alt = true;
}

function handleKeyUp(e) {
    if (e.code === 'KeyW') keys.w = false;
    if (e.code === 'KeyA') keys.a = false;
    if (e.code === 'KeyS') keys.s = false;
    if (e.code === 'KeyD') keys.d = false;
    if (e.code === 'KeyQ') keys.q = false;
    if (e.code === 'KeyE') keys.e = false;
    if (e.key === 'Shift') keys.shift = false;
    if (e.key === 'Control') keys.ctrl = false;
    if (e.key === 'Alt') keys.alt = false;
}

function processKeyboardCameraInput(deltaTime) { // Added deltaTime for frame-rate independence
    const cam = gameContext.camera;
    const moveSpeed = (KEYBOARD_MOVE_SPEED * deltaTime) / cam.zoom; // Speed adjusted by zoom and deltaTime
    const rotationSpeed = 25 * deltaTime; // Degrees per second

    if (keys.w) cam.targetY -= moveSpeed;
    if (keys.s) cam.targetY += moveSpeed;
    if (keys.a) cam.targetX -= moveSpeed;
    if (keys.d) cam.targetX += moveSpeed;
    if (keys.q) cam.targetRotation -= rotationSpeed; // Rotate left
    if (keys.e) cam.targetRotation += rotationSpeed; // Rotate right
}

function calculateDynamicCameraAngle() {
    const cam = gameContext.camera;
    let targetAngle = 0;
    if (cam.zoom > MAX_STRATEGIC_ZOOM_APP) {
        targetAngle = 0;
    } else if (cam.zoom < MIN_TACTICAL_ZOOM_APP) {
        targetAngle = MAX_TACTICAL_ANGLE_APP;
    } else {
        const zoomRange = MIN_TACTICAL_ZOOM_APP - MAX_STRATEGIC_ZOOM_APP;
        const zoomFactor = (cam.zoom - MAX_STRATEGIC_ZOOM_APP) / zoomRange;
        targetAngle = MAX_TACTICAL_ANGLE_APP * (1 - zoomFactor);
    }
    cam.targetAngle = targetAngle;
}

function updateCameraLogic(deltaTime) { // Renamed from updateCamera to avoid conflict, added deltaTime
    const cam = gameContext.camera;
    processKeyboardCameraInput(deltaTime);
    calculateDynamicCameraAngle();

    if (!cam.isDragging) {
        cam.targetX += cam.velocityX / cam.zoom;
        cam.targetY += cam.velocityY / cam.zoom; //velocityY was positive in main_simulation, but typically Y is inverted for screen
        cam.velocityX *= MOMENTUM_DECAY;
        cam.velocityY *= MOMENTUM_DECAY;
    }

    cam.x += (cam.targetX - cam.x) * CAMERA_SMOOTHING;
    cam.y += (cam.targetY - cam.y) * CAMERA_SMOOTHING;
    cam.zoom += (cam.targetZoom - cam.zoom) * CAMERA_SMOOTHING;
    cam.angle += (cam.targetAngle - cam.angle) * CAMERA_SMOOTHING;
    cam.rotation += (cam.targetRotation - cam.rotation) * CAMERA_SMOOTHING;

    // Clamp zoom
    cam.zoom = Math.max(MIN_ZOOM_APP, Math.min(MAX_ZOOM_APP, cam.zoom));
    cam.targetZoom = Math.max(MIN_ZOOM_APP, Math.min(MAX_ZOOM_APP, cam.targetZoom));


    if (gameContext.renderer && gameContext.renderer.updateCamera) { // Check if renderer and its method exist
         gameContext.renderer.updateCamera(cam); // This was called in main_simulation's updateCamera
    }
}


function handleMouseWheel(e) {
    e.preventDefault();
    const cam = gameContext.camera;
    const zoomFactor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
    const newZoom = cam.targetZoom * zoomFactor;

    if (newZoom >= MIN_ZOOM_APP && newZoom <= MAX_ZOOM_APP) {
        const rect = gameContext.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const worldXBeforeZoom = (mouseX - cam.canvasWidth / 2) / cam.zoom + cam.x;
        const worldYBeforeZoom = (mouseY - cam.canvasHeight / 2) / cam.zoom + cam.y;
        
        cam.targetZoom = newZoom;
        
        // Adjust camera position to keep mouse cursor over the same world point
        const worldXAfterZoom = (mouseX - cam.canvasWidth / 2) / cam.targetZoom + cam.x;
        const worldYAfterZoom = (mouseY - cam.canvasHeight / 2) / cam.targetZoom + cam.y;
        
        cam.targetX += worldXBeforeZoom - worldXAfterZoom;
        cam.targetY += worldYBeforeZoom - worldYAfterZoom;
    }
}

function handleMouseDown(e) {
    if (e.button === 0) { // Left mouse button for dragging
        gameContext.camera.isDragging = true;
        gameContext.camera.lastMouseX = e.clientX;
        gameContext.camera.lastMouseY = e.clientY;
        gameContext.camera.velocityX = 0;
        gameContext.camera.velocityY = 0;
        if(gameContext.canvas) gameContext.canvas.style.cursor = 'grabbing';
    } else if (e.button === 2) { // Right mouse button for rotation (example)
        // Could also set a flag for rotation dragging if desired
    }
}

function handleMouseMove(e) {
    const cam = gameContext.camera;
    if (cam.isDragging) {
        const deltaX = e.clientX - cam.lastMouseX;
        const deltaY = e.clientY - cam.lastMouseY;
        
        // Drag to pan: Invert Y for typical map panning feel if needed, but this is direct
        cam.targetX -= deltaX / cam.zoom;
        cam.targetY -= deltaY / cam.zoom; // In main_simulation, this was += deltaY. Adjusted for consistency.
                                         // Screen Y up is world Y up.
        
        cam.velocityX = -deltaX * 0.1; // Apply some momentum
        cam.velocityY = -deltaY * 0.1; // Apply some momentum

        cam.lastMouseX = e.clientX;
        cam.lastMouseY = e.clientY;
    }
}

function handleMouseUp(e) {
    if (e.button === 0) {
        gameContext.camera.isDragging = false;
        if(gameContext.canvas) gameContext.canvas.style.cursor = 'grab';
    }
}


// Initialize input handling and start the game
if (!gameContext.HEADLESS_MODE) {
    // initInputHandling(gameContext); // Old input handling - review if it conflicts or can be merged/removed
                                   // For now, new handlers will be added.
    
    // Add new event listeners for advanced camera
    if (gameContext.canvas) {
        gameContext.canvas.addEventListener('wheel', handleMouseWheel, { passive: false });
        gameContext.canvas.addEventListener('mousedown', handleMouseDown);
        gameContext.canvas.addEventListener('mousemove', handleMouseMove);
        gameContext.canvas.addEventListener('mouseup', handleMouseUp);
        gameContext.canvas.addEventListener('mouseleave', handleMouseUp); // Stop dragging if mouse leaves canvas
    }
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // NEW: Clear all existing windows on game launch when not in headless mode
    if (gameContext.windowManager && Array.isArray(gameContext.windowManager.windows)) {
        gameContext.windowManager.windows = [];
    } else if (gameContext.windowManager) {
        console.warn("windowManager.windows is not a directly clearable array. Cannot auto-clear windows on startup.");
    }

    // Initialize the game state
    // initGame(gameContext); // OLD: This is now handled by Simulation constructor and init()

    // Prepare context for the new Simulation engine
    // This context should only contain what the simulation core truly needs.
    // Other properties on the global gameContext (like renderer, camera, UI managers)
    // will remain on the global gameContext for UI/rendering layers to use.
    const simulationCoreContext = {
        GAME_SEED: gameContext.GAME_SEED,
        seedRandom: gameContext.seedRandom, // The object with init/random methods
        HEADLESS_MODE: gameContext.HEADLESS_MODE,
        RECORD_AI_DECISIONS: gameContext.RECORD_AI_DECISIONS,
        RECORD_AI_DECISIONS_DURATION_SECONDS: gameContext.RECORD_AI_DECISIONS_DURATION_SECONDS,
        battleJournal: gameContext.battleJournal,
        // resourceNodes are used by Engineer AI. If this AI logic moves into simulation, it might get this via context.
        // For now, passing it if unit logic (performSupportRole) still expects it on the passed context.
        resourceNodes: gameContext.resourceNodes, 
        // Effect and Caption classes are now imported directly by Unit/Building where needed.
        // No longer passing gameContext.Effect or gameContext.Caption to Simulation.
    };

    const simulation = new Simulation(simulationCoreContext);
    simulation.init(); // Initialize simulation state, terrain, entities

    // Make the simulation instance globally accessible for debugging or specific UI interactions.
    // This helps bridge the gap if some parts of UI still expect a global way to access sim state.
    window.simulation = simulation;

    // Create and store InputManager instance
    const inputManager = new InputManager(simulation);
    gameContext.inputManager = inputManager; // Make it available to initInputHandling via gameContext

    // Mount React UI Root
    const uiRootElement = document.getElementById('ui-root');
    let reactRoot = null; // Define reactRoot in a scope accessible by animate
    let uiInitialized = false;

    if (uiRootElement) {
        reactRoot = ReactDOM.createRoot(uiRootElement);
        reactRoot.render(
            <React.StrictMode>
                <UiRoot gameState={simulation.gameState} /> {/* Pass initial gameState */}
            </React.StrictMode>
        );
        uiInitialized = true;
        console.log("React UI Root mounted successfully.");
    } else {
        console.error('UI root element (#ui-root) not found in index.html. React UI will not be mounted.');
    }

    // Start the game loop
    console.log("Starting game loop with new Simulation engine...");
    let lastFrameTime = 0;
    function animate(timestamp) {
        const deltaTime = lastFrameTime > 0 ? (timestamp - lastFrameTime) / 1000 : (1/60); // seconds
        lastFrameTime = timestamp;

        // Update camera logic (smoothing, keyboard/mouse input)
        updateCameraLogic(deltaTime);


        // Update the simulation state
        const continueLoop = simulation.gameLoop(timestamp); // timestamp is still used by sim's internal deltaTime

        // Render the current state if not in headless mode
        if (!gameContext.HEADLESS_MODE && gameContext.renderer) {
            try {
                // Camera is already updated by updateCameraLogic which calls renderer.updateCamera
                // gameContext.renderer.updateCamera(gameContext.camera); // This is now done in updateCameraLogic
                
                // Renderer takes the simulation instance to get entities/state, 
                // and the global gameContext for other UI related info like camera.
                gameContext.renderer.render(simulation, gameContext); 
            } catch (e) {
                console.error("Error during WebGL rendering in main loop:", e);
            }

            // Draw Minimap (2D canvas)
            if (gameContext.minimapCtx) {
                const minimapRenderContext = {
                    minimapCtx: gameContext.minimapCtx,
                    terrain: simulation.terrain, // From new simulation object
                    resourceNodes: simulation.gameContext.resourceNodes, // From original context passed to sim
                    units: simulation.entityManager.units,
                    buildings: simulation.entityManager.buildings,
                    camera: gameContext.camera // Global camera object
                };
                drawMinimap(minimapRenderContext);
            }

            // Update other UI elements (DOM manipulation)
            // updateUI is called with the global gameContext which it uses to update DOM
            // It also uses formatTime, which is now correctly imported in ui.js from simulation.js
            // This call will be gradually replaced by React components.
            updateUI(gameContext);

            // Re-render React UI if initialized
            if (uiInitialized && reactRoot) {
                reactRoot.render(
                    <React.StrictMode>
                        <UiRoot gameState={simulation.gameState} />
                    </React.StrictMode>
                );
            }
        }
        
        // Check if the simulation or other logic determined the game should end
        if (!continueLoop || (simulation.gameState.winner && simulation.gameState.winner !== "RECORDING_COMPLETE")) {
            console.log("Game loop terminated.");
            if (simulation.gameState.winner === "RECORDING_COMPLETE" && gameContext.battleJournal && gameContext.battleJournal.isRecording) {
                 const recording = gameContext.battleJournal.stopRecording();
                 // TODO: Implement logic for sending/saving the recording data
                 console.log("Recording stopped in main.js due to RECORDING_COMPLETE state.");
                 // Example: sendRecordingToServer(recording); 
            }
            // Perform any other cleanup or end-game display logic here
            return; // Stop requesting new frames
        }

        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}
