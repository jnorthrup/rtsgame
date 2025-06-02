import { UNIT_TYPES } from './config/unitTypes.js';
import { BUILDING_TYPES } from './config/buildingTypes.js';
import { WORLD_SIZE, TILE_SIZE, GRID_SIZE, TERRAIN_TYPES, MIN_LAND_PERCENTAGE, MAX_TERRAIN_RETRIES } from './config/gameConstants.js';
import { Unit } from './core/unit.js';
import { Building } from './core/building.js';
import { Effect } from './core/effect.js';
import { Caption } from './core/caption.js';
import { GrenadeProjectile } from './core/projectile.js'; // Added import
import { initGame, gameLoop, addEvent as addEventFromGameJs, formatTime as formatTimeFromGameJs, performAoeDamage } from './core/game.js'; // Added performAoeDamage
import { initInputHandling } from './input/inputHandler.js'; // Import input handling
import SelectionManager from './ui/selectionManager.js';
import * as seedRandom from './core/seedRandom.js'; // NEW IMPORT for seeded random
import BattleJournal from './core/battleJournal.js'; // NEW IMPORT for BattleJournal

// --- Canvas and Contexts ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimap = document.getElementById('minimap');
const minimapCtx = minimap.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
minimap.width = 200;
minimap.height = 200;

// --- Core Game State Variables ---
const resources = {
    blue: { mass: 1000, energy: 1000, massIncome: 0, energyIncome: 0 },
    red: { mass: 1000, energy: 1000, massIncome: 0, energyIncome: 0 }
};

const camera = {
    x: WORLD_SIZE / 2,
    y: WORLD_SIZE / 2,
    zoom: 1.0,
    minZoom: 0.1,
    maxZoom: 1000,
    autoCamera: true,
    cameraTarget: null,
    cameraTimer: 0,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height
};

const gameState = {
    paused: false,
    fpvMode: false,
    aimingGrenade: false,
    winner: null,
    gameTime: 0,
    events: [], // Will be managed by addEvent in game.js
    lastEventTime: 0, // Potentially managed by game.js if relevant
    hoveredEntity: null, // UI concern, might move later
    mouseX: 0, mouseY: 0, // UI concern
    battleIntensity: 0, // Game logic concern
    economicStrength: { blue: 0, red: 0 }, // Game logic concern
    armyStrength: { blue: 0, red: 0 } // Game logic concern
};

const terrain = []; // Populated by generateTerrain in game.js
const resourceNodes = []; // Populated by generateTerrain in game.js

const units = [];
const buildings = [];
const effects = [];
const captions = [];
const projectiles = []; // Added projectiles array

// NEW: Global Configuration Flags for Headless Mode and Recording
const HEADLESS_MODE = true; // Set to true to run without rendering/input for recording
const RECORD_AI_DECISIONS = true; // Set to true to enable AI decision recording
const RECORD_AI_DECISIONS_DURATION_SECONDS = 10; // Duration for AI decision recording in seconds

// NEW: Initialize BattleJournal
const battleJournal = new BattleJournal();

// NEW: Game Seed for Deterministic Simulation
const GAME_SEED = 12345; // Fixed seed for reproducible results

// --- Game Context Object ---
// This object bundles all shared state and functionality to be passed to game modules.
const gameContext = {
    // Canvas & Contexts
    canvas, ctx, minimap, minimapCtx,
    // Core State
    resources, camera, gameState,
    terrain, resourceNodes,
    units, buildings, effects, captions, projectiles,
    // Selection Manager
    selectionManager: new SelectionManager(), // Initialize selection manager here
    // Battle Journal
    battleJournal, // NEW: Pass battleJournal to gameContext
    // Seeded Random
    seedRandom, // NEW: Pass seedRandom module to gameContext

    // Imported Types & Constants (for convenience if needed by functions passed in context)
    UNIT_TYPES, BUILDING_TYPES,
    WORLD_SIZE, TILE_SIZE, GRID_SIZE, TERRAIN_TYPES,
    // Imported Class Constructors
    Unit, Building, Effect, Caption, GrenadeProjectile,
    // Utilities & Functions passed into context
    mainGameGlobals: {
        resources: resources,
        captions: captions,
        Caption: Caption,
        units: units,
        Unit: Unit,
        addEvent: (type, message, importance) => addEventFromGameJs(gameContext, type, message, importance)
    },
    // Make initGame and addEvent available on gameContext for inputHandler and potentially other modules
    initGame: initGame,
    addEvent: addEventFromGameJs,
    performAoeDamage: performAoeDamage,
    // NEW: Pass configuration flags
    HEADLESS_MODE: HEADLESS_MODE,
    RECORD_AI_DECISIONS: RECORD_AI_DECISIONS,
    RECORD_AI_DECISIONS_DURATION_SECONDS: RECORD_AI_DECISIONS_DURATION_SECONDS,
    GAME_SEED: GAME_SEED // NEW: Pass game seed
};


// --- Populate commander buildList (needs to be after UNIT_TYPES and BUILDING_TYPES are defined/imported) ---
if (UNIT_TYPES.commander) {
    UNIT_TYPES.commander.buildList = [
        BUILDING_TYPES.massExtractor,
        BUILDING_TYPES.energyExtractor,
        BUILDING_TYPES.landFactory
    ];
} else {
    console.error("Commander unit type (UNIT_TYPES.commander) not found for buildList population in main.js!");
}

// --- Window Resize (Handled by inputHandler.js via gameContext) ---

// --- Initialize Game & Input Handling ---
// Pass the gameContext to initGame, which will handle seedRandom.init() and battleJournal.startRecording()
initGame(gameContext);

// Only initialize input handling if not in headless mode
if (!gameContext.HEADLESS_MODE) {
    initInputHandling(gameContext);
} else {
    console.log("Running in HEADLESS_MODE. Skipping input handling.");
}

// --- Start Game Loop ---
let lastTimestamp = 0;
function mainRequestAnimationFrameLoop(timestamp) {
    if (!lastTimestamp) {
        lastTimestamp = timestamp;
    }
    lastTimestamp = timestamp;

    // gameLoop itself will now contain the logic to stop based on duration if in headless mode
    // It also handles skipping render if HEADLESS_MODE is true
    const continueLoop = gameLoop(timestamp, gameContext); 
    
    if (continueLoop) {
        requestAnimationFrame(mainRequestAnimationFrameLoop);
    } else {
        console.log("Game loop terminated by HEADLESS_MODE duration.");
        // Optional: Output the battle journal content here if needed
        if (gameContext.RECORD_AI_DECISIONS) {
            console.log("Recorded AI Decisions:", JSON.stringify(gameContext.battleJournal.getRecordedData(), null, 2)); // Stringify for readable output
            // You might want to save this to a file or send it somewhere
            // For now, it's just logged to console.
        }
    }
}

requestAnimationFrame(mainRequestAnimationFrameLoop);
