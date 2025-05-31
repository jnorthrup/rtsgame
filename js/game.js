import { WORLD_SIZE, BUILDING_TYPES, UNIT_TYPES } from './config.js';
import { formatTime, findLandPosition, findWaterPosition } from './utils.js';
import { terrain, resourceNodes, generateTerrain } from './terrain.js';
import { Unit, Building, Effect, Caption } from './entities.js'; // Assuming combined export
import { addEvent } from './eventSystem.js';
import { updateUI } from './ui.js';
import { setupInputHandlers } from './input.js';
import { renderGame } from './rendering.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap'); // Corrected ID
const minimapCtx = minimapCanvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
minimapCanvas.width = 200; // minimap instead of minimapCanvas
minimapCanvas.height = 200;

// Make resources global for now, or manage its state more carefully
window.resources = {
    blue: { mass: 1000, energy: 1000, massIncome: 0, energyIncome: 0 },
    red: { mass: 1000, energy: 1000, massIncome: 0, energyIncome: 0 }
};

let camera = {
    x: WORLD_SIZE / 2,
    y: WORLD_SIZE / 2,
    zoom: 1.0,
    minZoom: 0.1,
    maxZoom: 1000,
    autoCamera: true,
    cameraTarget: null,
    cameraTimer: 0
};

let gameState = {
    paused: false,
    selectedUnit: null,
    fpvMode: false,
    winner: null,
    gameTime: 0,
    events: [], // Managed by eventSystem
    lastEventTime: 0,
    hoveredEntity: null,
    mouseX: 0,
    mouseY: 0,
    battleIntensity: 0,
    economicStrength: { blue: 0, red: 0 },
    armyStrength: { blue: 0, red: 0 }
};

let units = [];
let buildings = [];
let effects = [];
let captions = [];

function initGame() {
    units.length = 0;
    buildings.length = 0;
    effects.length = 0;
    captions.length = 0;
    gameState.winner = null;
    gameState.gameTime = 0;
    gameState.events.length = 0;

    window.resources.blue = { mass: 1000, energy: 1000, massIncome: 0, energyIncome: 0 };
    window.resources.red = { mass: 1000, energy: 1000, massIncome: 0, energyIncome: 0 };

    generateTerrain(); // from terrain.js

    const blueStart = findLandPosition(WORLD_SIZE * 0.2, WORLD_SIZE * 0.5, terrain);
    const redStart = findLandPosition(WORLD_SIZE * 0.8, WORLD_SIZE * 0.5, terrain);

    buildings.push(new Building(blueStart.x, blueStart.y, 'blue', BUILDING_TYPES.commander));
    buildings.push(new Building(redStart.x, redStart.y, 'red', BUILDING_TYPES.commander));

    placeFactoriesAroundCommander(blueStart, 'blue');
    placeFactoriesAroundCommander(redStart, 'red');

    units.push(new Unit(blueStart.x + 50, blueStart.y, 'blue', UNIT_TYPES.engineer));
    units.push(new Unit(blueStart.x - 50, blueStart.y, 'blue', UNIT_TYPES.engineer));
    units.push(new Unit(redStart.x + 50, redStart.y, 'red', UNIT_TYPES.engineer));
    units.push(new Unit(redStart.x - 50, redStart.y, 'red', UNIT_TYPES.engineer));

    camera.x = WORLD_SIZE / 2;
    camera.y = WORLD_SIZE / 2;
    camera.zoom = 0.5;

    // Pass necessary state to addEvent
    addEvent(gameState, camera, 'strategic', 'Battle commenced!', 3);
}

function placeFactoriesAroundCommander(commanderPos, team) {
    const offset = 150;
    const landPos = findLandPosition(commanderPos.x + offset, commanderPos.y, terrain);
    buildings.push(new Building(landPos.x, landPos.y, team, BUILDING_TYPES.landFactory));
    const airPos = findLandPosition(commanderPos.x - offset, commanderPos.y, terrain);
    buildings.push(new Building(airPos.x, airPos.y, team, BUILDING_TYPES.airFactory));
    const navalPos = findWaterPosition(commanderPos.x, commanderPos.y + offset, terrain);
    const dist = Math.sqrt((navalPos.x - commanderPos.x) ** 2 + (navalPos.y - commanderPos.y) ** 2);
    if (dist < 500) {
        buildings.push(new Building(navalPos.x, navalPos.y, team, BUILDING_TYPES.navalFactory));
    }
    const energyPos1 = findLandPosition(commanderPos.x, commanderPos.y - offset, terrain);
    buildings.push(new Building(energyPos1.x, energyPos1.y, team, BUILDING_TYPES.energyExtractor));
}

