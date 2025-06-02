// Batch Processor - High locality batch processing for game entities
// Processes entities in groups to maximize cache efficiency and reduce overhead

export class BatchProcessor {
    constructor() {
        this.batchSize = 64; // Optimize for L1 cache line
        this.processingQueues = {
            units: [],
            buildings: [],
            projectiles: [],
            effects: []
        };
        
        // Pre-allocated arrays for batch processing
        this.unitBatch = new Array(this.batchSize);
        this.buildingBatch = new Array(this.batchSize);
        this.updateResults = {
            unitsToRemove: [],
            buildingsToRemove: [],
            projectilesToRemove: [],
            effectsToRemove: []
        };

        // Performance tracking
        this.stats = {
            frameCount: 0,
            totalUpdates: 0,
            batchUpdates: 0,
            avgBatchSize: 0
        };
    }

    // Process units in batches for cache efficiency
    processUnitBatch(units, gameContext, spatialIndex) {
        this.updateResults.unitsToRemove.length = 0;
        let processedCount = 0;
        
        // Process units in cache-friendly batches
        for (let batchStart = 0; batchStart < units.length; batchStart += this.batchSize) {
            const batchEnd = Math.min(batchStart + this.batchSize, units.length);
            const currentBatchSize = batchEnd - batchStart;
            
            // Fill batch array with unit references
            for (let i = 0; i < currentBatchSize; i++) {
                this.unitBatch[i] = units[batchStart + i];
            }
            
            // Process batch with spatial locality optimizations
            this.processUnitBatchInner(this.unitBatch, currentBatchSize, gameContext, spatialIndex);
            processedCount += currentBatchSize;
        }
        
        // Remove dead units in reverse order to maintain array integrity
        for (let i = this.updateResults.unitsToRemove.length - 1; i >= 0; i--) {
            const index = this.updateResults.unitsToRemove[i];
            units.splice(index, 1);
        }
        
        this.stats.totalUpdates += processedCount;
        this.stats.batchUpdates++;
        
        return processedCount;
    }

    // Inner batch processing with high locality
    processUnitBatchInner(batch, batchSize, gameContext, spatialIndex) {
        const { terrain, TILE_SIZE, GRID_SIZE, TERRAIN_TYPES } = gameContext;
        
        // Phase 1: Movement and position updates (sequential access)
        for (let i = 0; i < batchSize; i++) {
            const unit = batch[i];
            
            // Update velocity and position
            this.updateUnitMovement(unit, gameContext);
            
            // Update cooldowns (simple arithmetic operations)
            if (unit.cooldown > 0) unit.cooldown--;
            if (unit.pathRequestCooldown > 0) unit.pathRequestCooldown--;
            if (unit.captionCooldown > 0) unit.captionCooldown--;
            if (unit.grenadeCooldown > 0) unit.grenadeCooldown--;
        }
        
        // Phase 2: Terrain/collision checks (locality-optimized)
        for (let i = 0; i < batchSize; i++) {
            const unit = batch[i];
            this.updateUnitTerrain(unit, terrain, TILE_SIZE, GRID_SIZE, TERRAIN_TYPES);
        }
        
        // Phase 3: Target acquisition and combat (uses spatial index)
        for (let i = 0; i < batchSize; i++) {
            const unit = batch[i];
            this.updateUnitCombat(unit, gameContext, spatialIndex);
        }
        
        // Phase 4: Health checks and cleanup
        for (let i = 0; i < batchSize; i++) {
            const unit = batch[i];
            
            // Shield regeneration
            if (unit.shields < unit.maxShields) {
                unit.shields = Math.min(unit.maxShields, unit.shields + unit.shieldRegen);
            }
            
            // Check for unit death
            if (unit.hp <= 0) {
                this.updateResults.unitsToRemove.push(i);
            }
        }
    }

