// js_rewritten/core/simulation.js

// ####################################################################################################
// # CONCEPTUAL REDUX/COMMAND PATTERN REFACTOR NOTES:                                                 #
// # This file outlines how the simulation could be refactored to use a Redux-like command pattern.   #
// # Due to complexity, the actual implementation of reducers and full immutability is not completed. #
// # Comments below indicate where and how such changes would be applied.                             #
// ####################################################################################################

/**
 * Central Simulation Codec for the RTS Game
 * Rewritten from first principles to enhance modularity, clarity, and efficiency.
 * Manages game state, entity updates, resource management, and core game logic with a focus on systematic design.
 */

import { UNIT_TYPES } from '../../js/config/unitTypes.js';
import { BUILDING_TYPES } from '../../js/config/buildingTypes.js';
import { WORLD_SIZE, TILE_SIZE, GRID_SIZE, TERRAIN_TYPES, MIN_LAND_PERCENTAGE, MAX_TERRAIN_RETRIES } from '../../js/config/gameConstants.js'; // Added constants
import { SIMULATION_CONFIG } from '../../js/config/simulationConfig.js';
import { Unit } from '../../js/core/unit.js'; // Added
import { Building } from '../../js/core/building.js'; // Added
// import { Effect } from '../../js/core/effect.js'; // Effects are created by units/buildings and managed by EntityManager
// import { Caption } from '../../js/core/caption.js'; // Captions are created by events and managed by EntityManager
// import { GrenadeProjectile } from '../../js/core/projectile.js'; // Projectiles are created by units and managed by EntityManager
import { findLandPosition, findWaterPosition } from '../../js/core/terrain.js'; // Added
import { generateTerrain } from '../../js/core/terrainManager.js'; // Added
import { makeStrategicDecisions, coordinateAttacks } from '../../js/ai/strategicAI.js'; // Added AI imports
// import battleJournal from '../../js/ai/battleJournal.js'; // Battle journal integration will be reviewed and potentially handled via gameContext

// Game State Management
export class GameState {
    constructor() {
        this.gameTime = 0;
        this.paused = false;
        this.winner = null;
        this.events = [];
        this.fpvMode = false; // First Person View mode
        this.resources = {
            blue: {
                mass: SIMULATION_CONFIG.INITIAL_BLUE_MASS,
                energy: SIMULATION_CONFIG.INITIAL_BLUE_ENERGY,
                massIncome: 0,
                energyIncome: 0
            },
            red: {
                mass: SIMULATION_CONFIG.INITIAL_RED_MASS,
                energy: SIMULATION_CONFIG.INITIAL_RED_ENERGY,
                massIncome: 0,
                energyIncome: 0
            }
        };
    }

    update(deltaTime) {
        // OLD WAY: Direct mutation.
        // if (!this.paused && !this.winner) {
        //     this.gameTime += deltaTime;
        // }
        // NEW WAY (Conceptual): This would be handled by a reducer processing an UPDATE_GAME_TIME command.
        // Example reducer in Simulation.dispatchCommand or a dedicated gameStateReducer:
        // case GameCommandTypes.UPDATE_GAME_TIME:
        //   if (!state.gameState.paused && !state.gameState.winner) {
        //     return { ...state, gameState: { ...state.gameState, gameTime: state.gameState.gameTime + action.payload.deltaTime } };
        //   }
        //   return state;
        // The game loop would dispatch: this.dispatchCommand({ type: GameCommandTypes.UPDATE_GAME_TIME, payload: { deltaTime } });
        // For this refactor step, we'll assume direct mutation still occurs for gameTime for simplicity,
        // as it's a simple property. More complex state (arrays, objects) is the primary target for reducers.
        if (!this.paused && !this.winner) {
             this.gameTime += deltaTime;
        }
    }

    addEvent(type, message, importance = 1, position = null) {
        // This method itself is fine for creating event objects.
        // In a Redux pattern, instead of directly pushing to this.events,
        // it might dispatch an ADD_EVENT command, and a reducer would handle adding it immutably.
        // For now, direct mutation is kept for simplicity of this step.
        const event = {
            type,
            message,
            time: this.gameTime,
            importance,
            position // Optional: screen position for UI focus or other purposes
        };
        this.events.unshift(event);
        if (this.events.length > 10) {
            this.events.pop();
        }
        return event;
    }

