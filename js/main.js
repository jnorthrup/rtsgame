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
    selectedUnit: null,
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

// --- Game Context Object ---
// This object bundles all shared state and functionality to be passed to game modules.
const gameContext = {
    // Canvas & Contexts
    canvas, ctx, minimap, minimapCtx,
    // Core State
    resources, camera, gameState,
    terrain, resourceNodes,
    units, buildings, effects, captions, projectiles, // Added projectiles
    // Imported Types & Constants (for convenience if needed by functions passed in context)
    UNIT_TYPES, BUILDING_TYPES,
    WORLD_SIZE, TILE_SIZE, GRID_SIZE, TERRAIN_TYPES,
    // Imported Class Constructors
    Unit, Building, Effect, Caption, GrenadeProjectile, // Added GrenadeProjectile
    // Utilities & Functions passed into context
    // addEvent: addEventFromGameJs, // addEvent is now primarily used within game.js by other game logic.
    // formatTime: formatTimeFromGameJs, // formatTime is imported and used by ui.js directly.
    // updateUI is now imported and called by renderer.js, no longer needed directly in gameContext for that purpose.
    // mainGameGlobals for Building.update, this structure is passed within gameContext now
    // The Building class in building.js expects a mainGameGlobals object as its second param for update.
    // The update function in game.js now constructs this from gameContext.
    // So, we provide the necessary components for that here.
    mainGameGlobals: {
        resources: resources,
        captions: captions,
        Caption: Caption, // Class constructor
        units: units,
        Unit: Unit,       // Class constructor
        addEvent: (type, message, importance) => addEventFromGameJs(gameContext, type, message, importance)
    },
    // Make initGame and addEvent available on gameContext for inputHandler and potentially other modules
    initGame: initGame,
    addEvent: addEventFromGameJs,
    performAoeDamage: performAoeDamage // Added performAoeDamage to gameContext
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
initGame(gameContext); // Call imported initGame with context
initInputHandling(gameContext); // Initialize input handlers

// --- Start Game Loop ---
let lastTimestamp = 0;
function mainRequestAnimationFrameLoop(timestamp) {
    if (!lastTimestamp) {
        lastTimestamp = timestamp;
    }
    // const deltaTime = (timestamp - lastTimestamp) / 1000; // Optional: pass deltaTime to gameLoop in game.js
    lastTimestamp = timestamp;

    gameLoop(timestamp, gameContext); // gameLoop is imported from game.js
    requestAnimationFrame(mainRequestAnimationFrameLoop);
}

requestAnimationFrame(mainRequestAnimationFrameLoop);
