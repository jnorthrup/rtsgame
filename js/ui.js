import { gameState, camera, resources } from './gameState.js';
import { formatTime } from './utils.js';
// currentUnits and currentBuildings will be passed as arguments to updateUI

// DOM elements - cache them for performance
let blueUnitsEl, redUnitsEl, blueCommanderEl, redCommanderEl;
let blueMassEl, blueEnergyEl, redMassEl, redEnergyEl;
let gameTimeEl, zoomLevelEl, fpvModeEl, fpsEl;
let eventLogEl; // For direct DOM manipulation if needed by event system

// To be called once when the game initializes and DOM is ready
export function initUI() {
    blueUnitsEl = document.getElementById('blueUnits');
    redUnitsEl = document.getElementById('redUnits');
    blueCommanderEl = document.getElementById('blueCommander');
    redCommanderEl = document.getElementById('redCommander');
    blueMassEl = document.getElementById('blueMass');
    blueEnergyEl = document.getElementById('blueEnergy');
    redMassEl = document.getElementById('redMass');
    redEnergyEl = document.getElementById('redEnergy');
    gameTimeEl = document.getElementById('gameTime');
    zoomLevelEl = document.getElementById('zoomLevel');
    fpvModeEl = document.getElementById('fpvMode');
    fpsEl = document.getElementById('fps');
    eventLogEl = document.getElementById('events'); // Cache event log

    // Initial UI update based on default gameState
    if(gameState && resources && camera && blueUnitsEl) { // Check if elements were found
        blueMassEl.textContent = Math.floor(resources.blue.mass);
        blueEnergyEl.textContent = Math.floor(resources.blue.energy);
        redMassEl.textContent = Math.floor(resources.red.mass);
        redEnergyEl.textContent = Math.floor(resources.red.energy);
        gameTimeEl.textContent = formatTime(gameState.gameTime);
        zoomLevelEl.textContent = camera.zoom.toFixed(1) + 'x';
        fpvModeEl.style.display = gameState.fpvMode ? 'block' : 'none';
        fpsEl.textContent = '0';
        blueUnitsEl.textContent = '0';
        redUnitsEl.textContent = '0';
        blueCommanderEl.textContent = '100%'; // Default before buildings are loaded
        redCommanderEl.textContent = '100%';
    } else {
        console.error("Failed to initialize all UI elements. Some getElementById calls returned null.");
    }
}

export function updateUI(currentUnits, currentBuildings, currentFps) {
    if (!blueUnitsEl) {
        // console.warn("UI not fully initialized, skipping updateUI."); // Potentially noisy
        return;
    }

    const blueUnitCount = currentUnits.filter(u => u.team === 'blue').length;
    const redUnitCount = currentUnits.filter(u => u.team === 'red').length;

    blueUnitsEl.textContent = blueUnitCount;
    redUnitsEl.textContent = redUnitCount;

    const blueCommander = currentBuildings.find(b => b.team === 'blue' && b.type.name === 'Commander');
    const redCommander = currentBuildings.find(b => b.team === 'red' && b.type.name === 'Commander');

    blueCommanderEl.textContent = blueCommander ?
        Math.round(blueCommander.hp / blueCommander.maxHp * 100) + '%' : 'DESTROYED';
    redCommanderEl.textContent = redCommander ?
        Math.round(redCommander.hp / redCommander.maxHp * 100) + '%' : 'DESTROYED';

    blueMassEl.textContent = Math.floor(resources.blue.mass);
    blueEnergyEl.textContent = Math.floor(resources.blue.energy);
    redMassEl.textContent = Math.floor(resources.red.mass);
    redEnergyEl.textContent = Math.floor(resources.red.energy);

    gameTimeEl.textContent = formatTime(gameState.gameTime);
    zoomLevelEl.textContent = camera.zoom.toFixed(1) + 'x';
    fpvModeEl.style.display = gameState.fpvMode ? 'block' : 'none';

    if (fpsEl) {
        fpsEl.textContent = currentFps;
    }
}

// If eventSystem.js is to remain responsible for adding event divs, it can import this or similar.
// Alternatively, gameLoop can call this function with gameState.events.
export function renderEventLog() {
    if (!eventLogEl || !gameState || !gameState.events) return;

    // Clear current log
    // while (eventLogEl.firstChild) {
    //     eventLogEl.removeChild(eventLogEl.firstChild);
    // }
    // The original addEvent prepends, so clearing might not be needed if addEvent also handles removal of old ones.
    // For now, assume addEvent in eventSystem.js handles the direct DOM manipulation.
    // If we want ui.js to be the sole manipulator for events:
    // 1. addEvent in eventSystem.js should ONLY update gameState.events.
    // 2. This function (renderEventLog) should be called in the main game loop.
    // 3. This function would then iterate gameState.events and build the log.
    // This change is deferred for now to stick closer to original logic flow.
}
