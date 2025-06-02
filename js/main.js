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
        console.log("Canvas initialized successfully in main.js!");
    } else {
        console.error("Game canvas element not found!");
    }

    // Initialize core game functions if they aren't already
    if (!window.gameContext.initGame) {
        window.gameContext.initGame = initGame;
    }
    if (!window.gameContext.gameLoop) {
        window.gameContext.gameLoop = gameLoop;
    }

    // Initialize input handling function
    if (!window.gameContext.initInputHandling) {
        window.gameContext.initInputHandling = initInputHandling;
    }
}

// Import necessary modules
import { initInputHandling } from './input/inputHandler.js';
import { gameLoop, initGame } from './core/game.js'; // Import game loop and initGame as named exports
import { startRandomSeedRecording } from './core/recordingUtils.js';
import { SIMULATION_CONFIG } from './config/simulationConfig.js';
import battleJournal from './ai/battleJournal.js'; // Import battleJournal
import { Effect } from './core/effect.js'; // Import Effect class
import { Caption } from './core/caption.js'; // Import Caption class
import { initRenderer as initWebGLRenderer } from './js_rewritten/rendering/webglRenderer.js'; // Import WebGL renderer

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
gameContext.camera = {
    x: SIMULATION_CONFIG.CAMERA_START_X,
    y: SIMULATION_CONFIG.CAMERA_START_Y,
    zoom: SIMULATION_CONFIG.CAMERA_START_ZOOM,
    canvasWidth: window.innerWidth,  // Use window.innerWidth instead
    canvasHeight: window.innerHeight,  // Use window.innerHeight instead
    minZoom: 0.1, maxZoom: 1000,
    autoCamera: true,
    cameraTarget: null,
    cameraTimer: 0,
    angle: 30, // Default pitch angle for 3D view
    rotation: 45 // Default yaw rotation for 3D view
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

// Initialize input handling and start the game
if (!gameContext.HEADLESS_MODE) {
    initInputHandling(gameContext);
    // NEW: Clear all existing windows on game launch when not in headless mode
    if (gameContext.windowManager && Array.isArray(gameContext.windowManager.windows)) {
        gameContext.windowManager.windows = [];
    } else if (gameContext.windowManager) {
        console.warn("windowManager.windows is not a directly clearable array. Cannot auto-clear windows on startup.");
    }

    // Initialize the game state
    initGame(gameContext);  // Ensure gameContext is fully initialized before starting the loop

    // Start the game loop
    console.log("Starting game loop...");
    function animate(timestamp) {
        if (gameLoop(timestamp, gameContext)) {
            requestAnimationFrame(animate);
        } else {
            console.log("Game loop terminated.");
        }
    }
    requestAnimationFrame(animate);
}
