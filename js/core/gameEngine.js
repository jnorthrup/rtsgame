// High Performance Game Engine - Optimized for cache locality and minimal allocations
// Integrates spatial indexing and batch processing for maximum performance

import { SpatialIndex } from './spatialIndex.js';
import { BatchProcessor } from './batchProcessor.js';
import { battleJournal } from './battleJournal.js';
import { gameRNG, enableDeterministicMode } from './deterministicRNG.js';

export class GameEngine {
    constructor(worldSize = 800) {
        this.worldSize = worldSize;
        
        // Core systems
        this.spatialIndex = new SpatialIndex(worldSize, 64); // 64x64 cell size
        this.batchProcessor = new BatchProcessor();
        
        // Game state
        this.gameState = {
            gameTime: 0,
            frameCount: 0,
            winner: null,
            paused: false,
            tickRate: 60 // Target FPS
        };
        
        // Entity collections (flat arrays for cache efficiency)
        this.units = [];
        this.buildings = [];
        this.projectiles = [];
        this.effects = [];
        
        // Resources
        this.resources = {
            blue: { mass: 100, energy: 150, massIncome: 0, energyIncome: 0 },
            red: { mass: 100, energy: 150, massIncome: 0, energyIncome: 0 }
        };
        
        // Terrain data (flat array for cache efficiency)
        this.terrain = null;
        this.resourceNodes = [];
        
        // Performance monitoring
        this.performance = {
            frameTime: 0,
            updateTime: 0,
            spatialTime: 0,
            batchTime: 0,
            avgFrameTime: 0,
            frameHistory: new Array(60).fill(0),
            frameHistoryIndex: 0
        };
        
        // Pre-allocated arrays for temporary operations
        this.tempArray = new Array(1000);
        this.tempResults = [];
        
        // Battle recording
        this.recordingEnabled = false;
        this.recordingConfig = null;
    }

    // Initialize the game engine
    initialize(config = {}) {
        console.log('🚀 Initializing High Performance Game Engine');
        
        // Apply configuration
        this.worldSize = config.worldSize || this.worldSize;
        this.gameState.tickRate = config.tickRate || 60;
        
        // Initialize spatial index with optimal cell size
        const optimalCellSize = Math.max(32, Math.floor(this.worldSize / 64));
        this.spatialIndex = new SpatialIndex(this.worldSize, optimalCellSize);
        
        // Initialize terrain if provided
        if (config.terrain) {
            this.terrain = config.terrain;
        }
        
        if (config.resourceNodes) {
            this.resourceNodes = config.resourceNodes;
        }
        
        // Setup deterministic mode if enabled
        if (config.deterministic) {
            const seed = config.seed || Date.now();
            enableDeterministicMode(seed);
            console.log(`🎲 Deterministic mode enabled with seed: ${seed}`);
        }
        
        // Start battle recording if requested
        if (config.recording) {
            this.startRecording(config.recording);
        }
        
        console.log('✅ Game Engine initialized');
        console.log(`   World Size: ${this.worldSize}x${this.worldSize}`);
        console.log(`   Spatial Index: ${this.spatialIndex.gridWidth}x${this.spatialIndex.gridHeight} cells`);
        console.log(`   Cell Size: ${this.spatialIndex.cellSize}`);
    }

    // Main update loop - optimized for high performance
    update(deltaTime = 1/60) {
        const startTime = performance.now();
        
        if (this.gameState.paused) return;
        
        // Update game time
        this.gameState.gameTime += deltaTime;
        this.gameState.frameCount++;
        
        // Phase 1: Clear and rebuild spatial index (cache-optimized)
        const spatialStart = performance.now();
        this.spatialIndex.clear();
        this.spatialIndex.addUnits(this.units);
        this.spatialIndex.addBuildings(this.buildings);
        this.performance.spatialTime = performance.now() - spatialStart;
        
        // Phase 2: Batch process entities (high locality)
        const batchStart = performance.now();
        const gameContext = this.createGameContext();
        
        // Process units in cache-friendly batches
        this.batchProcessor.processUnitBatch(this.units, gameContext, this.spatialIndex);
        
        // Process buildings in batches
        this.batchProcessor.processBuildingBatch(this.buildings, gameContext);
        
        // Process projectiles (simple linear pass)
        this.updateProjectiles(gameContext);
        
        // Process effects (simple linear pass)
        this.updateEffects(gameContext);
        
        this.performance.batchTime = performance.now() - batchStart;
        
        // Phase 3: Resource management and game state
        this.updateResources();
        this.checkWinConditions();
        
        // Phase 4: Battle recording
        if (this.recordingEnabled) {
            battleJournal.recordFrame(gameContext);
        }
        
        // Phase 5: Performance tracking
        this.updatePerformanceMetrics(startTime);
        
        // Periodic cleanup and optimization
        if (this.gameState.frameCount % 300 === 0) { // Every 5 seconds
            this.performPeriodicMaintenance();
        }
    }