// AI Functions (makeStrategicDecisions, coordinateAttacks) - these are large
// For now, keep them here, or move to ai.js later
function makeStrategicDecisions() {
    for (const team of ['blue', 'red']) {
        const teamBuildings = buildings.filter(b => b.team === team);
        const hasAdvanced = teamBuildings.some(b => b.type.name === 'Advanced Land Factory');
        if (!hasAdvanced && window.resources[team].mass > 500 && Math.random() < 0.1) {
            const commander = teamBuildings.find(b => b.type.name === 'Commander');
            if (commander) {
                const pos = findLandPosition(commander.x + (Math.random() - 0.5) * 300, commander.y + (Math.random() - 0.5) * 300, terrain);
                buildings.push(new Building(pos.x, pos.y, team, BUILDING_TYPES.advancedLandFactory));
                const event = addEvent(gameState, camera, 'build', `${team.toUpperCase()} constructs Advanced Factory!`, 2);
                event.position = { x: pos.x, y: pos.y };
            }
        }
        const teamUnits = units.filter(u => u.team === team && !u.type.support);
        if (teamUnits.length > 10 && Math.random() < 0.05) {
            const raidSize = Math.min(5 + Math.floor(Math.random() * 5), teamUnits.length / 2);
            const raiders = teamUnits.slice(0, raidSize);
            const enemyTargets = buildings.filter(b => b.team !== team && b.type.resourceGeneration);
            if (enemyTargets.length > 0) {
                const target = enemyTargets[Math.floor(Math.random() * enemyTargets.length)];
                raiders.forEach(unit => { unit.patrolTarget = { x: target.x, y: target.y }; unit.aggressiveness = 0.9; });
                captions.push(new Caption(raiders[0].x, raiders[0].y, `Raid group forming!`, '#f80', 12));
                const event = addEvent(gameState, camera, 'strategic', `${team.toUpperCase()} launches raid on enemy economy!`, 2);
                event.position = { x: target.x, y: target.y };
            }
        }
    }
}
function coordinateAttacks() { /* ... Placeholder for the large function ... */ }


function update() {
    if (gameState.paused || gameState.winner) return;
    gameState.gameTime += 1/60;

    if (camera.autoCamera && camera.cameraTarget && camera.cameraTimer > 0) {
        const dx = camera.cameraTarget.x - camera.x;
        const dy = camera.cameraTarget.y - camera.y;
        camera.x += dx * 0.1;
        camera.y += dy * 0.1;
        camera.cameraTimer--;
        if (camera.cameraTimer <= 0) camera.cameraTarget = null;
    }
    if (camera.autoCamera && !camera.cameraTarget && Math.random() < 0.005) {
        const targets = [...units.filter(u => u.target), ...buildings];
        if (targets.length > 0) {
            const target = targets[Math.floor(Math.random() * targets.length)];
            camera.cameraTarget = { x: target.x, y: target.y };
            camera.cameraTimer = 180;
        }
    }

    for (let i = units.length - 1; i >= 0; i--) {
        const unit = units[i];
        unit.update(units, buildings); // Will need resources, addEvent, captions, effects, etc.
        if (unit.hp <= 0) {
            if (unit.type.tier >= 2) {
                const event = addEvent(gameState, camera, 'battle', `${unit.team.toUpperCase()} ${unit.type.name} destroyed!`, 2);
                event.position = { x: unit.x, y: unit.y };
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
        building.update(units); // Will need resources, addEvent, captions, etc.
        if (building.hp <= 0) {
            if (building.type.name === 'Commander') {
                gameState.winner = building.team === 'blue' ? 'RED' : 'BLUE';
                captions.push(new Caption(building.x, building.y, 'COMMANDER DESTROYED!', '#ff0', 20));
                const event = addEvent(gameState, camera, 'strategic', `${gameState.winner} achieves victory!`, 3);
                event.position = { x: building.x, y: building.y };
            } else if (building.type.produces || building.type.resourceGeneration) {
                captions.push(new Caption(building.x, building.y, 'Structure lost!', '#f88', 12));
                const event = addEvent(gameState, camera, 'battle', `${building.team.toUpperCase()} ${building.type.name} destroyed!`, 2);
                event.position = { x: building.x, y: building.y };
            }
            buildings.splice(i, 1);
        }
    }
    for (let i = effects.length - 1; i >= 0; i--) {
        effects[i].update();
        if (effects[i].life <= 0 && effects[i].particles.every(p => p.life <= 0)) effects.splice(i, 1);
    }
    for (let i = captions.length - 1; i >= 0; i--) {
        captions[i].update();
        if (captions[i].life <= 0) captions.splice(i, 1);
    }

    if (Math.random() < 0.01) makeStrategicDecisions();
    if (Math.random() < 0.005) coordinateAttacks(); // Definition needed

    if (gameState.fpvMode && gameState.selectedUnit) {
        camera.x = gameState.selectedUnit.x;
        camera.y = gameState.selectedUnit.y;
        camera.zoom = 10;
    }
}

let lastTime = 0;
let fps = 0;
let frameCount = 0;

function gameLoop(timestamp) {
    frameCount++;
    if (timestamp - lastTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastTime = timestamp;
        const fpsEl = document.getElementById('fps');
        if (fpsEl) fpsEl.textContent = fps;
    }
    update();
    renderGame(ctx, camera, canvas, terrain, resourceNodes, buildings, units, effects, captions, gameState, minimapCtx, updateUI);
    requestAnimationFrame(gameLoop);
}

// Setup input handlers
setupInputHandlers(canvas, minimapCanvas, camera, gameState, units, addEvent, initGame, WORLD_SIZE);

// Start game
initGame();
requestAnimationFrame(gameLoop);