    updateResources(team, massDelta, energyDelta) {
        if (this.resources[team]) {
            this.resources[team].mass += massDelta;
            this.resources[team].energy += energyDelta;
        }
    }
}

// Entity Management
export class EntityManager {
    constructor() {
        this.units = [];
        this.buildings = [];
        this.effects = [];
        this.captions = [];
        this.projectiles = [];
    }

    update(deltaTime, gameState, gameContext /*This gameContext is the Simulation instance */) {
        // OLD WAY: Direct mutation and imperative updates.
        // for (let i = this.units.length - 1; i >= 0; i--) { ... unit.update(); this.units.splice(i,1) ... }
        // ... and so on for buildings, effects, projectiles, captions.

        // NEW WAY (Conceptual):
        // This entire method would be replaced by reducers handling specific commands.
        // The main game loop (Simulation.gameLoop) would dispatch a command like:
        // simulation.dispatchCommand({ 
        //   type: GameCommandTypes.PROCESS_ENTITY_UPDATES, 
        //   payload: { deltaTime, seedRandom: gameContext.seedRandom, /* other context if needed by reducers */ } 
        // });
        //
        // A top-level entityReducer would then:
        // 1. Call a unitUpdaterReducer:
        //    - Takes current `units` array, `deltaTime`, `seedRandom`, `gameState` (for targeting, etc.).
        //    - Iterates through units. For each unit, it calls pure functions (derived from `unit.update()` logic)
        //      that determine the unit's next state (new position, new HP if damaged, new target, etc.).
        //    - These functions would return a *new* unit object if changed, or the original if not.
        //    - `vec3` and `mat4` operations from `gl-matrix` would be used here for position updates.
        //    - Returns a *new* array of units: `newUnits = state.units.map(u => calculateNewUnitState(u, ...)).filter(u => u.hp > 0);`
        //    - Events for unit destruction, commander death (winner determination) would be generated as data by these pure functions
        //      and then dispatched as new commands or handled by subsequent reducers in the same cycle.
        //
        // 2. Call a buildingUpdaterReducer (similar logic for buildings, handling production, damage).
        //    - Production queue changes would be commands like `BUILDING_PRODUCTION_QUEUE_ADD`.
        //    - Unit creation from factories would dispatch `CREATE_UNIT` commands.
        //
        // 3. Call effectUpdaterReducer, projectileUpdaterReducer, captionUpdaterReducer:
        //    - These would filter out expired entities immutably: `newEffects = state.effects.filter(e => e.life > 0);`
        //
        // 4. Resource updates (income from buildings) would be handled by a resourceReducer
        //    triggered by an `UPDATE_RESOURCES_FROM_BUILDINGS` command or similar, or calculated during building updates.
        //    `gameState.updateResources` would be replaced by this reducer logic.

        // FOR THIS REFACTOR STEP: We are only adding comments. Direct mutation below remains for now.
        // --- START OF EXISTING CODE (to be refactored later) ---
        for (let i = this.units.length - 1; i >= 0; i--) {
            const unit = this.units[i];
            unit.update(gameContext, deltaTime); // gameContext is Simulation instance
            if (unit.hp <= 0) {
                if (unit.type === UNIT_TYPES.commander) {
                    gameState.winner = unit.team === 'blue' ? 'RED' : 'BLUE';
                    // In new system, this might dispatch a SET_WINNER command.
                    // Events are added to gameState, which is fine for now.
                    gameState.addEvent('strategic', `${gameState.winner} achieves victory! ${unit.team.toUpperCase()} Commander eliminated.`, 3, { x: unit.x, y: unit.y });
                } else if (unit.type.tier >= 2) {
                    gameState.addEvent('battle', `${unit.team.toUpperCase()} ${unit.type.name} destroyed!`, 2, { x: unit.x, y: unit.y });
                }
                this.units.splice(i, 1); // MUTATION: Replace with filter for immutability
            }
        }

        for (let i = this.buildings.length - 1; i >= 0; i--) {
            const building = this.buildings[i];
            building.update(gameContext, deltaTime); // gameContext is Simulation instance
            if (building.hp <= 0) {
                if (building.type.produces || building.type.resourceGeneration) {
                    gameState.addEvent('battle', `${building.team.toUpperCase()} ${building.type.name} destroyed!`, 2, { x: building.x, y: building.y });
                }
                this.buildings.splice(i, 1); // MUTATION: Replace with filter
            }
            if (building.type.resourceGeneration) {
                // This direct update to gameState.resources should be via a command/reducer.
                gameState.updateResources(building.team, building.type.resourceGeneration.mass || 0, building.type.resourceGeneration.energy || 0);
            }
        }

        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.update(deltaTime); // Effects update their own life based on deltaTime
            if (effect.life <= 0 && (!effect.particles || effect.particles.every(p => p.life <= 0))) {
                this.effects.splice(i, 1); // MUTATION: Replace with filter
            }
        }