    // Create optimized game context
    createGameContext() {
        return {
            units: this.units,
            buildings: this.buildings,
            projectiles: this.projectiles,
            effects: this.effects,
            resources: this.resources,
            gameState: this.gameState,
            terrain: this.terrain,
            resourceNodes: this.resourceNodes,
            spatialIndex: this.spatialIndex,
            worldSize: this.worldSize,
            
            // Import types and constants
            UNIT_TYPES: this.UNIT_TYPES,
            BUILDING_TYPES: this.BUILDING_TYPES,
            WORLD_SIZE: this.worldSize,
            TILE_SIZE: this.TILE_SIZE,
            GRID_SIZE: this.GRID_SIZE,
            TERRAIN_TYPES: this.TERRAIN_TYPES,
            
            // Factory functions
            Unit: this.Unit,
            Building: this.Building,
            
            // Event recording
            addEvent: (ctx, type, msg, importance, pos) => {
                if (importance >= 2 && this.recordingEnabled) {
                    battleJournal.recordEvent(type.toUpperCase(), msg, pos);
                }
            },
            
            // Utility functions
            addProjectile: this.addProjectile.bind(this),
            addEffect: this.addEffect.bind(this),
            
            // Main game globals for compatibility
            mainGameGlobals: {
                resources: this.resources,
                units: this.units,
                Unit: this.Unit,
                Building: this.Building,
                addEvent: (type, msg) => {
                    if (this.recordingEnabled) {
                        battleJournal.recordEvent(type.toUpperCase(), msg);
                    }
                }
            }
        };
    }

    // Optimized projectile update
    updateProjectiles(gameContext) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            // Update position
            projectile.x += projectile.vx;
            projectile.y += projectile.vy;
            projectile.age++;
            
            // Check for collision or timeout
            if (projectile.age > projectile.maxAge || 
                this.checkProjectileHit(projectile, gameContext)) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    // Check projectile collision
    checkProjectileHit(projectile, gameContext) {
        const nearbyUnits = this.spatialIndex.getNearbyUnits(
            projectile.x, projectile.y, projectile.blastRadius || 5, projectile.team
        );
        
        if (nearbyUnits.length > 0) {
            // Apply damage to nearby units
            for (let i = 0; i < nearbyUnits.length; i++) {
                const unit = nearbyUnits[i];
                const dx = unit.x - projectile.x;
                const dy = unit.y - projectile.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= (projectile.blastRadius || 5)) {
                    unit.hp -= projectile.damage || 10;
                }
            }
            return true;
        }
        
