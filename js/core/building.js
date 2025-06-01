import { BUILDING_TYPES } from '../config/buildingTypes.js';
import { UNIT_TYPES } from '../config/unitTypes.js';
import { TILE_SIZE } from '../config/gameConstants.js'; // TILE_SIZE might be used for future drawing logic or helpers
// Global variables like 'resources', 'units', 'captions', 'addEvent'
// are accessed directly. This tight coupling will be addressed in later refactoring.

class Building {
    constructor(x, y, team, type) {
        this.x = x;
        this.y = y;
        this.team = team;
        this.type = type;
        this.hp = type.maxHp;
        this.maxHp = type.maxHp;
        this.productionQueue = [];
        this.productionProgress = 0;
        this.rallyx = x + 100;
        this.rallyy = y;
        this.shields = 0; // Buildings typically don't have shields by default in this design
        this.maxShields = 0; // Max shields
        this.captionCooldown = 0;
    }

    update(units, mainGameGlobals) { // Pass main game globals like resources, captions if needed
        // Resource generation
        if (this.type.resourceGeneration) {
            // Accessing global 'resources' directly for now
            mainGameGlobals.resources[this.team][this.type.resourceGeneration.type] += this.type.resourceGeneration.amount;
            mainGameGlobals.resources[this.team][this.type.resourceGeneration.type + 'Income'] =
                this.type.resourceGeneration.amount * 60; // Per minute display
        }

        // Auto-production with resource check
        if (this.type.produces && this.productionQueue.length === 0) {
            const unitTypesToBuild = this.type.produces.filter(unitType => {
                // Accessing global 'resources'
                return mainGameGlobals.resources[this.team].mass >= (unitType.cost?.mass || 0) &&
                       mainGameGlobals.resources[this.team].energy >= (unitType.cost?.energy || 0);
            });

            if (unitTypesToBuild.length > 0 && Math.random() < 0.02) { // Simplified condition to add to queue
                const unitType = unitTypesToBuild[Math.floor(Math.random() * unitTypesToBuild.length)];
                this.productionQueue.push(unitType);

                // Deduct resources
                if (unitType.cost) {
                    mainGameGlobals.resources[this.team].mass -= unitType.cost.mass || 0;
                    mainGameGlobals.resources[this.team].energy -= unitType.cost.energy || 0;
                }
            }
        }

        // Production progress
        if (this.productionQueue.length > 0) {
            this.productionProgress++;

            // Production caption
            if (this.captionCooldown <= 0 && Math.random() < 0.01) {
                const progress = Math.floor((this.productionProgress / this.productionQueue[0].buildTime) * 100);
                // Accessing global 'captions' and 'Caption' class
                mainGameGlobals.captions.push(new mainGameGlobals.Caption(this.x, this.y - this.type.size,
                    `Building ${this.productionQueue[0].name} ${progress}%`, '#ff0', 10));
                this.captionCooldown = 90;
            }

            if (this.productionProgress >= this.productionQueue[0].buildTime) {
                const unitType = this.productionQueue.shift();
                // Accessing global 'units' and 'Unit' class (Unit class will be imported later)
                const newUnit = new mainGameGlobals.Unit(this.rallyx, this.rallyy, this.team, unitType);
                mainGameGlobals.units.push(newUnit);
                this.productionProgress = 0;

                // Completion caption
                mainGameGlobals.captions.push(new mainGameGlobals.Caption(this.x, this.y - this.type.size,
                    `${unitType.name} ready!`, '#0f0', 12));

                if (unitType.name === 'Experimental' || unitType.tier === 3) {
                    // Accessing global 'addEvent'
                    const event = mainGameGlobals.addEvent('build',
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