        for (let i = this.captions.length - 1; i >= 0; i--) {
            const caption = this.captions[i];
            caption.update(deltaTime); // Captions update their own life
            if (caption.life <= 0) {
                this.captions.splice(i, 1); // MUTATION: Replace with filter
            }
        }

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update(gameContext, deltaTime); // gameContext is Simulation instance
            if (projectile.isExpired) {
                this.projectiles.splice(i, 1); // MUTATION: Replace with filter
            }
        }
        // --- END OF EXISTING CODE ---
    }

    // Entity creation methods would be replaced by dispatching CREATE_* commands.
    // Reducers for these commands would handle adding entities to the state immutably.
    // e.g., case GameCommandTypes.CREATE_UNIT: 
    //          return { ...state, entityManager: { ...state.entityManager, units: [...state.entityManager.units, action.payload.newUnitData] } };
    addUnit(unit) {
        this.units.push(unit);
    }

    addBuilding(building) {
        this.buildings.push(building);
    }

    addEffect(effect) {
        this.effects.push(effect);
    }

    addCaption(caption) {
        this.captions.push(caption);
    }

    addProjectile(projectile) {
        this.projectiles.push(projectile);
    }
}

// Core Simulation Logic
export class Simulation {
    constructor(gameContext = {}) { // gameContext can be used to pass external systems if needed (e.g. battleJournal, seededRNG)
        this.gameState = new GameState();
        this.entityManager = new EntityManager();
        // Store context. Critical systems like seedRandom, battleJournal, or global configs should be passed here.
        this.gameContext = gameContext; 
        this.lastUpdateTime = null;

        // Ensure essential parts of gameContext are present, e.g., seedRandom for terrain generation.
        // This is a temporary measure; ideally, dependencies are more explicitly managed.
        if (!this.gameContext.seedRandom && gameContext.seedRandom) {
            this.gameContext.seedRandom = gameContext.seedRandom;
        } else if (!this.gameContext.seedRandom) {
            // Fallback if no seeded RNG is provided, though this makes deterministic simulation impossible.
            console.warn("No seedRandom found in gameContext. Terrain generation might be non-deterministic if it relies on it.");
            // Provide a default non-seeded RNG if needed by some functions, or ensure those functions handle its absence.
            // this.gameContext.seedRandom = { init: () => {}, random: Math.random }; 
        }
        if (!this.gameContext.GAME_SEED && gameContext.GAME_SEED) {
            this.gameContext.GAME_SEED = gameContext.GAME_SEED;
        }
         if (this.gameContext.HEADLESS_MODE === undefined && gameContext.HEADLESS_MODE !== undefined) {
            this.gameContext.HEADLESS_MODE = gameContext.HEADLESS_MODE;
        }
        // Expose frequently accessed context items directly on the simulation instance
        this.seedRandom = this.gameContext.seedRandom; 
        // Initialize terrain on both this.gameContext.terrain (for functions expecting it there)
        // and this.terrain (for direct access from Simulation instance if needed elsewhere, and for clarity).
        // Ensure this.gameContext.terrain is defined before generateTerrain and other functions use it.
        if (!this.gameContext.terrain) {
            this.gameContext.terrain = {};
        }
        this.terrain = this.gameContext.terrain;
    }

