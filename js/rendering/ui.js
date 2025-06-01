import { UNIT_TYPES } from '../config/unitTypes.js';
// formatTime is imported from game.js, which requires gameContext.
// However, updateUI itself will receive gameContext.
// formatTime itself doesn't need gameContext, only the value to format.
import { formatTime } from '../core/game.js';

export function updateUI(gameContext) {
    const { units, resources, gameState, camera, UNIT_TYPES: gameContextUnitTypes } = gameContext;
    // Use gameContextUnitTypes if UNIT_TYPES from direct import causes issues with context,
    // but direct import is cleaner if UNIT_TYPES is static config.
    // For now, using imported UNIT_TYPES.

    // Count units
    const blueUnits = units.filter(u => u.team === 'blue').length;
    const redUnits = units.filter(u => u.team === 'red').length;

    const blueUnitsEl = document.getElementById('blueUnits');
    if (blueUnitsEl) blueUnitsEl.textContent = blueUnits;

    const redUnitsEl = document.getElementById('redUnits');
    if (redUnitsEl) redUnitsEl.textContent = redUnits;

    // Commander health
    const blueCommander = units.find(u => u.team === 'blue' && u.type === UNIT_TYPES.commander);
    const redCommander = units.find(u => u.team === 'red' && u.type === UNIT_TYPES.commander);

    const blueCommanderEl = document.getElementById('blueCommander');
    if (blueCommanderEl) blueCommanderEl.textContent = blueCommander ?
        Math.round(blueCommander.hp / blueCommander.maxHp * 100) + '%' : 'DESTROYED';

    const redCommanderEl = document.getElementById('redCommander');
    if (redCommanderEl) redCommanderEl.textContent = redCommander ?
        Math.round(redCommander.hp / redCommander.maxHp * 100) + '%' : 'DESTROYED';

    // Resources
    const blueMassEl = document.getElementById('blueMass');
    if (blueMassEl) blueMassEl.textContent = Math.floor(resources.blue.mass);

    const blueEnergyEl = document.getElementById('blueEnergy');
    if (blueEnergyEl) blueEnergyEl.textContent = Math.floor(resources.blue.energy);

    const redMassEl = document.getElementById('redMass');
    if (redMassEl) redMassEl.textContent = Math.floor(resources.red.mass);

    const redEnergyEl = document.getElementById('redEnergy');
    if (redEnergyEl) redEnergyEl.textContent = Math.floor(resources.red.energy);

    // Game time
    const gameTimeEl = document.getElementById('gameTime');
    // formatTime is imported and used directly.
    if (gameTimeEl) gameTimeEl.textContent = formatTime(gameState.gameTime);

    // Zoom level
    const zoomLevelEl = document.getElementById('zoomLevel');
    if (zoomLevelEl) zoomLevelEl.textContent = camera.zoom.toFixed(1) + 'x';

    // FPV mode indicator
    const fpvModeEl = document.getElementById('fpvMode');
    if (fpvModeEl) fpvModeEl.style.display = gameState.fpvMode ? 'block' : 'none';
}
