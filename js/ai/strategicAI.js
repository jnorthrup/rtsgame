import { resources } from '../gameState.js';
import { BUILDING_TYPES } // Make sure this is imported if not already from constants
    from '../constants.js';
// Building class is needed to instantiate new buildings.
// It should be imported from entities/Building.js
import { Building } from '../entities/Building.js';
import { addEvent } from '../eventSystem.js';
import { findLandPosition } from '../terrain.js';
import { Caption } from '../entities/Caption.js';

// currentBuildings, currentUnits, currentCaptions are passed as arguments

export function makeStrategicDecisions(currentBuildings, currentUnits, currentCaptions) {
    if (!resources || !currentBuildings || !currentUnits || !currentCaptions) {
        // console.warn("Missing dependencies for makeStrategicDecisions");
        return;
    }

    for (const team of ['blue', 'red']) {
        const teamBuildings = currentBuildings.filter(b => b.team === team);
        const hasAdvancedFactory = teamBuildings.some(b => b.type.name === 'Advanced Land Factory');

        // Decide to build advanced factory
        if (!hasAdvancedFactory && resources[team].mass > 500 && Math.random() < 0.05) { // Reduced probability
            const commander = teamBuildings.find(b => b.type.name === 'Commander');
            if (commander) {
                const pos = findLandPosition(commander.x + (Math.random() - 0.5) * 300,
                                           commander.y + (Math.random() - 0.5) * 300);
                // Ensure BUILDING_TYPES.advancedLandFactory is correctly referenced
                currentBuildings.push(new Building(pos.x, pos.y, team, BUILDING_TYPES.advancedLandFactory));
                const event = addEvent('build',
                    `${team.toUpperCase()} constructs Advanced Factory!`, 2);
                if(event) event.position = { x: pos.x, y: pos.y };
            }
        }

        // Decide on raid groups
        const teamCombatUnits = currentUnits.filter(u => u.team === team && u.type && !u.type.support);
        if (teamCombatUnits.length > 10 && Math.random() < 0.02) { // Reduced probability
            let raidSize = Math.min(5 + Math.floor(Math.random() * 5), Math.floor(teamCombatUnits.length / 2));
            if (raidSize === 0 && teamCombatUnits.length > 0) raidSize = 1;


            if (raidSize > 0) {
                const raiders = teamCombatUnits.slice(0, raidSize);
                const enemyEconomicTargets = currentBuildings.filter(b => b.team !== team && b.type.resourceGeneration);

                if (enemyEconomicTargets.length > 0) {
                    const targetBuilding = enemyEconomicTargets[Math.floor(Math.random() * enemyEconomicTargets.length)];
                    raiders.forEach(unit => {
                        unit.patrolTarget = { x: targetBuilding.x, y: targetBuilding.y };
                        unit.aggressiveness = 0.9;
                    });

                    if (raiders.length > 0) { // Add caption only if raiders exist
                        currentCaptions.push(new Caption(raiders[0].x, raiders[0].y,
                            `Raid group forming!`, '#f80', 12));
                    }
                    const event = addEvent('strategic',
                        `${team.toUpperCase()} launches raid on enemy economy!`, 2);
                    if(event) event.position = { x: targetBuilding.x, y: targetBuilding.y };
                }
            }
        }
    }
}
