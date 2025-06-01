import { UNIT_TYPES } from '../config/unitTypes.js';
import { BUILDING_TYPES } from '../config/buildingTypes.js';
import { WORLD_SIZE, TILE_SIZE, GRID_SIZE, TERRAIN_TYPES, MIN_LAND_PERCENTAGE, MAX_TERRAIN_RETRIES } from '../config/gameConstants.js';
import { Unit } from './unit.js';
import { Building } from './building.js';
import { Effect } from './effect.js';
import { Caption } from './caption.js';
import { generateTerrain, findLandPosition, findWaterPosition } from './terrain.js';
import { makeStrategicDecisions, coordinateAttacks } from '../ai/strategicAI.js';
import { render } from '../rendering/renderer.js'; // Import render function

// Functions will be moved here.

export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function addEvent(gameContext, type, message, importance = 1) {
    const event = {
        type: type,
        message: message,
        time: gameContext.gameState.gameTime,
        importance: importance
    };

    gameContext.gameState.events.unshift(event);
    if (gameContext.gameState.events.length > 10) {
        gameContext.gameState.events.pop();
    }

    // Update event log (DOM interaction - consider moving to a UI module later)
    const eventLog = document.getElementById('events');
    if (eventLog) {
        const eventDiv = document.createElement('div');
        eventDiv.className = `event event-${type}`;
        eventDiv.textContent = `[${formatTime(gameContext.gameState.gameTime)}] ${message}`;
        eventLog.insertBefore(eventDiv, eventLog.firstChild);

        if (eventLog.children.length > 10) {
            eventLog.removeChild(eventLog.lastChild);
        }
    } else {
        console.warn("'events' DOM element not found. Skipping event log update.");
    }


    // Set camera target for important events
    if (importance >= 2 && gameContext.camera.autoCamera && event.position) {
        gameContext.camera.cameraTarget = event.position;
        gameContext.camera.cameraTimer = 180; // 3 seconds
    }

    // Return event for position tracking (if needed by caller)
    return event;
}

// Helper for initGame - not exported as it's only used by initGame
function placeFactoriesAroundCommander(gameContext, commanderPos, team) {
    const offset = 150; // Preferred distance from commander for factories
    const factoryAreaSize = 3; // Factories need a 3x3 clear land area
    let landPos, airPos, navalPos, energyPos1;

    // Land factory
    // findLandPosition is imported, ensure it's called correctly (gameContext is the first param)
    landPos = findLandPosition(gameContext, commanderPos.x + offset, commanderPos.y, factoryAreaSize);
    if (!landPos) landPos = findLandPosition(gameContext, commanderPos.x - offset, commanderPos.y, factoryAreaSize);
    if (!landPos) {
        console.warn(`Could not find ideal spot for Land Factory for ${team}, placing at fallback.`);
        landPos = { x: commanderPos.x + offset, y: commanderPos.y };
    }
    gameContext.buildings.push(new Building(landPos.x, landPos.y, team, BUILDING_TYPES.landFactory));

    // Air factory
    airPos = findLandPosition(gameContext, commanderPos.x - offset, commanderPos.y - offset, factoryAreaSize);
    if (!airPos) airPos = findLandPosition(gameContext, commanderPos.x + offset, commanderPos.y + offset, factoryAreaSize);
    if (!airPos) {
        console.warn(`Could not find ideal spot for Air Factory for ${team}, placing at fallback.`);
        airPos = { x: commanderPos.x - offset, y: commanderPos.y - offset };
    }
    gameContext.buildings.push(new Building(airPos.x, airPos.y, team, BUILDING_TYPES.airFactory));

    // Naval factory (if water nearby)
    // findWaterPosition is imported
    navalPos = findWaterPosition(gameContext, commanderPos.x, commanderPos.y + offset * 1.5);
    if (navalPos && navalPos.x !== undefined && navalPos.y !== undefined) {
         const distToCommander = Math.sqrt((navalPos.x - commanderPos.x) ** 2 + (navalPos.y - commanderPos.y) ** 2);
         if (distToCommander < 700) {
            gameContext.buildings.push(new Building(navalPos.x, navalPos.y, team, BUILDING_TYPES.navalFactory));
         } else {
            console.log(`Naval factory position for ${team} was too far from commander (${distToCommander.toFixed(0)} units), skipping.`);
         }
    } else {
        console.log(`No suitable water position found for Naval factory for ${team}.`);
    }

    // Energy plants
    energyPos1 = findLandPosition(gameContext, commanderPos.x, commanderPos.y - offset, factoryAreaSize);
    if (!energyPos1) {
        console.warn(`Could not find ideal spot for Energy Plant for ${team}, placing at fallback.`);
        energyPos1 = { x: commanderPos.x, y: commanderPos.y - offset};
    }
    gameContext.buildings.push(new Building(energyPos1.x, energyPos1.y, team, BUILDING_TYPES.energyExtractor));
}


