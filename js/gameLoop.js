import { camera, gameState, resources, resetGameState } from './gameState.js';
import { TERRAIN_TYPES, WORLD_SIZE, TILE_SIZE, GRID_SIZE, UNIT_TYPES, BUILDING_TYPES } from './constants.js';
import { formatTime } from './utils.js';
import { generateTerrain, findLandPosition, findWaterPosition, terrain as currentTerrain, resourceNodes as currentResourceNodes } from './terrain.js';
import { addEvent } from './eventSystem.js';
import { Unit, _setUnitDependencies } from './entities/Unit.js';
import { Building, _setBuildingDependencies } from './entities/Building.js';
import { Effect } from './entities/Effect.js';
import { Caption } from './entities/Caption.js';
import { initUI, updateUI } from './ui.js';
import { initRenderer, render } from './renderer.js';
import { initInputHandlers } from './input.js';
import { makeStrategicDecisions } from './ai/strategicAI.js';
import { coordinateAttacks } from './ai/tacticalAI.js';

// Game entities
export let units = [];
export let buildings = [];
export let effects = [];
export let captions = [];

// FPS counter
let lastTime = 0;
let fps = 0;
let frameCount = 0;

// Canvas elements - to be set by startGame
let gameCanvasElement, minimapElementRef;


export function startGame(canvasElement, minimapCanvasElement) {
    gameCanvasElement = canvasElement;
    minimapElementRef = minimapCanvasElement;

    initRenderer(gameCanvasElement, minimapElementRef);
    initUI();
    initInputHandlers(gameCanvasElement, minimapElementRef);

    _setUnitDependencies({
        captions: captions,
        effects: effects,
        terrain: currentTerrain,
        resourceNodes: currentResourceNodes
    });
    _setBuildingDependencies({ units: units, captions: captions });

    // Make units array available to input handler for selection via gameState
    gameState.currentUnits = units;

    initGame();
    requestAnimationFrame(gameLoop);
}

export function initGame() { // Exporting for 'R' key restart functionality
    resetGameState();

    units.length = 0;
    buildings.length = 0;
    effects.length = 0;
    captions.length = 0;
    // gameState.winner is reset in resetGameState
    // gameState.gameTime is reset in resetGameState

    generateTerrain();

    const blueStart = findLandPosition(WORLD_SIZE * 0.2, WORLD_SIZE * 0.5);
    const redStart = findLandPosition(WORLD_SIZE * 0.8, WORLD_SIZE * 0.5);

    buildings.push(new Building(blueStart.x, blueStart.y, 'blue', BUILDING_TYPES.commander));
    buildings.push(new Building(redStart.x, redStart.y, 'red', BUILDING_TYPES.commander));

    placeFactoriesAroundCommander(blueStart, 'blue');
    placeFactoriesAroundCommander(redStart, 'red');

    units.push(new Unit(blueStart.x + 50, blueStart.y, 'blue', UNIT_TYPES.engineer));
    units.push(new Unit(blueStart.x - 50, blueStart.y, 'blue', UNIT_TYPES.engineer));
    units.push(new Unit(redStart.x + 50, redStart.y, 'red', UNIT_TYPES.engineer));
    units.push(new Unit(redStart.x - 50, redStart.y, 'red', UNIT_TYPES.engineer));

    if (camera) camera.zoom = 0.5;

    addEvent('strategic', 'Battle commenced!', 3);

    // Initial UI update
    // Ensure DOM elements are ready before calling this. initUI should handle caching them.
    updateUI(units, buildings, fps);
}

function placeFactoriesAroundCommander(commanderPos, team) {
    const offset = 150;
    const landPos = findLandPosition(commanderPos.x + offset, commanderPos.y);
    if (landPos) buildings.push(new Building(landPos.x, landPos.y, team, BUILDING_TYPES.landFactory));

    const airPos = findLandPosition(commanderPos.x - offset, commanderPos.y);
    if (airPos) buildings.push(new Building(airPos.x, airPos.y, team, BUILDING_TYPES.airFactory));

    const navalPos = findWaterPosition(commanderPos.x, commanderPos.y + offset);
    if (navalPos) {
      const distToWater = Math.sqrt((navalPos.x - commanderPos.x) ** 2 + (navalPos.y - commanderPos.y) ** 2);
      if (distToWater < 500) {
          buildings.push(new Building(navalPos.x, navalPos.y, team, BUILDING_TYPES.navalFactory));
      }
    }

    const energyPos1 = findLandPosition(commanderPos.x, commanderPos.y - offset);
    if (energyPos1) buildings.push(new Building(energyPos1.x, energyPos1.y, team, BUILDING_TYPES.energyExtractor));
}

