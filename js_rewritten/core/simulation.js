// js_rewritten/core/simulation.js

/**
 * Central Simulation Codec for the RTS Game
 * Rewritten from first principles to enhance modularity, clarity, and efficiency.
 * Manages game state, entity updates, resource management, and core game logic with a focus on systematic design.
 */

import { UNIT_TYPES } from '../../js/config/unitTypes.js';
import { BUILDING_TYPES } from '../../js/config/buildingTypes.js';
import { WORLD_SIZE, TILE_SIZE, GRID_SIZE, TERRAIN_TYPES } from '../../js/config/gameConstants.js';
import { SIMULATION_CONFIG } from '../../js/config/simulationConfig.js';

// Game State Management
export class GameState {
    constructor() {
        this.gameTime = 0;
        this.paused = false;
        this.winner = null;
        this.events = [];
        this.fpvMode = false;
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
        if (!this.paused && !this.winner) {
            this.gameTime += deltaTime;
        }
    }

    addEvent(type, message, importance = 1, position = null) {
        const event = {
            type,
            message,
            time: this.gameTime,
            importance,
            position
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

    update(deltaTime, gameState, gameContext) {
        // Update units
        for (let i = this.units.length - 1; i >= 0; i--) {
            const unit = this.units[i];
            unit.update(gameContext, deltaTime);
            if (unit.hp <= 0) {
                if (unit.type === UNIT_TYPES.commander) {
                    gameState.winner = unit.team === 'blue' ? 'RED' : 'BLUE';
                    gameState.addEvent('strategic', `${gameState.winner} achieves victory! ${unit.team.toUpperCase()} Commander eliminated.`, 3, { x: unit.x, y: unit.y });
                    // Additional caption logic can be integrated with a caption system
                } else if (unit.type.tier >= 2) {
                    gameState.addEvent('battle', `${unit.team.toUpperCase()} ${unit.type.name} destroyed!`, 2, { x: unit.x, y: unit.y });
                }
                this.units.splice(i, 1);
            }
        }

        // Update buildings
        for (let i = this.buildings.length - 1; i >= 0; i--) {
            const building = this.buildings[i];
            building.update(gameContext, deltaTime);
            if (building.hp <= 0) {
                if (building.type.produces || building.type.resourceGeneration) {
                    gameState.addEvent('battle', `${building.team.toUpperCase()} ${building.type.name} destroyed!`, 2, { x: building.x, y: building.y });
                }
                this.buildings.splice(i, 1);
            }
            // Update resource income if applicable
            if (building.type.resourceGeneration) {
                gameState.updateResources(building.team, building.type.resourceGeneration.mass || 0, building.type.resourceGeneration.energy || 0);
            }
        }

        // Update effects
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.update(deltaTime);
            if (effect.life <= 0 && (!effect.particles || effect.particles.every(p => p.life <= 0))) {
                this.effects.splice(i, 1);
            }
        }

        // Update captions
        for (let i = this.captions.length - 1; i >= 0; i--) {
            const caption = this.captions[i];
            caption.update(deltaTime);
            if (caption.life <= 0) {
                this.captions.splice(i, 1);
            }
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update(gameContext, deltaTime);
            if (projectile.isExpired) {
                this.projectiles.splice(i, 1);
            }
        }
    }

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
    constructor(gameContext) {
        this.gameState = new GameState();
        this.entityManager = new EntityManager();
        this.gameContext = gameContext;
        this.lastUpdateTime = null;
    }

    init() {
        // Initialize game state and entities
        this.gameState.gameTime = 0;
        this.gameState.paused = false;
        this.gameState.winner = null;
        this.entityManager.units.length = 0;
        this.entityManager.buildings.length = 0;
        this.entityManager.effects.length = 0;
        this.entityManager.captions.length = 0;
        this.entityManager.projectiles.length = 0;

        // Reset resources to initial values
        this.gameState.resources.blue.mass = SIMULATION_CONFIG.INITIAL_BLUE_MASS;
        this.gameState.resources.blue.energy = SIMULATION_CONFIG.INITIAL_BLUE_ENERGY;
        this.gameState.resources.blue.massIncome = 0;
        this.gameState.resources.blue.energyIncome = 0;
        this.gameState.resources.red.mass = SIMULATION_CONFIG.INITIAL_RED_MASS;
        this.gameState.resources.red.energy = SIMULATION_CONFIG.INITIAL_RED_ENERGY;
        this.gameState.resources.red.massIncome = 0;
        this.gameState.resources.red.energyIncome = 0;

        // Additional initialization logic can be added here, like terrain generation and initial unit placement
        this.gameState.addEvent('strategic', 'Battle commenced!', 3);
    }

    update() {
        if (this.gameState.paused || this.gameState.winner) return;

        const now = performance.now();
        const deltaTime = this.lastUpdateTime ? (now - this.lastUpdateTime) / 1000 : 0;
        this.lastUpdateTime = now;

        this.gameState.update(deltaTime);
        this.entityManager.update(deltaTime, this.gameState, this.gameContext);

        // Additional game logic updates such as AI decisions can be integrated here
        // Example: makeStrategicDecisions(this.gameContext);
        // Example: coordinateAttacks(this.gameContext);
    }

    gameLoop(timestamp) {
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
