import { UNIT_TYPES } from '../config/unitTypes.js';
// formatTime is imported from game.js, which requires gameContext.
// However, updateUI itself will receive gameContext.
// formatTime itself doesn't need gameContext, only the value to format.
import { formatTime } from '../core/game.js';

export function updateUI(gameContext) {
    const { units, buildings, resources, gameState, camera, UNIT_TYPES: gameContextUnitTypes } = gameContext;
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

    // Update status window with detailed information
    updateStatusWindow(gameContext);

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

function updateStatusWindow(gameContext) {
    const { units, buildings, resources, gameState } = gameContext;
    const statusContent = document.getElementById('statusContent');
    
    if (!statusContent) return;

    // Get detailed stats for both teams
    const blueStats = getTeamStats('blue', units, buildings, resources);
    const redStats = getTeamStats('red', units, buildings, resources);
    
    const html = `
        <div class="status-line">
            <span class="status-label">Game Time:</span>
            <span class="status-value">${formatTime(gameState.gameTime)}</span>
        </div>
        
        <h4 style="color: #44f; margin: 10px 0 5px 0;">BLUE TEAM STATUS</h4>
        <div class="status-line">
            <span class="status-label">Resources:</span>
            <span class="status-value">${Math.floor(resources.blue.mass)}M / ${Math.floor(resources.blue.energy)}E</span>
        </div>
        <div class="status-line">
            <span class="status-label">Income:</span>
            <span class="status-value">+${resources.blue.massIncome || 0}/min M, +${resources.blue.energyIncome || 0}/min E</span>
        </div>
        <div class="status-line">
            <span class="status-label">Units:</span>
            <span class="status-value">${blueStats.units.total} total (${blueStats.units.combat} combat, ${blueStats.units.support} support)</span>
        </div>
        <div class="status-line">
            <span class="status-label">Buildings:</span>
            <span class="status-value">${blueStats.buildings.total} total (${blueStats.buildings.extractors} extractors, ${blueStats.buildings.factories} factories)</span>
        </div>
        <div class="status-line">
            <span class="status-label">Commander:</span>
            <span class="status-value">${blueStats.commander.status} (${blueStats.commander.activity})</span>
        </div>
        
        <h4 style="color: #f44; margin: 10px 0 5px 0;">RED TEAM STATUS</h4>
        <div class="status-line">
            <span class="status-label">Resources:</span>
            <span class="status-value">${Math.floor(resources.red.mass)}M / ${Math.floor(resources.red.energy)}E</span>
        </div>
        <div class="status-line">
            <span class="status-label">Income:</span>
            <span class="status-value">+${resources.red.massIncome || 0}/min M, +${resources.red.energyIncome || 0}/min E</span>
        </div>
        <div class="status-line">
            <span class="status-label">Units:</span>
            <span class="status-value">${redStats.units.total} total (${redStats.units.combat} combat, ${redStats.units.support} support)</span>
        </div>
        <div class="status-line">
            <span class="status-label">Buildings:</span>
            <span class="status-value">${redStats.buildings.total} total (${redStats.buildings.extractors} extractors, ${redStats.buildings.factories} factories)</span>
        </div>
        <div class="status-line">
            <span class="status-label">Commander:</span>
            <span class="status-value">${redStats.commander.status} (${redStats.commander.activity})</span>
        </div>
        
        <h4 style="color: #0ff; margin: 10px 0 5px 0;">BATTLE STATUS</h4>
        <div class="status-line">
            <span class="status-label">Active Combats:</span>
            <span class="status-value">${countActiveCombats(units)}</span>
        </div>
        <div class="status-line">
            <span class="status-label">Total Army Strength:</span>
            <span class="status-value">Blue: ${blueStats.armyStrength} | Red: ${redStats.armyStrength}</span>
        </div>
        <div class="status-line">
            <span class="status-label">Economic Strength:</span>
            <span class="status-value">Blue: ${blueStats.economicStrength} | Red: ${redStats.economicStrength}</span>
        </div>
    `;
    
    statusContent.innerHTML = html;
}

function getTeamStats(team, units, buildings, resources) {
    const teamUnits = units.filter(u => u.team === team);
    const teamBuildings = buildings.filter(b => b.team === team);
    
    const commander = teamUnits.find(u => u.type === UNIT_TYPES.commander);
    
    return {
        units: {
            total: teamUnits.length,
            combat: teamUnits.filter(u => !u.type.support).length,
            support: teamUnits.filter(u => u.type.support).length
        },
        buildings: {
            total: teamBuildings.length,
            extractors: teamBuildings.filter(b => b.type.resourceGeneration).length,
            factories: teamBuildings.filter(b => b.type.produces).length
        },
        commander: {
            status: commander ? `${Math.round(commander.hp/commander.maxHp*100)}% HP` : 'DESTROYED',
            activity: getCommanderActivity(commander)
        },
        armyStrength: calculateArmyStrength(teamUnits),
        economicStrength: calculateEconomicStrength(teamBuildings, resources[team])
    };
}

function getCommanderActivity(commander) {
    if (!commander) return 'N/A';
    if (commander.constructionTask) {
        if (commander.constructionTask.buildingStarted) {
            const progress = Math.round((commander.constructionTask.progress / commander.constructionTask.type.buildTime) * 100);
            return `Building ${commander.constructionTask.type.name} (${progress}%)`;
        } else {
            return `Moving to build ${commander.constructionTask.type.name}`;
        }
    }
    if (commander.target) return 'In Combat';
    if (commander.patrolTarget) return 'Moving';
    return 'Idle';
}

function calculateArmyStrength(units) {
    return units.reduce((strength, unit) => {
        if (!unit.type.support) {
            return strength + (unit.type.damage * unit.type.maxHp / 100);
        }
        return strength;
    }, 0);
}

function calculateEconomicStrength(buildings, resources) {
    const extractorCount = buildings.filter(b => b.type.resourceGeneration).length;
    const factoryCount = buildings.filter(b => b.type.produces).length;
    return Math.floor(extractorCount * 10 + factoryCount * 5 + (resources.mass + resources.energy) / 100);
}

function countActiveCombats(units) {
    return units.filter(u => u.target && u.target.hp > 0).length;
}