function gameUpdate() {
    if (gameState.paused || gameState.winner) return;

    gameState.gameTime += 1 / 60; // Assuming 60 FPS for game time progression

    if (camera.autoCamera && camera.cameraTarget && camera.cameraTimer > 0) {
        const dx = camera.cameraTarget.x - camera.x;
        const dy = camera.cameraTarget.y - camera.y;
        camera.x += dx * 0.1;
        camera.y += dy * 0.1;
        camera.cameraTimer--;
        if (camera.cameraTimer <= 0) camera.cameraTarget = null;
    }

    if (camera.autoCamera && !camera.cameraTarget && Math.random() < 0.005) {
        const focusTargets = [...units.filter(u => u.target), ...buildings];
        if (focusTargets.length > 0) {
            const target = focusTargets[Math.floor(Math.random() * focusTargets.length)];
            camera.cameraTarget = { x: target.x, y: target.y };
            camera.cameraTimer = 180;
        }
    }

    for (let i = units.length - 1; i >= 0; i--) {
        const unit = units[i];
        unit.update(units, buildings);
        if (unit.hp <= 0) {
            if (unit.type.tier >= 2) {
                const event = addEvent('battle', `${unit.team.toUpperCase()} ${unit.type.name} destroyed!`, 2);
                if(event && unit.x && unit.y) event.position = { x: unit.x, y: unit.y };
            }
            units.splice(i, 1);
            if (unit === gameState.selectedUnit) {
                gameState.selectedUnit = null;
                gameState.fpvMode = false;
            }
        }
    }

    for (let i = buildings.length - 1; i >= 0; i--) {
        const building = buildings[i];
        building.update();
        if (building.hp <= 0) {
            if (building.type.name === 'Commander') {
                gameState.winner = building.team === 'blue' ? 'RED' : 'BLUE';
                captions.push(new Caption(building.x, building.y, 'COMMANDER DESTROYED!', '#ff0', 20));
                const event = addEvent('strategic', `${gameState.winner} achieves victory!`, 3);
                if(event && building.x && building.y) event.position = { x: building.x, y: building.y };
            } else if (building.type.produces || building.type.resourceGeneration) {
                captions.push(new Caption(building.x, building.y, 'Structure lost!', '#f88', 12));
                const event = addEvent('battle', `${building.team.toUpperCase()} ${building.type.name} destroyed!`, 2);
                if(event && building.x && building.y) event.position = { x: building.x, y: building.y };
            }
            buildings.splice(i, 1);
        }
    }

    for (let i = effects.length - 1; i >= 0; i--) {
        effects[i].update();
        if (effects[i].life <= 0 && effects[i].particles.every(p => p.life <= 0)) {
            effects.splice(i, 1);
        }
    }

    for (let i = captions.length - 1; i >= 0; i--) {
        captions[i].update();
        if (captions[i].life <= 0) captions.splice(i, 1);
    }

    if (Math.random() < 0.01) makeStrategicDecisions(buildings, units, captions);
    if (Math.random() < 0.005) coordinateAttacks(units, buildings, captions);

    if (gameState.fpvMode && gameState.selectedUnit) {
        camera.x = gameState.selectedUnit.x;
        camera.y = gameState.selectedUnit.y;
        camera.zoom = 10;
    }
}

function gameLoop(timestamp) {
    frameCount++;
    const deltaTime = timestamp - lastTime; // More accurate FPS calculation
    if (deltaTime >= 1000) { // Update FPS every second
        fps = frameCount;
        frameCount = 0;
        lastTime = timestamp;
    }

    gameUpdate();
    render(currentTerrain, currentResourceNodes, units, buildings, effects, captions);
    updateUI(units, buildings, fps);

    requestAnimationFrame(gameLoop);
}

// Final setup for window resize, if needed by specific modules
// The original one was global. Renderer might need to know if canvas size changes.
window.addEventListener('resize', () => {
    if (gameCanvasElement && minimapElementRef) { // Check if elements are initialized
        gameCanvasElement.width = window.innerWidth;
        gameCanvasElement.height = window.innerHeight;
        // minimap size is fixed, but if it were dynamic, update here
        // Potentially re-initialize renderer or parts of it if context is lost/changed
        if (typeof initRenderer === 'function') { // Re-init renderer if canvas size changes
             // initRenderer(gameCanvasElement, minimapElementRef); // This might be too much, clearing context
        }
    }
});
