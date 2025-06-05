// js/core/simulation.js - Modern Simulation Engine

import { UNIT_TYPES } from '../config/unitTypes.js';
import { BUILDING_TYPES } from '../config/buildingTypes.js';
import { WORLD_SIZE, TILE_SIZE, GRID_SIZE, TERRAIN_TYPES } from '../config/gameConstants.js';
import { SIMULATION_CONFIG } from '../config/simulationConfig.js';
import { Unit } from './unit.js';
import { Building } from './building.js';
import { generateTerrain } from './terrainManager.js';
import { findLandPosition } from './terrain.js';

// EntityManager class to manage all game entities
export class EntityManager {
    constructor() {
        this.units = [];
        this.buildings = [];
        this.projectiles = [];
        this.effects = [];
        this.captions = [];
    }

    addUnit(unit) {
        this.units.push(unit);
    }

    addBuilding(building) {
        this.buildings.push(building);
    }

    addProjectile(projectile) {
        this.projectiles.push(projectile);
    }

    addEffect(effect) {
        this.effects.push(effect);
    }

    addCaption(caption) {
        this.captions.push(caption);
    }

    update(simulation, deltaTime) {
        // Update units
        for (let i = this.units.length - 1; i >= 0; i--) {
            const unit = this.units[i];
            unit.update(simulation, deltaTime);
            
            if (unit.hp <= 0 || unit.isDead) {
                this.units.splice(i, 1);
                
                // Check for commander death (game over condition)
                if (unit.type === UNIT_TYPES.commander) {
                    const winner = unit.team === 'blue' ? 'RED' : 'BLUE';
                    simulation.gameState.winner = winner;
                    simulation.gameState.addEvent('game_over', `${winner} team wins! Enemy commander destroyed!`, 3);
                }
            }
        }

        // Update buildings
        for (let i = this.buildings.length - 1; i >= 0; i--) {
            const building = this.buildings[i];
            building.update(simulation, deltaTime);
            
            if (building.hp <= 0) {
                this.buildings.splice(i, 1);
            }
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update(simulation, deltaTime);
            
            if (projectile.shouldDestroy) {
                this.projectiles.splice(i, 1);
            }
        }

        // Update effects
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.update();
            
            if (effect.life <= 0) {
                this.effects.splice(i, 1);
            }
        }

        // Update captions
        for (let i = this.captions.length - 1; i >= 0; i--) {
            const caption = this.captions[i];
            caption.update();
            
            if (caption.life <= 0) {
                this.captions.splice(i, 1);
            }
        }
    }
}

// GameState class to manage game state and events
export class GameState {
    constructor() {
        this.gameTime = 0;
        this.winner = null;
        this.paused = false;
        this.events = [];
        this.fpvMode = false;
        this.aimingGrenade = false;
    }

    addEvent(type, message, importance = 1, position = null) {
        const event = {
            time: this.gameTime,
            type: type,
            message: message,
            importance: importance,
            position: position
        };
        this.events.push(event);
        
        if (importance >= 2) {
            console.log(`[${this.gameTime.toFixed(1)}s] ${type.toUpperCase()}: ${message}`);
        }
        
        return event;
    }
}

// Main Simulation class
export class Simulation {
    constructor(context) {
        this.GAME_SEED = context.GAME_SEED;
        this.seedRandom = context.seedRandom;
        this.HEADLESS_MODE = context.HEADLESS_MODE;
        this.RECORD_AI_DECISIONS = context.RECORD_AI_DECISIONS;
        this.RECORD_AI_DECISIONS_DURATION_SECONDS = context.RECORD_AI_DECISIONS_DURATION_SECONDS;
        this.battleJournal = context.battleJournal;
        
        // Initialize managers
        this.entityManager = new EntityManager();
        this.gameState = new GameState();
        
        // Initialize resources
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

        // Initialize terrain and resource nodes
        this.terrain = [];
        this.resourceNodes = context.resourceNodes || [];
        
        // Create gameContext for compatibility with existing code
        this.gameContext = {
            terrain: this.terrain,
            resourceNodes: this.resourceNodes,
            UNIT_TYPES,
            BUILDING_TYPES,
            WORLD_SIZE,
            TILE_SIZE,
            GRID_SIZE,
            TERRAIN_TYPES
        };

        this.lastFrameTime = 0;
    }

    async init() {
        console.log('Initializing simulation...');
        
        // Generate terrain
        await this.generateTerrain();
        
        // Setup commander build lists
        if (UNIT_TYPES.commander && UNIT_TYPES.commander.buildList) {
            UNIT_TYPES.commander.buildList = [
                BUILDING_TYPES.massExtractor,
                BUILDING_TYPES.energyExtractor,
                BUILDING_TYPES.landFactory
            ];
        }
        
        // Spawn commanders
        await this.spawnCommanders();
        
        console.log('Simulation initialized successfully');
    }

