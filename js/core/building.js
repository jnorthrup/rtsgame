import { BUILDING_TYPES } from '../config/buildingTypes.js';
import { UNIT_TYPES } from '../config/unitTypes.js';
import { TILE_SIZE, GRID_SIZE, TERRAIN_TYPES } from '../config/gameConstants.js';
import { findLandPosition } from './terrain.js';
// Global variables like 'resources', 'units', 'captions', 'addEvent'
// are accessed directly. This tight coupling will be addressed in later refactoring.

class Building {
    constructor(x, y, team, type, gameContext = null) {
        this.x = x;
        this.y = y;
        this.team = team;
        this.type = type;
        this.hp = type.maxHp;
        this.maxHp = type.maxHp;
        this.productionQueue = [];
        this.productionProgress = 0;
        this.setRallyPoint(x, y, gameContext);
        this.shields = 0;
        this.maxShields = 0;
        this.captionCooldown = 0;
    }

    setRallyPoint(buildingX, buildingY, gameContext) {
        // Try to find a valid land position for rally point
        if (gameContext && gameContext.terrain) {
            const rallyPositions = [
                { x: buildingX + 100, y: buildingY },     // Right
                { x: buildingX - 100, y: buildingY },     // Left  
                { x: buildingX, y: buildingY + 100 },     // Down
                { x: buildingX, y: buildingY - 100 },     // Up
                { x: buildingX + 70, y: buildingY + 70 }, // Diagonal
                { x: buildingX - 70, y: buildingY - 70 }  // Diagonal
            ];

            for (const pos of rallyPositions) {
                const tileX = Math.floor(pos.x / TILE_SIZE);
                const tileY = Math.floor(pos.y / TILE_SIZE);
                
                if (tileX >= 0 && tileX < GRID_SIZE && tileY >= 0 && tileY < GRID_SIZE &&
                    gameContext.terrain[tileX] && gameContext.terrain[tileX][tileY] === TERRAIN_TYPES.LAND) {
                    this.rallyx = pos.x;
                    this.rallyy = pos.y;
                    return;
                }
            }
        }
        
        // Fallback to building position if no valid rally point found
        this.rallyx = buildingX;
        this.rallyy = buildingY;
    }

    // Refactored to accept gameContext directly
    update(gameContext) { 
        const { units, resources, captions, addEvent, Unit, Caption } = gameContext; // Destructure directly from gameContext

        // Resource generation
        if (this.type.resourceGeneration) {
            // Accessing resources from gameContext
            resources[this.team][this.type.resourceGeneration.type] += this.type.resourceGeneration.amount;
            resources[this.team][this.type.resourceGeneration.type + 'Income'] =
                this.type.resourceGeneration.amount * 60; // Per minute display
        }

        // Auto-production with resource check
        if (this.type.produces && this.productionQueue.length === 0) {
            const unitTypesToBuild = this.type.produces.filter(unitType => {
                // Accessing resources from gameContext
                return resources[this.team].mass >= (unitType.cost?.mass || 0) &&
                       resources[this.team].energy >= (unitType.cost?.energy || 0);
            });

            if (unitTypesToBuild.length > 0 && gameContext.seedRandom.random() < 0.02) { // Use seeded random
                const unitType = unitTypesToBuild[Math.floor(gameContext.seedRandom.random() * unitTypesToBuild.length)]; // Use seeded random
                this.productionQueue.push(unitType);

                // Deduct resources
                if (unitType.cost) {
                    resources[this.team].mass -= unitType.cost.mass || 0;
                    resources[this.team].energy -= unitType.cost.energy || 0;
                }
            }
        }

        // Production progress
        if (this.productionQueue.length > 0) {
            this.productionProgress++;

            // Production caption
            if (this.captionCooldown <= 0 && gameContext.seedRandom.random() < 0.01) { // Use seeded random
                const progress = Math.floor((this.productionProgress / this.productionQueue[0].buildTime) * 100);
                // Accessing captions and Caption class from gameContext
                captions.push(new Caption(this.x, this.y - this.type.size,
                    `Building ${this.productionQueue[0].name} ${progress}%`, '#ff0', 10));
                this.captionCooldown = 90;
            }

            if (this.productionProgress >= this.productionQueue[0].buildTime) {
                const unitType = this.productionQueue.shift();
                // Accessing units and Unit class from gameContext
                const newUnit = new Unit(this.rallyx, this.rallyy, this.team, unitType, gameContext); // Pass gameContext to Unit constructor
                units.push(newUnit);
                this.productionProgress = 0;

                // Completion caption
                captions.push(new Caption(this.x, this.y - this.type.size,
                    `${unitType.name} ready!`, '#0f0', 12));

                if (unitType.name === 'Experimental' || unitType.tier === 3) {
                    // Accessing addEvent from gameContext
                    const event = addEvent(gameContext, 'build', // Pass gameContext as first arg
                        `${this.team.toUpperCase()} completed ${unitType.name}!`, 3);
                    event.position = { x: this.x, y: this.y };
                }
            }
        }

        if (this.captionCooldown > 0) this.captionCooldown--;
    }

    draw(ctx, camera) {
        // TILE_SIZE is now imported and available if needed for calculations.
        // Current drawing is based on this.type.size which is world units.
        const screenX = (this.x - camera.x) * camera.zoom + camera.canvasWidth / 2; // Assuming camera has canvasWidth
        const screenY = (this.y - camera.y) * camera.zoom + camera.canvasHeight / 2; // Assuming camera has canvasHeight
        const size = this.type.size * camera.zoom;

        if (screenX < -size || screenX > camera.canvasWidth + size ||
            screenY < -size || screenY > camera.canvasHeight + size) {
            return;
        }

        // Building base
        ctx.fillStyle = this.team === 'blue' ? '#226' : '#622';
        ctx.fillRect(screenX - size / 2, screenY - size / 2, size, size);

        // Building type
        ctx.fillStyle = this.type.color;
        ctx.fillRect(screenX - size / 3, screenY - size / 3, size * 2 / 3, size * 2 / 3);

        // Resource extractor animation
        if (this.type.resourceGeneration) {
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(Date.now() * 0.001);
            ctx.strokeStyle = this.type.resourceGeneration.type === 'mass' ? '#888' : '#ff0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * size * 0.4, Math.sin(angle) * size * 0.4);
            }
            ctx.stroke();
            ctx.restore();
        }

        // Health bar
        if (this.hp < this.maxHp) {
            ctx.fillStyle = '#000';
            ctx.fillRect(screenX - size / 2, screenY - size / 2 - 10, size, 5);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(screenX - size / 2, screenY - size / 2 - 10, size * (this.hp / this.maxHp), 5);
        }

        // Production progress
        if (this.productionQueue.length > 0) {
            ctx.fillStyle = '#ff0';
            ctx.fillRect(screenX - size / 2, screenY + size / 2 + 5,
                size * (this.productionProgress / this.productionQueue[0].buildTime), 3);
        }

        // Commander indicator (Note: Commander is a Unit, defined in UNIT_TYPES.commander)
        // The check for BUILDING_TYPES.commander was removed as it's undefined.
        // If a specific "Command Center" building type is added later, its drawing logic would go here,
        // referencing its own type from BUILDING_TYPES.
    }
}

export { Building };