    init() {
        // 0. Initialize Seeded RNG. Use the direct reference this.seedRandom.
        if (this.seedRandom && this.gameContext.GAME_SEED) { // Check this.seedRandom
            this.seedRandom.init(this.gameContext.GAME_SEED); // Use this.seedRandom
            console.log(`Simulation initialized with seed: ${this.gameContext.GAME_SEED}`);
        } else {
            console.warn("SeedRNG or GAME_SEED not provided. Game might be non-deterministic.");
        }

        // TODO: Battle Journal Integration - Review how to handle this.
        // Example from old code:
        // if (this.gameContext.RECORD_AI_DECISIONS && this.gameContext.battleJournal) {
        //     this.gameContext.battleJournal.startRecording(this.gameContext.GAME_SEED, this.gameContext.RECORD_AI_DECISIONS_DURATION_SECONDS);
        //     console.log(`Battle Journal recording started for ${this.gameContext.RECORD_AI_DECISIONS_DURATION_SECONDS} seconds.`);
        // }

        // 1. Reset game state and entities
        this.gameState.gameTime = 0;
        this.gameState.paused = false;
        this.gameState.winner = null;
        this.entityManager.units.length = 0; // Clear entities
        this.entityManager.buildings.length = 0;
        this.entityManager.effects.length = 0;
        this.entityManager.captions.length = 0;
        this.entityManager.projectiles.length = 0;
        this.gameState.events = []; // Clear past events

        // UI-specific state like selection should be handled by the UI layer, not here.
        // e.g., this.gameContext.selectionManager.clearSelection(); 

        // 2. Reset resources
        this.gameState.resources.blue = {
            mass: SIMULATION_CONFIG.INITIAL_BLUE_MASS,
            energy: SIMULATION_CONFIG.INITIAL_BLUE_ENERGY,
            massIncome: 0, energyIncome: 0
        };
        this.gameState.resources.red = {
            mass: SIMULATION_CONFIG.INITIAL_RED_MASS,
            energy: SIMULATION_CONFIG.INITIAL_RED_ENERGY,
            massIncome: 0, energyIncome: 0
        };

        // 3. Terrain Generation and Start Position Finding
        // this.terrain (and this.gameContext.terrain) is already initialized in the constructor.
        // generateTerrain will populate it.
        
        let blueStart = null;
        let redStart = null;
        const MAX_INIT_RETRIES = 10; 
        const FOCUSED_PLACEMENT_RETRIES = 5;
        const COMMANDER_START_AREA_SIZE = 5;

        console.log("Simulation: Attempting to generate terrain and find starting positions...");

        // Helper to print terrain map (for debugging, can be removed or made conditional based on HEADLESS_MODE)
        const printTerrainMap = (terrainGrid, isHeadless) => {
            // Use this.terrain which is populated by generateTerrain via this.gameContext.terrain
            if (isHeadless || !terrainGrid || Object.keys(terrainGrid).length === 0) return; 
            console.log("--- TERRAIN MAP PREVIEW (L=Land, W=Water, M=Mountain) ---");
            for (let y = 0; y < GRID_SIZE; y += Math.max(1, Math.floor(GRID_SIZE/32)) ) { 
                let row = "";
                for (let x = 0; x < GRID_SIZE; x += Math.max(1, Math.floor(GRID_SIZE/32)) ) {
                    const tile = terrainGrid[x] && terrainGrid[x][y] !== undefined ? terrainGrid[x][y] : TERRAIN_TYPES.UNKNOWN;
                    if (tile === TERRAIN_TYPES.LAND) row += "L";
                    else if (tile === TERRAIN_TYPES.WATER) row += "W";
                    else if (tile === TERRAIN_TYPES.MOUNTAIN) row += "M";
                    else row += "?";
                }
                console.log(row);
            }
            console.log("--- END TERRAIN MAP PREVIEW ---");
        };
        
        // Terrain generation attempts
        // generateTerrain expects a gameContext containing seedRandom and will populate gameContext.terrain.
        // Our this.gameContext is passed, and this.terrain refers to the same object.
        for (let i = 0; i < MAX_INIT_RETRIES; i++) {
            console.log(`Terrain generation attempt ${i + 1}/${MAX_INIT_RETRIES}.`);
            // generateTerrain populates this.gameContext.terrain, which is also this.terrain
            this.gameContext.terrain = generateTerrain(this.gameContext, 'perlinNoiseGenerator'); 
            
            blueStart = findLandPosition(this.gameContext, WORLD_SIZE * 0.2, WORLD_SIZE * 0.5, COMMANDER_START_AREA_SIZE);
            redStart = findLandPosition(this.gameContext, WORLD_SIZE * 0.8, WORLD_SIZE * 0.5, COMMANDER_START_AREA_SIZE);

            if (blueStart && redStart) {
                console.log(`Found starting positions for both teams after ${i + 1} attempt(s).`);
                // Use this.terrain for printing, as it's directly available and refers to the generated terrain.
                if (!this.gameContext.HEADLESS_MODE) printTerrainMap(this.terrain, this.gameContext.HEADLESS_MODE);
                console.log(`Blue spawn: (${blueStart.x.toFixed(0)}, ${blueStart.y.toFixed(0)}), Red spawn: (${redStart.x.toFixed(0)}, ${redStart.y.toFixed(0)})`);
                break;
            } else {
                console.warn(`Could not find suitable ${COMMANDER_START_AREA_SIZE}x${COMMANDER_START_AREA_SIZE} areas in attempt ${i + 1}. Blue: ${!!blueStart}, Red: ${!!redStart}. Regenerating...`);
            }
        }

        // Fallback logic for start positions
        if (!blueStart) {
            console.log("Focused retries for BLUE commander...");
            for (let i = 0; i < FOCUSED_PLACEMENT_RETRIES; i++) {
                this.gameContext.terrain = generateTerrain(this.gameContext, 'perlinNoiseGenerator');
                blueStart = findLandPosition(this.gameContext, WORLD_SIZE * 0.2, WORLD_SIZE * 0.5, COMMANDER_START_AREA_SIZE);
                if (blueStart) break;
            }
            if (!blueStart) {
                console.error("CRITICAL: Failed to find start for BLUE. Using fallback.");
                blueStart = { x: WORLD_SIZE * 0.2, y: WORLD_SIZE * 0.5 };
            }
        }
        if (!redStart) {
             console.log("Focused retries for RED commander...");
            for (let i = 0; i < FOCUSED_PLACEMENT_RETRIES; i++) {
                this.gameContext.terrain = generateTerrain(this.gameContext, 'perlinNoiseGenerator');
                if (blueStart && !findLandPosition(this.gameContext, blueStart.x, blueStart.y, COMMANDER_START_AREA_SIZE)) {
                     console.warn("Blue start became invalid after terrain regen for Red.");
                }
                redStart = findLandPosition(this.gameContext, WORLD_SIZE * 0.8, WORLD_SIZE * 0.5, COMMANDER_START_AREA_SIZE);
                if (redStart) break;
            }
            if (!redStart) {
                console.error("CRITICAL: Failed to find start for RED. Using fallback.");
                redStart = { x: WORLD_SIZE * 0.8, y: WORLD_SIZE * 0.5 };
            }
        }

        // 4. Initial Unit Placement (Commanders)
        // The `Unit` constructor will need access to the simulation instance (`this`) for its context.
        if (UNIT_TYPES.commander) {
            this.entityManager.addUnit(new Unit(blueStart.x, blueStart.y, 'blue', UNIT_TYPES.commander, this));
            this.entityManager.addUnit(new Unit(redStart.x, redStart.y, 'red', UNIT_TYPES.commander, this));
            this.gameState.addEvent('strategic', 'Commanders deployed!', 3, {x: blueStart.x, y: blueStart.y});
        } else {
            console.error("UNIT_TYPES.commander is not defined! Cannot spawn commanders.");
        }

        // 5. Initial Building Placement (Factories) - adapted from placeFactoriesAroundCommander
        this._placeInitialFactories(blueStart, 'blue');
        this._placeInitialFactories(redStart, 'red');
        
        // 6. Demo / Test related functionalities from old initGame - MARKED FOR RELOCATION
        // These should be handled by a test runner or a specific demo module, not core simulation.
        // e.g., gameContext.selectDemoRecording = selectDemoRecording;
        // e.g., gameContext.playDemo = playDemo;

        // 7. Initial camera settings - UI CONCERN
        // The simulation should not manage camera position or zoom directly.
        // e.g., gameContext.camera.x = WORLD_SIZE / 2;

        this.gameState.addEvent('strategic', 'Battle commenced!', 3);
        console.log("Simulation initialization sequence complete.");
    }