    async generateTerrain() {
        console.log('Generating terrain...');
        
        // Initialize terrain grid
        for (let x = 0; x < GRID_SIZE; x++) {
            this.terrain[x] = [];
            for (let y = 0; y < GRID_SIZE; y++) {
                // Simple terrain generation - mostly land with some water and mountains
                const noise = this.seedRandom.random();
                if (noise < 0.1) {
                    this.terrain[x][y] = { type: TERRAIN_TYPES.WATER, elevation: -0.5 };
                } else if (noise > 0.85) {
                    this.terrain[x][y] = { type: TERRAIN_TYPES.MOUNTAIN, elevation: 1.0 };
                } else if (noise > 0.80) {
                    this.terrain[x][y] = { type: TERRAIN_TYPES.RESOURCE, elevation: 0.1 };
                } else {
                    this.terrain[x][y] = { type: TERRAIN_TYPES.LAND, elevation: 0.0 };
                }
            }
        }
        
        // Generate resource nodes
        this.generateResourceNodes();
        
        console.log('Terrain generation complete');
    }

    generateResourceNodes() {
        this.resourceNodes = [];
        
        // Place resource nodes on resource terrain tiles
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                if (this.terrain[x][y].type === TERRAIN_TYPES.RESOURCE) {
                    const worldX = x * TILE_SIZE;
                    const worldY = y * TILE_SIZE;
                    const type = this.seedRandom.random() < 0.5 ? 'mass' : 'energy';
                    
                    this.resourceNodes.push({
                        x: worldX,
                        y: worldY,
                        type: type,
                        amount: 10000,
                        maxAmount: 10000,
                        occupied: false
                    });
                }
            }
        }
        
        console.log(`Generated ${this.resourceNodes.length} resource nodes`);
    }

    async spawnCommanders() {
        console.log('Spawning commanders...');
        
        // Find spawn positions for commanders
        const blueSpawn = this.findSpawnPosition(0.2, 0.5);
        const redSpawn = this.findSpawnPosition(0.8, 0.5);
        
        if (!blueSpawn || !redSpawn) {
            throw new Error('Could not find valid spawn positions for commanders');
        }
        
        // Create commanders
        const blueCommander = new Unit(blueSpawn.x, blueSpawn.y, 'blue', UNIT_TYPES.commander, this);
        const redCommander = new Unit(redSpawn.x, redSpawn.y, 'red', UNIT_TYPES.commander, this);
        
        this.entityManager.addUnit(blueCommander);
        this.entityManager.addUnit(redCommander);
        
        this.gameState.addEvent('spawn', 'Commanders deployed to battlefield', 2);
        
        console.log('Commanders spawned successfully');
    }

    findSpawnPosition(xRatio, yRatio) {
        const targetX = WORLD_SIZE * xRatio;
        const targetY = WORLD_SIZE * yRatio;
        
        // Try to find a land position near the target
        for (let radius = 0; radius < 200; radius += 20) {
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
                const x = targetX + Math.cos(angle) * radius;
                const y = targetY + Math.sin(angle) * radius;
                
                const tileX = Math.floor(x / TILE_SIZE);
                const tileY = Math.floor(y / TILE_SIZE);
                
                if (tileX >= 0 && tileX < GRID_SIZE && tileY >= 0 && tileY < GRID_SIZE &&
                    this.terrain[tileX] && this.terrain[tileX][tileY].type === TERRAIN_TYPES.LAND) {
                    return { x, y };
                }
            }
        }
        
        return null;
    }

    gameLoop(timestamp) {
        if (this.gameState.paused || this.gameState.winner) {
            return false;
        }
        
        // Calculate delta time
        const deltaTime = this.lastFrameTime > 0 ? (timestamp - this.lastFrameTime) / 1000 : 1/60;
        this.lastFrameTime = timestamp;
        
        // Update game time
        this.gameState.gameTime += deltaTime;
        
        // Update resource income display
        this.updateResourceIncome();
        
        // Update all entities
        this.entityManager.update(this, deltaTime);
        
        // Check win conditions
        this.checkWinConditions();
        
        // Check if we should stop recording
        if (this.RECORD_AI_DECISIONS && this.gameState.gameTime >= this.RECORD_AI_DECISIONS_DURATION_SECONDS) {
            this.gameState.winner = "RECORDING_COMPLETE";
            return false;
        }
        
        return true;
    }

    updateResourceIncome() {
        // Calculate income based on buildings
        for (const team of ['blue', 'red']) {
            this.resources[team].massIncome = 0;
            this.resources[team].energyIncome = 0;
            
            for (const building of this.entityManager.buildings) {
                if (building.team === team && building.type.resourceGeneration) {
                    const income = building.type.resourceGeneration.amount * 60; // per minute
                    if (building.type.resourceGeneration.type === 'mass') {
                        this.resources[team].massIncome += income;
                    } else if (building.type.resourceGeneration.type === 'energy') {
                        this.resources[team].energyIncome += income;
                    }
                }
            }
        }
    }

    checkWinConditions() {
        if (this.gameState.winner) return;
        
        const blueCommander = this.entityManager.units.find(u => u.team === 'blue' && u.type === UNIT_TYPES.commander);
        const redCommander = this.entityManager.units.find(u => u.team === 'red' && u.type === UNIT_TYPES.commander);
        
        if (!blueCommander && !redCommander) {
            this.gameState.winner = 'DRAW';
            this.gameState.addEvent('game_over', 'Both commanders destroyed - Draw!', 3);
        } else if (!blueCommander) {
            this.gameState.winner = 'RED';
            this.gameState.addEvent('game_over', 'Red team wins! Blue commander destroyed!', 3);
        } else if (!redCommander) {
            this.gameState.winner = 'BLUE';
            this.gameState.addEvent('game_over', 'Blue team wins! Red commander destroyed!', 3);
        }
    }
}

// Utility function for time formatting
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
