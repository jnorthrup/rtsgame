// Game state
// Note: These are exported directly. Consider encapsulating if direct modification becomes an issue.
export let camera = {
    x: 0, // Will be initialized properly in initGame
    y: 0,
    zoom: 1.0,
    minZoom: 0.1,
    maxZoom: 1000,
    autoCamera: true,
    cameraTarget: null,
    cameraTimer: 0
};

export let gameState = {
    paused: false,
    selectedUnit: null,
    fpvMode: false,
    winner: null,
    gameTime: 0,
    events: [],
    lastEventTime: 0,
    hoveredEntity: null,
    mouseX: 0,
    mouseY: 0,
    battleIntensity: 0,
    economicStrength: { blue: 0, red: 0 },
    armyStrength: { blue: 0, red: 0 }
};

// Resources
export let resources = {
    blue: { mass: 1000, energy: 1000, massIncome: 0, energyIncome: 0 },
    red: { mass: 1000, energy: 1000, massIncome: 0, energyIncome: 0 }
};

// Function to reset states to initial values (will be called by initGame)
// Imports WORLD_SIZE from constants.js
import { WORLD_SIZE } from './constants.js';

export function resetGameState() {
    camera = {
        x: WORLD_SIZE / 2,
        y: WORLD_SIZE / 2,
        zoom: 1.0,
        minZoom: 0.1,
        maxZoom: 1000,
        autoCamera: true,
        cameraTarget: null,
        cameraTimer: 0
    };

    gameState = {
        paused: false,
        selectedUnit: null,
        fpvMode: false,
        winner: null,
        gameTime: 0,
        events: [],
        lastEventTime: 0,
        hoveredEntity: null,
        mouseX: 0,
        mouseY: 0,
        battleIntensity: 0,
        economicStrength: { blue: 0, red: 0 },
        armyStrength: { blue: 0, red: 0 }
    };

    resources = {
        blue: { mass: 1000, energy: 1000, massIncome: 0, energyIncome: 0 },
        red: { mass: 1000, energy: 1000, massIncome: 0, energyIncome: 0 }
    };
}