    // Helper method for placing initial factories, adapted from js/core/game.js's placeFactoriesAroundCommander
    _placeInitialFactories(commanderPos, team) {
        const offset = 150; // Distance from commander
        const factoryAreaSize = 3; // Grid cells to check for suitable terrain
        let landPos, airPos, navalPos, energyPos1;

        // Note: `this` (the Simulation instance) is passed as the game context to Building constructor.
        // `this.gameContext` (which contains terrain, seedRandom) is passed to terrain utility functions.

        landPos = findLandPosition(this.gameContext, commanderPos.x + offset, commanderPos.y, factoryAreaSize);
        if (!landPos) landPos = findLandPosition(this.gameContext, commanderPos.x - offset, commanderPos.y, factoryAreaSize);
        if (landPos) {
            this.entityManager.addBuilding(new Building(landPos.x, landPos.y, team, BUILDING_TYPES.landFactory, this));
        } else {
            console.warn(`Could not find ideal spot for Land Factory for ${team}. Placing at fallback or skipping.`);
            // Fallback: this.entityManager.addBuilding(new Building(commanderPos.x + offset, commanderPos.y, team, BUILDING_TYPES.landFactory, this));
        }

        airPos = findLandPosition(this.gameContext, commanderPos.x - offset, commanderPos.y - offset, factoryAreaSize);
        if (!airPos) airPos = findLandPosition(this.gameContext, commanderPos.x + offset, commanderPos.y + offset, factoryAreaSize);
        if (airPos) {
            this.entityManager.addBuilding(new Building(airPos.x, airPos.y, team, BUILDING_TYPES.airFactory, this));
        } else {
            console.warn(`Could not find ideal spot for Air Factory for ${team}. Placing at fallback or skipping.`);
        }
        
        navalPos = findWaterPosition(this.gameContext, commanderPos.x, commanderPos.y + offset * 1.5); // Search near commander
        if (navalPos && navalPos.x !== undefined && navalPos.y !== undefined) {
             const distToCommander = Math.sqrt(Math.pow(navalPos.x - commanderPos.x, 2) + Math.pow(navalPos.y - commanderPos.y, 2));
             if (distToCommander < 700) { // Max placement distance constraint
                this.entityManager.addBuilding(new Building(navalPos.x, navalPos.y, team, BUILDING_TYPES.navalFactory, this));
             } else {
                console.log(`Naval factory position for ${team} too far (${distToCommander.toFixed(0)} units), skipping.`);
             }
        } else {
            console.log(`No suitable water position found for Naval factory for ${team}.`);
        }

        energyPos1 = findLandPosition(this.gameContext, commanderPos.x, commanderPos.y - offset, factoryAreaSize); // Another position
        if (energyPos1) {
            this.entityManager.addBuilding(new Building(energyPos1.x, energyPos1.y, team, BUILDING_TYPES.energyExtractor, this));
        } else {
            console.warn(`Could not find ideal spot for Energy Extractor for ${team}. Placing at fallback or skipping.`);
        }
    }