export function initGame(gameContext) {
    gameContext.units.length = 0;
    gameContext.buildings.length = 0;
    gameContext.effects.length = 0;
    gameContext.captions.length = 0;
    gameContext.gameState.winner = null;
    gameContext.gameState.gameTime = 0;
    gameContext.gameState.events = [];

    // Reset resources
    gameContext.resources.blue = { mass: 1000, energy: 1000, massIncome: 0, energyIncome: 0 };
    gameContext.resources.red = { mass: 1000, energy: 1000, massIncome: 0, energyIncome: 0 };

    let blueStart = null;
    let redStart = null;
    const MAX_INIT_RETRIES = 10; // Max retries for finding start positions
    const COMMANDER_START_AREA_SIZE = 5; // Commanders need a 5x5 clear land area

    console.log("Initializing game, attempting to generate terrain and find starting positions...");

    for (let i = 0; i < MAX_INIT_RETRIES; i++) {
        console.log(`Attempt ${i + 1}/${MAX_INIT_RETRIES} to generate terrain and find start spots.`);
        // generateTerrain is now imported and expects gameContext
        generateTerrain(gameContext);

        // findLandPosition is now imported (gameContext is first param)
        blueStart = findLandPosition(gameContext, WORLD_SIZE * 0.2, WORLD_SIZE * 0.5, COMMANDER_START_AREA_SIZE);
        redStart = findLandPosition(gameContext, WORLD_SIZE * 0.8, WORLD_SIZE * 0.5, COMMANDER_START_AREA_SIZE);

        if (blueStart && redStart) {
            console.log(`Successfully found starting positions for both teams after ${i + 1} attempt(s).`);
            break;
        } else {
            console.warn(`Could not find suitable ${COMMANDER_START_AREA_SIZE}x${COMMANDER_START_AREA_SIZE} starting areas. Blue found: ${!!blueStart}, Red found: ${!!redStart}. Regenerating terrain...`);
        }
    }

    if (!blueStart) {
        console.error(`CRITICAL: Failed to find suitable starting position for BLUE team after ${MAX_INIT_RETRIES} attempts. Placing at default fallback.`);
        blueStart = { x: WORLD_SIZE * 0.2, y: WORLD_SIZE * 0.5 }; // Fallback
    }
    if (!redStart) {
        console.error(`CRITICAL: Failed to find suitable starting position for RED team after ${MAX_INIT_RETRIES} attempts. Placing at default fallback.`);
        redStart = { x: WORLD_SIZE * 0.8, y: WORLD_SIZE * 0.5 }; // Fallback
    }

    // Spawn ACU units
    if (UNIT_TYPES.commander) { // UNIT_TYPES is directly imported at the top of game.js
        gameContext.units.push(new Unit(blueStart.x, blueStart.y, 'blue', UNIT_TYPES.commander));
        gameContext.units.push(new Unit(redStart.x, redStart.y, 'red', UNIT_TYPES.commander));
        addEvent(gameContext, 'strategic', 'Commanders deployed!', 3);
    } else {
        console.error("UNIT_TYPES.commander is not defined! Cannot spawn ACUs.");
    }

    // Comment out old commander building spawning (already done)
    // gameContext.buildings.push(new Building(blueStart.x, blueStart.y, 'blue', BUILDING_TYPES.commander));
    // gameContext.buildings.push(new Building(redStart.x, redStart.y, 'red', BUILDING_TYPES.commander));

    // Comment out initial factory placement - this was for the old system
    // console.log("Placing initial factories...");
    // placeFactoriesAroundCommander(gameContext, blueStart, 'blue'); // Call the local helper
    // placeFactoriesAroundCommander(gameContext, redStart, 'red');   // Call the local helper

    // Comment out initial engineer spawning (already done)
    // gameContext.units.push(new Unit(blueStart.x + 50, blueStart.y, 'blue', UNIT_TYPES.engineer));
    // ... and so on for other engineers

    // Center camera
    gameContext.camera.x = WORLD_SIZE / 2;
    gameContext.camera.y = WORLD_SIZE / 2;
    gameContext.camera.zoom = 0.5;

    addEvent(gameContext, 'strategic', 'Battle commenced!', 3);
}