        return false;
    }

    // Optimized effects update
    updateEffects(gameContext) {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.age++;
            
            if (effect.age > effect.maxAge) {
                this.effects.splice(i, 1);
            }
        }
    }

    // Resource management
    updateResources() {
        // Process resource income
        ['blue', 'red'].forEach(team => {
            const teamResources = this.resources[team];
            teamResources.mass += teamResources.massIncome;
            teamResources.energy += teamResources.energyIncome;
        });
    }

    // Check for win conditions
    checkWinConditions() {
        if (this.gameState.winner) return;
        
        const blueCommanderAlive = this.units.some(u => u.team === 'blue' && u.type.name === 'Commander');
        const redCommanderAlive = this.units.some(u => u.team === 'red' && u.type.name === 'Commander');
        
        if (!blueCommanderAlive && redCommanderAlive) {
            this.gameState.winner = 'RED';
        } else if (!redCommanderAlive && blueCommanderAlive) {
            this.gameState.winner = 'BLUE';
        }
    }

    // Add projectile with minimal allocation
    addProjectile(fromX, fromY, toX, toY, projectileType) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = projectileType.speed || 5;
        
        this.projectiles.push({
            x: fromX,
            y: fromY,
            vx: (dx / distance) * speed,
            vy: (dy / distance) * speed,
            damage: projectileType.damage || 10,
            blastRadius: projectileType.blastRadius || 5,
            maxAge: Math.floor(distance / speed) + 10,
            age: 0,
            type: projectileType.name
        });
    }

    // Add effect with minimal allocation
    addEffect(x, y, effectType) {
        this.effects.push({
            x, y,
            type: effectType.name || 'explosion',
            age: 0,
            maxAge: effectType.duration || 30,
            scale: effectType.scale || 1.0
        });
    }

    // Performance monitoring
    updatePerformanceMetrics(startTime) {
        const frameTime = performance.now() - startTime;
        this.performance.frameTime = frameTime;
        
        // Rolling average
        this.performance.frameHistory[this.performance.frameHistoryIndex] = frameTime;
        this.performance.frameHistoryIndex = (this.performance.frameHistoryIndex + 1) % 60;
        
        // Calculate average
        let sum = 0;
        for (let i = 0; i < 60; i++) {
            sum += this.performance.frameHistory[i];
        }
        this.performance.avgFrameTime = sum / 60;
    }

    // Periodic maintenance and optimization
    performPeriodicMaintenance() {
        // Clean up null references
        this.units = this.units.filter(u => u !== null);
        this.buildings = this.buildings.filter(b => b !== null);
        
        // Log performance stats
        const stats = this.spatialIndex.getStats();
        const batchStats = this.batchProcessor.getStats();
        
        console.log(`🔧 Performance Stats (Frame ${this.gameState.frameCount}):`);
        console.log(`   Avg Frame Time: ${this.performance.avgFrameTime.toFixed(2)}ms`);
        console.log(`   Spatial Time: ${this.performance.spatialTime.toFixed(2)}ms`);
        console.log(`   Batch Time: ${this.performance.batchTime.toFixed(2)}ms`);
        console.log(`   Entities: ${this.units.length} units, ${this.buildings.length} buildings`);
        console.log(`   Spatial: ${stats.occupiedCells}/${stats.totalCells} cells occupied`);
        console.log(`   Batch: ${batchStats.avgBatchSize.toFixed(1)} avg batch size`);
    }

    // Start battle recording
    startRecording(config = {}) {
        this.recordingEnabled = true;
        this.recordingConfig = config;
        battleJournal.startRecording({
            duration: config.duration || 300,
            gameMode: config.gameMode || 'standard',
            deterministic: true,
            ...config
        });
        console.log('📹 Battle recording started');
    }

    // Stop battle recording
    stopRecording(outcome = null) {
        if (!this.recordingEnabled) return null;
        
        this.recordingEnabled = false;
        const battleId = battleJournal.stopRecording(outcome);
        console.log('📹 Battle recording stopped');
        return battleId;
    }

    // Get engine status
    getStatus() {
        return {
            gameTime: this.gameState.gameTime,
            frameCount: this.gameState.frameCount,
            units: this.units.length,
            buildings: this.buildings.length,
            projectiles: this.projectiles.length,
            effects: this.effects.length,
            winner: this.gameState.winner,
            performance: {
                avgFrameTime: this.performance.avgFrameTime,
                fps: 1000 / Math.max(1, this.performance.avgFrameTime)
            },
            spatial: this.spatialIndex.getStats(),
            batch: this.batchProcessor.getStats()
        };
    }

    // Add unit to the game
    addUnit(x, y, team, unitType) {
        const unit = new this.Unit(x, y, team, unitType);
        this.units.push(unit);
        return unit;
    }

    // Add building to the game
    addBuilding(x, y, team, buildingType) {
        const building = new this.Building(x, y, team, buildingType);
        this.buildings.push(building);
        return building;
    }

    // Set required dependencies
    setDependencies(deps) {
        this.UNIT_TYPES = deps.UNIT_TYPES;
        this.BUILDING_TYPES = deps.BUILDING_TYPES;
        this.TILE_SIZE = deps.TILE_SIZE;
        this.GRID_SIZE = deps.GRID_SIZE;
        this.TERRAIN_TYPES = deps.TERRAIN_TYPES;
        this.Unit = deps.Unit;
        this.Building = deps.Building;
    }
}