import { resources } from '../gameState.js'; // Assuming resources are part of gameState or a separate module
import { UNIT_TYPES } from '../constants.js';
import { Unit } from './Unit.js'; // For producing units
import { Caption } from './Caption.js';
import { addEvent } from '../eventSystem.js';

// These will be imported from where they are defined (e.g., gameLoop.js or a central state manager)
let units = []; // Placeholder: Will be imported
let captions = []; // Placeholder: Will be imported

export function _setBuildingDependencies(dependencies) {
    if (dependencies.units) units = dependencies.units;
    if (dependencies.captions) captions = dependencies.captions;
}

export class Building {
    constructor(x, y, team, type) {
        this.x = x;
        this.y = y;
        this.team = team;
        this.type = type; // This is an object from BUILDING_TYPES
        this.hp = type.maxHp;
        this.maxHp = type.maxHp;
        this.productionQueue = [];
        this.productionProgress = 0;
        this.rallyx = x + 100; // Default rally point
        this.rallyy = y;
        this.shields = type.shields || 0; // Assuming buildings can have shields
        this.maxShields = type.shields || 0;
        this.captionCooldown = 0;
    }

    update() { // Removed 'allUnits' as param, will use imported 'units'
        if (this.type.resourceGeneration) {
            resources[this.team][this.type.resourceGeneration.type] += this.type.resourceGeneration.amount;
            resources[this.team][this.type.resourceGeneration.type + 'Income'] =
                this.type.resourceGeneration.amount * 60;
        }

        if (this.type.produces && this.productionQueue.length === 0) {
            const producibleUnitTypes = this.type.produces.filter(unitType => {
                return resources[this.team].mass >= (unitType.cost?.mass || 0) &&
                       resources[this.team].energy >= (unitType.cost?.energy || 0);
            });

            if (producibleUnitTypes.length > 0 && Math.random() < 0.02) { // AI decision to build
                const unitTypeToBuild = producibleUnitTypes[Math.floor(Math.random() * producibleUnitTypes.length)];
                this.productionQueue.push(unitTypeToBuild);
                if (unitTypeToBuild.cost) {
                    resources[this.team].mass -= unitTypeToBuild.cost.mass || 0;
                    resources[this.team].energy -= unitTypeToBuild.cost.energy || 0;
                }
            }
        }

        if (this.productionQueue.length > 0) {
            this.productionProgress++;
            const currentProductionItem = this.productionQueue[0];

            if (this.captionCooldown <= 0 && Math.random() < 0.01 && captions) {
                const progress = Math.floor((this.productionProgress / currentProductionItem.buildTime) * 100);
                captions.push(new Caption(this.x, this.y - this.type.size,
                    `Building ${currentProductionItem.name} ${progress}%`, '#ff0', 10));
                this.captionCooldown = 90;
            }

            if (this.productionProgress >= currentProductionItem.buildTime) {
                const unitType = this.productionQueue.shift();
                if (units) { // Check units array exists
                    units.push(new Unit(this.rallyx, this.rallyy, this.team, unitType));
                }
                this.productionProgress = 0;

                if (captions) {
                    captions.push(new Caption(this.x, this.y - this.type.size,
                        `${unitType.name} ready!`, '#0f0', 12));
                }

                if (unitType.name === 'Experimental' || unitType.tier === 3) {
                    const event = addEvent('build',
                        `${this.team.toUpperCase()} completed ${unitType.name}!`, 3);
                    if(event) event.position = { x: this.x, y: this.y };
                }
            }
        }
        if (this.captionCooldown > 0) this.captionCooldown--;
    }

    draw(ctx, camera) {
        const screenX = (this.x - camera.x) * camera.zoom + ctx.canvas.width / 2;
        const screenY = (this.y - camera.y) * camera.zoom + ctx.canvas.height / 2;
        const size = this.type.size * camera.zoom;

        if (screenX < -size || screenX > ctx.canvas.width + size ||
            screenY < -size || screenY > ctx.canvas.height + size) {
            return;
        }

        ctx.fillStyle = this.team === 'blue' ? '#226' : '#622';
        ctx.fillRect(screenX - size / 2, screenY - size / 2, size, size);
        ctx.fillStyle = this.type.color;
        ctx.fillRect(screenX - size / 3, screenY - size / 3, size * 2 / 3, size * 2 / 3);

        if (this.type.resourceGeneration) {
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(Date.now() * 0.001);
            ctx.strokeStyle = this.type.resourceGeneration.type === 'mass' ? '#888' : '#ff0';
            ctx.lineWidth = 2 * camera.zoom;
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * size * 0.4, Math.sin(angle) * size * 0.4);
            }
            ctx.stroke();
            ctx.restore();
        }

        if (this.hp < this.maxHp) {
            ctx.fillStyle = '#000';
            ctx.fillRect(screenX - size / 2, screenY - size / 2 - 10 * camera.zoom, size, 5 * camera.zoom);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(screenX - size / 2, screenY - size / 2 - 10 * camera.zoom, size * (this.hp / this.maxHp), 5 * camera.zoom);
        }

        if (this.productionQueue.length > 0) {
            ctx.fillStyle = '#ff0';
            ctx.fillRect(screenX - size / 2, screenY + size / 2 + 5 * camera.zoom,
                size * (this.productionProgress / this.productionQueue[0].buildTime), 3 * camera.zoom);
        }

        if (this.type.name === 'Commander') {
            ctx.strokeStyle = '#ff0';
            ctx.lineWidth = 3 * camera.zoom;
            ctx.beginPath();
            ctx.arc(screenX, screenY, size * 0.7, 0, Math.PI * 2);
            ctx.stroke();
            if (this.shields > 0) {
                ctx.strokeStyle = '#0ff';
                ctx.globalAlpha = 0.5;
                ctx.lineWidth = 5 * camera.zoom;
                ctx.beginPath();
                ctx.arc(screenX, screenY, size * 0.9, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
    }
}