// AI and Strategic Functions (typically called by update)
// Not exported by default as they are internal to the game logic loop (update).
function makeStrategicDecisions(gameContext) {
    // Check if teams should build advanced factories
    for (const team of ['blue', 'red']) {
        const teamBuildings = gameContext.buildings.filter(b => b.team === team);
        const hasAdvanced = teamBuildings.some(b => b.type.name === 'Advanced Land Factory');

        if (!hasAdvanced && gameContext.resources[team].mass > 500 && Math.random() < 0.1) {
            // BUILDING_TYPES.commander is no longer a thing, ACU is a unit.
            // Need to find the ACU unit for the team instead.
            const commanderUnit = gameContext.units.find(u => u.team === team && u.type === UNIT_TYPES.commander);

            if (commanderUnit) {
                const pos = findLandPosition(gameContext, commanderUnit.x + (Math.random() - 0.5) * 300,
                                           commanderUnit.y + (Math.random() - 0.5) * 300);
                if (pos) { // Ensure a position was found
                    gameContext.buildings.push(new Building(pos.x, pos.y, team, BUILDING_TYPES.advancedLandFactory));
                    const event = addEvent(gameContext, 'build',
                        `${team.toUpperCase()} constructs Advanced Factory!`, 2);
                    event.position = { x: pos.x, y: pos.y };
                } else {
                    console.warn(`AI for ${team} could not find a position for Advanced Land Factory near commander.`);
                }
            }
        }

        // Decide on raid groups
        const teamUnits = gameContext.units.filter(u => u.team === team && !u.type.support);
        if (teamUnits.length > 10 && Math.random() < 0.05) {
            // Form raid group
            const raidSize = Math.min(5 + Math.floor(Math.random() * 5), teamUnits.length / 2);
            const raiders = teamUnits.slice(0, raidSize);
            const enemyTargets = gameContext.buildings.filter(b => b.team !== team && b.type.resourceGeneration);

            if (enemyTargets.length > 0) {
                const target = enemyTargets[Math.floor(Math.random() * enemyTargets.length)];
                raiders.forEach(unit => {
                    unit.patrolTarget = { x: target.x, y: target.y };
                    unit.aggressiveness = 0.9;
                });

                if (raiders.length > 0) { // Ensure there are raiders before trying to access raiders[0]
                    gameContext.captions.push(new Caption(raiders[0].x, raiders[0].y,
                        `Raid group forming!`, '#f80', 12));

                    const event = addEvent(gameContext, 'strategic',
                        `${team.toUpperCase()} launches raid on enemy economy!`, 2);
                    event.position = { x: target.x, y: target.y };
                }
            }
        }
    }
}