    update() {
        // TODO: Integrate Battle Journal recording stop logic if applicable.
        // This was in the old update() and would set gameState.winner = "RECORDING_COMPLETE".
        // Needs careful thought on how simulation termination is handled.
        // if (this.gameContext.RECORD_AI_DECISIONS && this.gameState.gameTime >= this.gameContext.RECORD_AI_DECISIONS_DURATION_SECONDS) {
        //     // ... logic to stop recording, potentially send to server ...
        //     this.gameState.winner = "RECORDING_COMPLETE"; // This is a special condition.
        //     return; // Stop further updates this frame.
        // }

        if (this.gameState.paused || this.gameState.winner) return;

        const now = typeof performance !== 'undefined' ? performance.now() : Date.now(); // Fallback for non-browser env
        // Default to ~60 FPS if lastUpdateTime is not set (e.g., first frame)
        const deltaTime = this.lastUpdateTime ? (now - this.lastUpdateTime) / 1000 : (1 / 60); 
        this.lastUpdateTime = now;

        this.gameState.update(deltaTime);
        // Entity manager needs the simulation instance (`this`) as its game context to access shared systems like adding events, projectiles, etc.
        this.entityManager.update(deltaTime, this.gameState, this);

        // TODO: REDUX REFACTOR - Simulation.update should become a command processor.
        // 1. It would receive a list of commands (actions) for the current frame/tick.
        //    These commands could be from player input, AI, or internal game events.
        // 2. For each command, it would dispatch it to the appropriate reducer or processing function.
        //    Example: simulation.dispatchCommand({ type: GameCommandTypes.MOVE_UNIT, payload: { unitId: 'u1', targetPosition: {x,y} } });
        // 3. Reducers (potentially within EntityManager, GameState, or dedicated reducer modules)
        //    would take the current state and the command, and return the NEW state.
        // 4. The simulation would then update its state immutably.
        // 5. `battleJournal.recordInputCommand(command)` would be called for each processed command.

        // AI Logic Integration
        // In a Redux model, AI would generate commands instead of directly modifying state.
        // For example, makeStrategicDecisions and coordinateAttacks would return an array of commands
        // that would then be dispatched by the main simulation command processor.
        // e.g., const aiCommands = makeStrategicDecisions(this); this.dispatchCommands(aiCommands);
        // For now, they modify game state directly or via entity methods.
        makeStrategicDecisions(this); 
        coordinateAttacks(this);
        
        // UI-CONCERNS from old game.js update() to be handled by UI layer:
        // - Camera auto-movement logic
        // - FPV mode camera updates (fpvMode state itself is in GameState, camera control is UI)
        // - Introspection window updates
        // - Command status renderer updates
    }

