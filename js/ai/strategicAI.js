import { BUILDING_TYPES } from '../config/buildingTypes.js';
import { UNIT_TYPES } from '../config/unitTypes.js';
import { findLandPosition } from '../core/terrain.js';
import { Building } from '../core/building.js';
import { Caption } from '../core/caption.js';
// addEvent will be passed via gameContext as gameContext.addEvent,
// as it's defined in game.js and needs gameContext itself.

export function makeStrategicDecisions(gameContext) {
    // gameContext provides access to:
    // gameContext.buildings, gameContext.resources, gameContext.units,
    // gameContext.captions, gameContext.addEvent (which is addEventFromGameJs)
    // gameContext.Building (constructor), gameContext.Caption (constructor)
    // gameContext.findLandPosition (now imported here directly)
    // UNIT_TYPES and BUILDING_TYPES are imported directly in this module.

    for (const team of ['blue', 'red']) {
        const teamBuildings = gameContext.buildings.filter(b => b.team === team);
        const hasAdvanced = teamBuildings.some(b => b.type.name === 'Advanced Land Factory');

        if (!hasAdvanced && gameContext.resources[team].mass > 500 && Math.random() < 0.1) {
            const commanderUnit = gameContext.units.find(u => u.team === team && u.type === UNIT_TYPES.commander);

            if (commanderUnit) {
                const pos = findLandPosition(gameContext, commanderUnit.x + (Math.random() - 0.5) * 300,
                    commanderUnit.y + (Math.random() - 0.5) * 300);
                if (pos) {
                    gameContext.buildings.push(new Building(pos.x, pos.y, team, BUILDING_TYPES.advancedLandFactory));
                    // Use gameContext.addEvent which should point to the addEvent function from game.js
                    const event = gameContext.addEvent(gameContext, 'build',
                        `${team.toUpperCase()} constructs Advanced Factory!`, 2);
                    event.position = { x: pos.x, y: pos.y };
                } else {
                    console.warn(`AI for ${team} could not find a position for Advanced Land Factory near commander.`);
                }
            }
        }

        const teamUnits = gameContext.units.filter(u => u.team === team && !u.type.support);
        if (teamUnits.length > 10 && Math.random() < 0.05) {
            const raidSize = Math.min(5 + Math.floor(Math.random() * 5), teamUnits.length / 2);
            const raiders = teamUnits.slice(0, raidSize);
            const enemyTargets = gameContext.buildings.filter(b => b.team !== team && b.type.resourceGeneration);

            if (enemyTargets.length > 0) {
                const target = enemyTargets[Math.floor(Math.random() * enemyTargets.length)];
                raiders.forEach(unit => {
                    unit.patrolTarget = { x: target.x, y: target.y };
                    unit.aggressiveness = 0.9;
                });

                if (raiders.length > 0) {
                    gameContext.captions.push(new Caption(raiders[0].x, raiders[0].y,
                        `Raid group forming!`, '#f80', 12));
                    // Use gameContext.addEvent
                    const event = gameContext.addEvent(gameContext, 'strategic',
                        `${team.toUpperCase()} launches raid on enemy economy!`, 2);
                    event.position = { x: target.x, y: target.y };
                }
            }
        }
    }
}

export function coordinateAttacks(gameContext) {
    // gameContext provides access to:
    // gameContext.units, gameContext.buildings, gameContext.captions
    // gameContext.Caption (constructor)
    // UNIT_TYPES and BUILDING_TYPES are imported directly.

    for (const team of ['blue', 'red']) {
        const teamUnits = gameContext.units.filter(u => u.team === team && !u.type.support);
        const processed = new Set();

        for (const unit of teamUnits) {
            if (processed.has(unit)) continue;

            const nearby = teamUnits.filter(u =>
                !processed.has(u) &&
                unit.getDistance(u) < 150 // getDistance is a Unit method
            );

            if (nearby.length >= 3) {
                const group = [unit, ...nearby];
                group.forEach(u => processed.add(u));

                const enemies = [...gameContext.units.filter(u => u.team !== team),
                               ...gameContext.buildings.filter(b => b.team !== team)];

                if (enemies.length > 0) {
                    const centerX = group.reduce((sum, u) => sum + u.x, 0) / group.length;
                    const centerY = group.reduce((sum, u) => sum + u.y, 0) / group.length;
                    let bestTarget = null;
                    let bestScore = -Infinity;

                    for (const enemy of enemies) {
                        const dist = Math.sqrt((enemy.x - centerX) ** 2 + (enemy.y - centerY) ** 2);
                        let score = 1000 / (dist + 100);

                        if (enemy.type) {
                            if (enemy.type === UNIT_TYPES.commander || enemy.type === BUILDING_TYPES.commander) score *= 3;
                            else if (enemy.type.tier >= 2) score *= 2;
                            else if (enemy.type.resourceGeneration) score *= 1.5;
                        }

                        if (score > bestScore) {
                            bestScore = score;
                            bestTarget = enemy;
                        }
                    }

                    if (bestTarget) {
                        group.forEach(u => {
                            u.target = bestTarget;
                            u.lastTargetSwitch = Date.now();
                        });
                        gameContext.captions.push(new Caption(centerX, centerY,
                            `Coordinated strike!`, '#ff0', 14));
                    }
                }
            }
        }
    }
}