function coordinateAttacks(gameContext) {
    // Group nearby units for coordinated attacks
    for (const team of ['blue', 'red']) {
        const teamUnits = gameContext.units.filter(u => u.team === team && !u.type.support);

        // Find clusters of units
        const processed = new Set();

        for (const unit of teamUnits) {
            if (processed.has(unit)) continue;

            const nearby = teamUnits.filter(u =>
                !processed.has(u) &&
                unit.getDistance(u) < 150 // getDistance is a Unit method
            );

            if (nearby.length >= 3) {
                // Coordinate this group
                const group = [unit, ...nearby];
                group.forEach(u => processed.add(u));

                // Find best target for group
                const enemies = [...gameContext.units.filter(u => u.team !== team),
                               ...gameContext.buildings.filter(b => b.team !== team)];

                if (enemies.length > 0) {
                    // Calculate group center
                    const centerX = group.reduce((sum, u) => sum + u.x, 0) / group.length;
                    const centerY = group.reduce((sum, u) => sum + u.y, 0) / group.length;

                    // Find high-value target
                    let bestTarget = null;
                    let bestScore = -Infinity;

                    for (const enemy of enemies) {
                        const dist = Math.sqrt((enemy.x - centerX) ** 2 + (enemy.y - centerY) ** 2);
                        let score = 1000 / (dist + 100);

                        if (enemy.type) { // Could be a unit or a building
                            if (enemy.type === UNIT_TYPES.commander || enemy.type === BUILDING_TYPES.commander) score *= 3; // Commander is high priority
                            else if (enemy.type.tier >= 2) score *= 2; // tier is likely a unit property
                            else if (enemy.type.resourceGeneration) score *= 1.5; // resourceGeneration is a building property
                        }

                        if (score > bestScore) {
                            bestScore = score;
                            bestTarget = enemy;
                        }
                    }

                    if (bestTarget) {
                        // Assign target to group
                        group.forEach(u => {
                            u.target = bestTarget;
                            u.lastTargetSwitch = Date.now(); // Assumes Unit has lastTargetSwitch
                        });

                        // Group attack caption
                        gameContext.captions.push(new Caption(centerX, centerY,
                            `Coordinated strike!`, '#ff0', 14));
                    }
                }
            }
        }
    }
}


