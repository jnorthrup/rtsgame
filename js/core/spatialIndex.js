// Spatial Index System - High locality spatial partitioning for efficient collision detection
// Uses grid-based spatial hashing with memory-efficient data structures

export class SpatialIndex {
    constructor(worldSize, cellSize = 64) {
        this.worldSize = worldSize;
        this.cellSize = cellSize;
        this.gridWidth = Math.ceil(worldSize / cellSize);
        this.gridHeight = Math.ceil(worldSize / cellSize);
        this.totalCells = this.gridWidth * this.gridHeight;
        
        // Use flat arrays for cache efficiency
        this.unitCells = new Array(this.totalCells); // Array of unit arrays per cell
        this.buildingCells = new Array(this.totalCells); // Array of building arrays per cell
        this.entityCount = new Uint16Array(this.totalCells); // Count per cell for quick checks
        
        // Initialize arrays
        for (let i = 0; i < this.totalCells; i++) {
            this.unitCells[i] = [];
            this.buildingCells[i] = [];
            this.entityCount[i] = 0;
        }

        // Reusable arrays to avoid allocations
        this.tempResults = [];
        this.tempCells = [];
        this.neighborOffsets = this.precomputeNeighborOffsets();
    }

    // Precompute neighbor cell offsets for cache efficiency
    precomputeNeighborOffsets() {
        const offsets = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                offsets.push(dx + dy * this.gridWidth);
            }
        }
        return offsets;
    }

    // Convert world coordinates to cell index (flat array index)
    getCellIndex(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        
        if (cellX < 0 || cellX >= this.gridWidth || cellY < 0 || cellY >= this.gridHeight) {
            return -1; // Out of bounds
        }
        
        return cellX + cellY * this.gridWidth;
    }

    // Clear all entities (called each frame)
    clear() {
        // Fast clear by resetting array lengths
        for (let i = 0; i < this.totalCells; i++) {
            this.unitCells[i].length = 0;
            this.buildingCells[i].length = 0;
            this.entityCount[i] = 0;
        }
    }

    // Add unit to spatial index
    addUnit(unit) {
        const cellIndex = this.getCellIndex(unit.x, unit.y);
        if (cellIndex >= 0) {
            this.unitCells[cellIndex].push(unit);
            this.entityCount[cellIndex]++;
        }
    }

    // Add building to spatial index
    addBuilding(building) {
        const cellIndex = this.getCellIndex(building.x, building.y);
        if (cellIndex >= 0) {
            this.buildingCells[cellIndex].push(building);
            this.entityCount[cellIndex]++;
        }
    }

    // Batch add units for better cache performance
    addUnits(units) {
        for (let i = 0; i < units.length; i++) {
            this.addUnit(units[i]);
        }
    }

    // Batch add buildings for better cache performance
    addBuildings(buildings) {
        for (let i = 0; i < buildings.length; i++) {
            this.addBuilding(buildings[i]);
        }
    }

    // Find nearby units within radius (optimized for cache locality)
    getNearbyUnits(x, y, radius, filterTeam = null) {
        this.tempResults.length = 0;
        const radiusSquared = radius * radius;
        
        const cellIndex = this.getCellIndex(x, y);
        if (cellIndex < 0) return this.tempResults;

        const centerCellX = Math.floor(x / this.cellSize);
        const centerCellY = Math.floor(y / this.cellSize);
        
        // Check 3x3 neighborhood around target cell
        for (let i = 0; i < this.neighborOffsets.length; i++) {
            const offset = this.neighborOffsets[i];
            const checkIndex = cellIndex + offset;
            
            // Bounds check
            const checkX = centerCellX + (offset % 3) - 1;
            const checkY = centerCellY + Math.floor(offset / 3) - 1;
            
            if (checkX < 0 || checkX >= this.gridWidth || 
                checkY < 0 || checkY >= this.gridHeight || 
                checkIndex < 0 || checkIndex >= this.totalCells) {
                continue;
            }

            // Quick empty cell check
            if (this.entityCount[checkIndex] === 0) continue;

            const cellUnits = this.unitCells[checkIndex];
            for (let j = 0; j < cellUnits.length; j++) {
                const unit = cellUnits[j];
                
                // Team filter
                if (filterTeam && unit.team === filterTeam) continue;
                
                // Distance check (squared to avoid sqrt)
                const dx = unit.x - x;
                const dy = unit.y - y;
                if (dx * dx + dy * dy <= radiusSquared) {
                    this.tempResults.push(unit);
                }
            }
        }
        
        return this.tempResults;
    }

    // Find nearby buildings within radius
    getNearbyBuildings(x, y, radius, filterTeam = null) {
        this.tempResults.length = 0;
        const radiusSquared = radius * radius;
        
        const cellIndex = this.getCellIndex(x, y);
        if (cellIndex < 0) return this.tempResults;

        const centerCellX = Math.floor(x / this.cellSize);
        const centerCellY = Math.floor(y / this.cellSize);
        
        // Check 3x3 neighborhood
        for (let i = 0; i < this.neighborOffsets.length; i++) {
            const offset = this.neighborOffsets[i];
            const checkIndex = cellIndex + offset;
            
            const checkX = centerCellX + (offset % 3) - 1;
            const checkY = centerCellY + Math.floor(offset / 3) - 1;
            
            if (checkX < 0 || checkX >= this.gridWidth || 
                checkY < 0 || checkY >= this.gridHeight ||
                checkIndex < 0 || checkIndex >= this.totalCells) {
                continue;
            }

            if (this.entityCount[checkIndex] === 0) continue;

            const cellBuildings = this.buildingCells[checkIndex];
            for (let j = 0; j < cellBuildings.length; j++) {
                const building = cellBuildings[j];
                
                if (filterTeam && building.team === filterTeam) continue;
                
                const dx = building.x - x;
                const dy = building.y - y;
                if (dx * dx + dy * dy <= radiusSquared) {
                    this.tempResults.push(building);
                }
            }
        }
        
        return this.tempResults;
    }

    // Find all entities in a rectangular area (for selection boxes)
    getEntitiesInRect(minX, minY, maxX, maxY, includeUnits = true, includeBuildings = true) {
        this.tempResults.length = 0;
        
        const minCellX = Math.max(0, Math.floor(minX / this.cellSize));
        const minCellY = Math.max(0, Math.floor(minY / this.cellSize));
        const maxCellX = Math.min(this.gridWidth - 1, Math.floor(maxX / this.cellSize));
        const maxCellY = Math.min(this.gridHeight - 1, Math.floor(maxY / this.cellSize));
        
        for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
            for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
                const cellIndex = cellX + cellY * this.gridWidth;
                
                if (this.entityCount[cellIndex] === 0) continue;
                
                if (includeUnits) {
                    const cellUnits = this.unitCells[cellIndex];
                    for (let i = 0; i < cellUnits.length; i++) {
                        const unit = cellUnits[i];
                        if (unit.x >= minX && unit.x <= maxX && 
                            unit.y >= minY && unit.y <= maxY) {
                            this.tempResults.push(unit);
                        }
                    }
                }
                
                if (includeBuildings) {
                    const cellBuildings = this.buildingCells[cellIndex];
                    for (let i = 0; i < cellBuildings.length; i++) {
                        const building = cellBuildings[i];
                        if (building.x >= minX && building.x <= maxX && 
                            building.y >= minY && building.y <= maxY) {
                            this.tempResults.push(building);
                        }
                    }
                }
            }
        }
        
        return this.tempResults;
    }

    // Get the closest enemy unit within range
    getClosestEnemy(x, y, radius, team) {
        let closestUnit = null;
        let closestDistSquared = radius * radius;
        
        const cellIndex = this.getCellIndex(x, y);
        if (cellIndex < 0) return null;

        const centerCellX = Math.floor(x / this.cellSize);
        const centerCellY = Math.floor(y / this.cellSize);
        
        for (let i = 0; i < this.neighborOffsets.length; i++) {
            const offset = this.neighborOffsets[i];
            const checkIndex = cellIndex + offset;
            
            const checkX = centerCellX + (offset % 3) - 1;
            const checkY = centerCellY + Math.floor(offset / 3) - 1;
            
            if (checkX < 0 || checkX >= this.gridWidth || 
                checkY < 0 || checkY >= this.gridHeight ||
                checkIndex < 0 || checkIndex >= this.totalCells) {
                continue;
            }

            if (this.entityCount[checkIndex] === 0) continue;

            const cellUnits = this.unitCells[checkIndex];
            for (let j = 0; j < cellUnits.length; j++) {
                const unit = cellUnits[j];
                
                if (unit.team === team) continue; // Same team
                
                const dx = unit.x - x;
                const dy = unit.y - y;
                const distSquared = dx * dx + dy * dy;
                
                if (distSquared < closestDistSquared) {
                    closestUnit = unit;
                    closestDistSquared = distSquared;
                }
            }
        }
        
        return closestUnit;
    }

    // Check if position is clear of entities (for building placement)
    isPositionClear(x, y, radius, ignoreTeam = null) {
        const radiusSquared = radius * radius;
        const cellIndex = this.getCellIndex(x, y);
        if (cellIndex < 0) return false;

        const centerCellX = Math.floor(x / this.cellSize);
        const centerCellY = Math.floor(y / this.cellSize);
        
        for (let i = 0; i < this.neighborOffsets.length; i++) {
            const offset = this.neighborOffsets[i];
            const checkIndex = cellIndex + offset;
            
            const checkX = centerCellX + (offset % 3) - 1;
            const checkY = centerCellY + Math.floor(offset / 3) - 1;
            
            if (checkX < 0 || checkX >= this.gridWidth || 
                checkY < 0 || checkY >= this.gridHeight ||
                checkIndex < 0 || checkIndex >= this.totalCells) {
                continue;
            }

            if (this.entityCount[checkIndex] === 0) continue;

            // Check units
            const cellUnits = this.unitCells[checkIndex];
            for (let j = 0; j < cellUnits.length; j++) {
                const unit = cellUnits[j];
                if (ignoreTeam && unit.team === ignoreTeam) continue;
                
                const dx = unit.x - x;
                const dy = unit.y - y;
                if (dx * dx + dy * dy <= radiusSquared) {
                    return false;
                }
            }

            // Check buildings
            const cellBuildings = this.buildingCells[checkIndex];
            for (let j = 0; j < cellBuildings.length; j++) {
                const building = cellBuildings[j];
                if (ignoreTeam && building.team === ignoreTeam) continue;
                
                const dx = building.x - x;
                const dy = building.y - y;
                if (dx * dx + dy * dy <= radiusSquared) {
                    return false;
                }
            }
        }
        
        return true;
    }

    // Get debug statistics
    getStats() {
        let totalEntities = 0;
        let maxEntitiesPerCell = 0;
        let occupiedCells = 0;
        
        for (let i = 0; i < this.totalCells; i++) {
            const count = this.entityCount[i];
            totalEntities += count;
            if (count > 0) occupiedCells++;
            if (count > maxEntitiesPerCell) maxEntitiesPerCell = count;
        }
        
        return {
            totalCells: this.totalCells,
            occupiedCells,
            totalEntities,
            maxEntitiesPerCell,
            avgEntitiesPerOccupiedCell: occupiedCells > 0 ? (totalEntities / occupiedCells).toFixed(2) : 0,
            cellSize: this.cellSize,
            gridDimensions: `${this.gridWidth}x${this.gridHeight}`
        };
    }
}