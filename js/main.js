// Define gameContext as a global object for the game
let gameContext = window.gameContext || {};
if (!window.gameContext) {
    window.gameContext = gameContext;

    // Get the canvas element and its 2D rendering context, add them to gameContext
    window.gameContext.canvas = gameContext.canvas || document.getElementById('gameCanvas');
    if (window.gameContext.canvas) {
        window.gameContext.ctx = window.gameContext.canvas.getContext('2d');
        // Ensure canvas dimensions match window dimensions for full-screen rendering
        window.gameContext.canvas.width = window.innerWidth;
        window.gameContext.canvas.height = window.innerHeight;
        console.log("Canvas context initialized successfully in main.js!");
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

// Initial game setup
// Initialize gameContext properties for the first time
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
    x: 0, y: 0, zoom: 1,
    canvasWidth: window.innerWidth,  // Use window.innerWidth instead
    canvasHeight: window.innerHeight,  // Use window.innerHeight instead
    minZoom: 0.1, maxZoom: 1000,
    autoCamera: true,
    cameraTarget: null,
    cameraTimer: 0
};
gameContext.gameState = {
    paused: false,
    gameTime: 0,
    winner: null,
    events: [],
    fpvMode: false,
    aimingGrenade: false
};

// Initialize the random seed system using native Math.random()
// For production, you might want a more robust seed generation or a fixed seed for reproducibility.
gameContext.GAME_SEED = Date.now(); // Example: use current timestamp as seed
// Replaced Math.seedrandom with a simple wrapper around Math.random for browser compatibility
gameContext.seedRandom = {
    random: function() { return Math.random(); },
    init: function(seed) { /* Not truly seeded without a library, but keeps the API */ }
};

// Initialize Battle Journal for recording AI decisions if enabled
gameContext.RECORD_AI_DECISIONS = false; // Set to true to enable recording
gameContext.RECORD_AI_DECISIONS_DURATION_SECONDS = 300; // Record for 5 minutes
if (gameContext.RECORD_AI_DECISIONS) {
    // Only import if recording is enabled to save resources
    import('./ai/battleJournal.js').then(module => {
        gameContext.battleJournal = new module.BattleJournal();
        console.log("Battle Journal initialized.");
    }).catch(error => {
        console.error("Failed to load BattleJournal:", error);
        gameContext.RECORD_AI_DECISIONS = false; // Disable recording if import fails
    });
} else {
    gameContext.battleJournal = null; // Ensure it's null if not recording
}

// Initialize SelectionManager
import SelectionManager from './ui/selectionManager.js';
gameContext.selectionManager = new SelectionManager(gameContext); // Pass gameContext to manager

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