export function update(gameContext) {
    if (gameContext.gameState.paused || gameContext.gameState.winner) return;

    gameContext.gameState.gameTime += 1 / 60; // Assuming 60 FPS

    // Update auto camera
    if (gameContext.camera.autoCamera && gameContext.camera.cameraTarget && gameContext.camera.cameraTimer > 0) {
        const dx = gameContext.camera.cameraTarget.x - gameContext.camera.x;
        const dy = gameContext.camera.cameraTarget.y - gameContext.camera.y;
        gameContext.camera.x += dx * 0.1;
        gameContext.camera.y += dy * 0.1;
        gameContext.camera.cameraTimer--;

        if (gameContext.camera.cameraTimer <= 0) {
            gameContext.camera.cameraTarget = null;
        }
    }

    // Random event focus
    if (gameContext.camera.autoCamera && !gameContext.camera.cameraTarget && Math.random() < 0.005) {
        const targets = [...gameContext.units.filter(u => u.target), ...gameContext.buildings];
        if (targets.length > 0) {
            const target = targets[Math.floor(Math.random() * targets.length)];
            gameContext.camera.cameraTarget = { x: target.x, y: target.y };
            gameContext.camera.cameraTimer = 180;
        }
    }

    // Update units
    // The Unit.update method expects (units, buildings)
    // These are available directly in gameContext.
    for (let i = gameContext.units.length - 1; i >= 0; i--) {
        const unit = gameContext.units[i];
        unit.update(gameContext.units, gameContext.buildings, gameContext); // Pass gameContext for globals like TILE_SIZE, TERRAIN_TYPES etc.

        if (unit.hp <= 0) {
            if (unit.type === UNIT_TYPES.commander) { // UNIT_TYPES imported
                gameContext.gameState.winner = unit.team === 'blue' ? 'RED' : 'BLUE';
                gameContext.captions.push(new Caption(unit.x, unit.y, `${unit.team.toUpperCase()} COMMANDER DESTROYED!`, '#ff0', 20)); // Caption imported
                const event = addEvent(gameContext, 'strategic', `${gameContext.gameState.winner} achieves victory! ${unit.team.toUpperCase()} ACU eliminated.`, 3);
                event.position = { x: unit.x, y: unit.y };
            } else if (unit.type.tier >= 2) {
                const event = addEvent(gameContext, 'battle', `${unit.team.toUpperCase()} ${unit.type.name} destroyed!`, 2);
                event.position = { x: unit.x, y: unit.y };
            }

            gameContext.units.splice(i, 1);
            if (unit === gameContext.gameState.selectedUnit) {
                gameContext.gameState.selectedUnit = null;
                gameContext.gameState.fpvMode = false;
            }
        }
    }

    // Update buildings
    // The Building.update method expects (units, mainGameGlobals)
    // gameContext should contain mainGameGlobals.
    for (let i = gameContext.buildings.length - 1; i >= 0; i--) {
        const building = gameContext.buildings[i];
        // Assuming mainGameGlobals is part of gameContext, as set up in main.js
        building.update(gameContext.units, gameContext.mainGameGlobals);

        if (building.hp <= 0) {
            // BUILDING_TYPES.commander check might be legacy if commanders are only units now.
            // However, if there's a scenario where a building can be a commander type:
            if (building.type === BUILDING_TYPES.commander) { // BUILDING_TYPES imported
                gameContext.gameState.winner = building.team === 'blue' ? 'RED' : 'BLUE';
                gameContext.captions.push(new Caption(building.x, building.y, 'COMMANDER DESTROYED!', '#ff0', 20));
                const event = addEvent(gameContext, 'strategic', `${gameContext.gameState.winner} achieves victory!`, 3);
                event.position = { x: building.x, y: building.y };
            } else if (building.type.produces || building.type.resourceGeneration) {
                gameContext.captions.push(new Caption(building.x, building.y, 'Structure lost!', '#f88', 12));
                const event = addEvent(gameContext, 'battle', `${building.team.toUpperCase()} ${building.type.name} destroyed!`, 2);
                event.position = { x: building.x, y: building.y };
            }
            gameContext.buildings.splice(i, 1);
        }
    }

    // Update effects
    for (let i = gameContext.effects.length - 1; i >= 0; i--) {
        const effect = gameContext.effects[i];
        effect.update(); // Effect.update is self-contained
        if (effect.life <= 0 && effect.particles.every(p => p.life <= 0)) {
            gameContext.effects.splice(i, 1);
        }
    }

    // Update captions
    for (let i = gameContext.captions.length - 1; i >= 0; i--) {
        const caption = gameContext.captions[i];
        caption.update(); // Caption.update is self-contained
        if (caption.life <= 0) {
            gameContext.captions.splice(i, 1);
        }
    }

    // Strategic AI decisions
    makeStrategicDecisions(gameContext);

    // Coordinate group attacks
    coordinateAttacks(gameContext);

    // Update camera for FPV mode
    if (gameContext.gameState.fpvMode && gameContext.gameState.selectedUnit) {
        gameContext.camera.x = gameContext.gameState.selectedUnit.x;
        gameContext.camera.y = gameContext.gameState.selectedUnit.y;
        gameContext.camera.zoom = 10; // Example zoom level for FPV
// Main Game Loop function
// timestamp is from requestAnimationFrame
// gameRenderer is currently unused, render is called directly. Will be used when render moves to its own module.
export function gameLoop(timestamp, gameContext, gameRenderer) { // gameRenderer param is currently unused
    // Calculate FPS (DOM interaction - consider moving to a UI module later)
    if (!gameContext.lastFpsTime) gameContext.lastFpsTime = 0;
    if (!gameContext.frameCount) gameContext.frameCount = 0;

    gameContext.frameCount++;
    if (timestamp - gameContext.lastFpsTime >= 1000) {
        const fpsDisplay = document.getElementById('fps');
        if (fpsDisplay) {
            fpsDisplay.textContent = gameContext.frameCount;
        }
        gameContext.frameCount = 0;
        gameContext.lastFpsTime = timestamp;
    }

    update(gameContext); // update is local to this file
    render(gameContext); // render is now imported
}