    gameLoop(timestamp) { // timestamp is typically from requestAnimationFrame
        if (!this.lastFpsTime) this.lastFpsTime = 0;
        if (!this.frameCount) this.frameCount = 0;

        this.frameCount++;
        if (timestamp - this.lastFpsTime >= 1000) {
            this.frameCount = 0;
            this.lastFpsTime = timestamp;
        }

        if (this.gameState.winner) {
            return false; // Signal to stop the game loop
        }

        this.update();
        return true; // Signal to continue the loop
    }
}

// Utility functions for game events and formatting
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Utility function for Area of Effect (AOE) damage
export function performAoeDamage(centerX, centerY, radius, damageAmount, ownerTeam, entityManager, gameState) {
    let unitsHitCount = 0;

    if (!entityManager || !entityManager.units) {
        console.error("entityManager or entityManager.units not available in performAoeDamage");
        return;
    }

    entityManager.units.forEach(unit => {
        const dx = unit.x - centerX;
        const dy = unit.y - centerY;
        const distanceSquared = dx * dx + dy * dy;
        const radiusSquared = radius * radius;

        if (distanceSquared < radiusSquared) {
            // Unit is within AOE radius
            // TODO: Implement team check / friendly fire rules if necessary based on ownerTeam and unit.team
            unitsHitCount++;
            let remainingDamage = damageAmount;

            // Apply damage to shields first
            if (unit.shields !== undefined && unit.shields > 0) {
                const shieldDamage = Math.min(remainingDamage, unit.shields);
                unit.shields -= shieldDamage;
                remainingDamage -= shieldDamage;
            }

            // Apply remaining damage to HP
            if (remainingDamage > 0 && unit.hp > 0) {
                unit.takeDamage(remainingDamage); // Assuming unit.takeDamage handles HP reduction and death
                                                 // It might need access to gameState to report death events.
                                                 // Consider passing gameState or making unit.takeDamage emit events.
            }
        }
    });

    if (unitsHitCount > 0 && gameState && gameState.addEvent) {
        // Optional: Add a generic event for AOE hit for debugging or less critical info
        // gameState.addEvent('aoe_hit', `AOE hit ${unitsHitCount} units.`, 1, { x: centerX, y: centerY });
    }
}