    // Optimized movement update with minimal branching
    updateUnitMovement(unit, gameContext) {
        const speed = unit.getCurrentSpeed(gameContext);
        const hasTarget = unit.target !== null;
        const isEscaping = unit.isEscaping;
        
        if (isEscaping) {
            // Escape movement
            unit.vx = Math.cos(unit.escapeAngle) * speed;
            unit.vy = Math.sin(unit.escapeAngle) * speed;
            unit.escapeDuration--;
            
            if (unit.escapeDuration <= 0) {
                unit.isEscaping = false;
            }
        } else if (hasTarget) {
            // Target-based movement
            const dx = unit.target.x - unit.x;
            const dy = unit.target.y - unit.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > unit.type.size) {
                unit.vx = (dx / distance) * speed;
                unit.vy = (dy / distance) * speed;
                unit.angle = Math.atan2(dy, dx);
            } else {
                unit.vx = 0;
                unit.vy = 0;
            }
        } else {
            // No target, gradual stop
            unit.vx *= 0.95;
            unit.vy *= 0.95;
        }
        
        // Apply velocity
        unit.x += unit.vx;
        unit.y += unit.vy;
        
        // World bounds check
        unit.x = Math.max(0, Math.min(gameContext.WORLD_SIZE, unit.x));
        unit.y = Math.max(0, Math.min(gameContext.WORLD_SIZE, unit.y));
    }

    // Optimized terrain checking
    updateUnitTerrain(unit, terrain, TILE_SIZE, GRID_SIZE, TERRAIN_TYPES) {
        const tileX = Math.floor(unit.x / TILE_SIZE);
        const tileY = Math.floor(unit.y / TILE_SIZE);
        
        // Bounds check with single comparison
        if ((tileX | tileY) < 0 || tileX >= GRID_SIZE || tileY >= GRID_SIZE) {
            return; // Out of bounds
        }
        
        const terrainType = terrain[tileX][tileY];
        
        // Handle terrain-specific logic
        if (terrainType === TERRAIN_TYPES.WATER && unit.type.movementType !== 'amphibious') {
            // Push unit away from water
            unit.x += (unit.x > tileX * TILE_SIZE + TILE_SIZE/2) ? 2 : -2;
            unit.y += (unit.y > tileY * TILE_SIZE + TILE_SIZE/2) ? 2 : -2;
        }
    }

    // Optimized combat update using spatial index
    updateUnitCombat(unit, gameContext, spatialIndex) {
        // Early exit for support units
        if (unit.type.support) {
            this.updateSupportUnit(unit, gameContext);
            return;
        }
        
        // Target acquisition if no current target
        if (!unit.target && unit.cooldown === 0) {
            const nearbyEnemies = spatialIndex.getNearbyUnits(
                unit.x, unit.y, unit.type.range, unit.team
            );
            
            if (nearbyEnemies.length > 0) {
                unit.target = nearbyEnemies[0]; // Take first (closest due to spatial index)
            }
        }
        
        // Combat execution
        if (unit.target && unit.cooldown === 0) {
            const dx = unit.target.x - unit.x;
            const dy = unit.target.y - unit.y;
            const distanceSquared = dx * dx + dy * dy;
            const rangeSquared = unit.type.range * unit.type.range;
            
            if (distanceSquared <= rangeSquared) {
                // In range, attack
                this.executeAttack(unit, unit.target, gameContext);
                unit.cooldown = unit.type.fireRate || 60;
            }
        }
        
        // Clear dead targets
        if (unit.target && unit.target.hp <= 0) {
            unit.target = null;
        }
    }

    // Support unit update (simplified)
    updateSupportUnit(unit, gameContext) {
        if (unit.type.name === 'Engineer') {
            // Engineer logic
            this.updateEngineer(unit, gameContext);
        } else if (unit.type.name === 'Commander') {
            // Commander logic
            this.updateCommander(unit, gameContext);
        }
    }

    // Simplified engineer update
    updateEngineer(unit, gameContext) {
        if (!unit.target) {
            // Find nearby damaged buildings or resource nodes
            const nearbyBuildings = gameContext.spatialIndex.getNearbyBuildings(
                unit.x, unit.y, 100, null
            );
            
            for (let i = 0; i < nearbyBuildings.length; i++) {
                const building = nearbyBuildings[i];
                if (building.team === unit.team && building.hp < building.maxHp) {
                    unit.target = building;
                    break;
                }
            }
        }
    }

    // Simplified commander update
    updateCommander(unit, gameContext) {
        // Commander-specific logic here
        if (unit.constructionTask) {
            // Handle construction
            this.updateConstruction(unit, gameContext);
        }
    }

    // Execute attack with minimal allocations
    executeAttack(attacker, target, gameContext) {
        const damage = attacker.type.damage || 10;
        
        // Apply damage to shields first, then health
        if (target.shields > 0) {
            const shieldDamage = Math.min(damage, target.shields);
            target.shields -= shieldDamage;
            const remainingDamage = damage - shieldDamage;
            if (remainingDamage > 0) {
                target.hp -= remainingDamage;
            }
        } else {
            target.hp -= damage;
        }
        
        // Create projectile effect if needed (minimal allocation)
        if (attacker.type.projectile && gameContext.addProjectile) {
            gameContext.addProjectile(
                attacker.x, attacker.y,
                target.x, target.y,
                attacker.type.projectile
            );
        }
    }

    // Process buildings in batches
    processBuildingBatch(buildings, gameContext) {
        this.updateResults.buildingsToRemove.length = 0;
        let processedCount = 0;
        
        for (let batchStart = 0; batchStart < buildings.length; batchStart += this.batchSize) {
            const batchEnd = Math.min(batchStart + this.batchSize, buildings.length);
            
            for (let i = batchStart; i < batchEnd; i++) {
                const building = buildings[i];
                
                // Simple building update
                this.updateBuilding(building, gameContext);
                
                if (building.hp <= 0) {
                    this.updateResults.buildingsToRemove.push(i);
                }
                
                processedCount++;
            }
        }
        
        // Remove dead buildings
        for (let i = this.updateResults.buildingsToRemove.length - 1; i >= 0; i--) {
            const index = this.updateResults.buildingsToRemove[i];
            buildings.splice(index, 1);
        }
        
        return processedCount;
    }

    // Simple building update
    updateBuilding(building, gameContext) {
        // Production queue processing
        if (building.productionQueue && building.productionQueue.length > 0) {
            building.productionProgress = (building.productionProgress || 0) + 1;
            
            const currentItem = building.productionQueue[0];
            if (building.productionProgress >= currentItem.buildTime) {
                // Spawn unit
                this.spawnUnitFromBuilding(building, currentItem, gameContext);
                building.productionQueue.shift();
                building.productionProgress = 0;
            }
        }
        
        // Resource generation
        if (building.type.resourceGeneration) {
            const resources = gameContext.resources[building.team];
            if (resources) {
                resources.mass += building.type.resourceGeneration.mass || 0;
                resources.energy += building.type.resourceGeneration.energy || 0;
            }
        }
    }

    // Spawn unit from building
    spawnUnitFromBuilding(building, unitType, gameContext) {
        const spawnX = building.x + (Math.random() - 0.5) * 40;
        const spawnY = building.y + (Math.random() - 0.5) * 40;
        
        const newUnit = new gameContext.Unit(spawnX, spawnY, building.team, unitType);
        gameContext.units.push(newUnit);
    }

    // Get processing statistics
    getStats() {
        this.stats.frameCount++;
        
        if (this.stats.batchUpdates > 0) {
            this.stats.avgBatchSize = this.stats.totalUpdates / this.stats.batchUpdates;
        }
        
        return { ...this.stats };
    }

    // Reset statistics
    resetStats() {
        this.stats.frameCount = 0;
        this.stats.totalUpdates = 0;
        this.stats.batchUpdates = 0;
        this.stats.avgBatchSize = 0;
    }
}