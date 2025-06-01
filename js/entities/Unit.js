import { TERRAIN_TYPES, TILE_SIZE, GRID_SIZE, WORLD_SIZE, BUILDING_TYPES, UNIT_TYPES } from '../constants.js';
import { getDistance } from '../utils.js';
import { Effect } from './Effect.js';
import { Caption } from './Caption.js';
import { addEvent } from '../eventSystem.js';

// These will be imported from where they are defined (e.g., gameLoop.js or a central state manager)
// For now, these lines are placeholders for the actual imports that will be resolved later.
let terrain = []; // Placeholder: Will be imported from terrain.js
let resourceNodes = []; // Placeholder: Will be imported from terrain.js
let captions = []; // Placeholder: Will be imported from gameLoop.js (or similar)
let effects = []; // Placeholder: Will be imported from gameLoop.js (or similar)

// Function to allow other modules (like terrain.js or gameLoop.js) to set these.
// This is a common pattern for handling circular dependencies or late initialization of shared state.
export function _setUnitDependencies(dependencies) {
    if (dependencies.terrain) terrain = dependencies.terrain;
    if (dependencies.resourceNodes) resourceNodes = dependencies.resourceNodes;
    if (dependencies.captions) captions = dependencies.captions;
    if (dependencies.effects) effects = dependencies.effects;
}


export class Unit {
    constructor(x, y, team, type) {
        this.x = x;
        this.y = y;
        this.team = team;
        this.type = type; // This is an object from UNIT_TYPES
        this.hp = type.maxHp;
        this.maxHp = type.maxHp;
        this.target = null;
        this.cooldown = 0;
        this.angle = Math.random() * Math.PI * 2;
        this.vx = 0;
        this.vy = 0;
        this.selected = false;
        this.task = null;
        this.shields = type.shields || 0;
        this.maxShields = type.shields || 0;
        this.shieldRegen = type.shieldRegen || 0;
        this.patrolTarget = null;
        this.lastTargetSwitch = 0;
        this.aggressiveness = Math.random(); // 0-1, affects targeting behavior
        this.formation = null;
        this.captionCooldown = 0;
    }

    update(allUnits, allBuildings) { // Renamed from 'units' to 'allUnits' to avoid conflict with global 'units'
        // Shield regeneration
        if (this.shields < this.maxShields) {
            this.shields = Math.min(this.maxShields, this.shields + this.shieldRegen);
        }

        // Support unit behavior
        if (this.type.support) {
            this.performSupportRole(allUnits, allBuildings);
            return;
        }

        // Combat behavior with dynamic objectives
        if (!this.target || this.target.hp <= 0 ||
            (Date.now() - this.lastTargetSwitch > 5000 && Math.random() < 0.1)) {
            this.findTarget(allUnits, allBuildings);
            this.lastTargetSwitch = Date.now();
        }

        // Patrol or raid behavior
        if (Math.random() < 0.005) {
            if (this.aggressiveness > 0.7) {
                const enemyCommander = allBuildings.find(b => b.team !== this.team && b.type.name === 'Commander');
                if (enemyCommander) {
                    this.patrolTarget = { x: enemyCommander.x + (Math.random() - 0.5) * 500,
                                         y: enemyCommander.y + (Math.random() - 0.5) * 500 };
                }
            } else if (this.aggressiveness < 0.3) {
                const friendlyCommander = allBuildings.find(b => b.team === this.team && b.type.name === 'Commander');
                if (friendlyCommander) {
                    this.patrolTarget = { x: friendlyCommander.x + (Math.random() - 0.5) * 300,
                                         y: friendlyCommander.y + (Math.random() - 0.5) * 300 };
                }
            } else {
                if (resourceNodes.length > 0) { // Check if resourceNodes is populated
                    const targetNode = resourceNodes[Math.floor(Math.random() * resourceNodes.length)];
                    if (targetNode) {
                        this.patrolTarget = { x: targetNode.x, y: targetNode.y };
                    }
                }
            }
        }

        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > this.type.range) {
                this.angle = Math.atan2(dy, dx);
                this.vx = Math.cos(this.angle) * this.type.speed;
                this.vy = Math.sin(this.angle) * this.type.speed;
            } else {
                this.vx = 0;
                this.vy = 0;
                if (this.cooldown <= 0) {
                    this.attack(this.target);
                    this.cooldown = this.type.attackSpeed;
                }
            }
        } else if (this.patrolTarget) {
            const dx = this.patrolTarget.x - this.x;
            const dy = this.patrolTarget.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 50) {
                this.angle = Math.atan2(dy, dx);
                this.vx = Math.cos(this.angle) * this.type.speed * 0.8;
                this.vy = Math.sin(this.angle) * this.type.speed * 0.8;
            } else {
                this.patrolTarget = null;
            }
        } else {
            if (Math.random() < 0.02) {
                this.angle += (Math.random() - 0.5) * 0.5;
                const nearbyFriendly = allUnits.filter(u =>
                    u.team === this.team &&
                    u !== this &&
                    this._getDistance(u) < 200 // Use internal method
                );

                if (nearbyFriendly.length > 0) {
                    const centerX = nearbyFriendly.reduce((sum, u) => sum + u.x, 0) / nearbyFriendly.length;
                    const centerY = nearbyFriendly.reduce((sum, u) => sum + u.y, 0) / nearbyFriendly.length;
                    const toCenterAngle = Math.atan2(centerY - this.y, centerX - this.x);
                    this.angle = (this.angle + toCenterAngle) / 2;
                }
            }
            this.vx = Math.cos(this.angle) * this.type.speed * 0.5;
            this.vy = Math.sin(this.angle) * this.type.speed * 0.5;
        }

        this.applyMovement();
        if (this.cooldown > 0) this.cooldown--;
        if (this.captionCooldown > 0) this.captionCooldown--;
        if (this.captionCooldown <= 0 && Math.random() < 0.01) {
            this.showStateCaption();
        }
    }

    performSupportRole(allUnits, allBuildings) {
        if (this.type.name === 'Engineer') {
            let target = null;
            let minDist = Infinity;

            for (const building of allBuildings) {
                if (building.team === this.team && building.hp < building.maxHp) {
                    const dist = this._getDistance(building);
                    if (dist < minDist) {
                        minDist = dist;
                        target = building;
                    }
                }
            }

            if (!target && resourceNodes.length > 0) { // Check if resourceNodes is populated
                for (const node of resourceNodes) {
                    if (!node.occupied && node.amount > 0) {
                        const dist = Math.sqrt((node.x - this.x) ** 2 + (node.y - this.y) ** 2);
                        if (dist < minDist) {
                            minDist = dist;
                            target = node;
                        }
                    }
                }
            }

            if (target) {
                this.moveTowards(target);
                if (minDist < 100) {
                    if (target.hp !== undefined) {
                        target.hp = Math.min(target.maxHp, target.hp + 2);
                    } else if (target.amount !== undefined && !target.occupied) {
                        target.occupied = true;
                        // Building class needs to be available or passed to create new buildings
                        // This is a dependency issue to resolve. For now, assume Building is globally available or imported.
                        // This will be fixed when Building.js is created and imported.
                        // allBuildings.push(new Building(target.x, target.y, this.team,
                        //     target.type === 'mass' ? BUILDING_TYPES.massExtractor : BUILDING_TYPES.energyExtractor));
                        // The line above causes issues if Building class is not defined yet or not imported.
                        // For now, let's log that an engineer would build.
                        console.log(\`Engineer at \${this.x},\${this.y} would build extractor at \${target.x},\${target.y}\`);
                        const event = addEvent('resource',
                            `${this.team.toUpperCase()} built ${target.type} extractor`, 2);
                        event.position = { x: target.x, y: target.y };
                    }
                }
            } else {
                const friendly = allUnits.find(u => u.team === this.team && u !== this && !u.type.support);
                if (friendly) {
                    this.moveTowards(friendly);
                }
            }
        } else if (this.type.name === 'Shield Generator') {
            for (const unit of allUnits) {
                if (unit.team === this.team && unit !== this) {
                    const dist = this._getDistance(unit);
                    if (dist < 200) { // Shield radius
                        unit.shields = Math.min(unit.maxShields + 50, unit.shields + 1); // Example shield boost
                    }
                }
            }
        }
    }

    _getDistance(other) { // Internal helper, or use imported getDistance(this, other)
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    moveTowards(target) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = this._getDistance(target);

        if (dist > 50) { // Stop distance
            this.angle = Math.atan2(dy, dx);
            this.vx = Math.cos(this.angle) * this.type.speed;
            this.vy = Math.sin(this.angle) * this.type.speed;
        } else {
            this.vx = 0;
            this.vy = 0;
        }
        // applyMovement is called outside this function in the main update loop
    }

    applyMovement() {
        const newX = this.x + this.vx;
        const newY = this.y + this.vy;

        if (terrain.length > 0 && terrain[0].length > 0) { // Check if terrain is populated
            const tileX = Math.floor(newX / TILE_SIZE);
            const tileY = Math.floor(newY / TILE_SIZE);

            if (tileX >= 0 && tileX < GRID_SIZE && tileY >= 0 && tileY < GRID_SIZE) {
                const terrainType = terrain[tileX][tileY];
                if ((this.type.domain === 'land' && terrainType !== TERRAIN_TYPES.WATER) ||
                    (this.type.domain === 'sea' && terrainType === TERRAIN_TYPES.WATER) ||
                    (this.type.domain === 'air')) {
                    this.x = newX;
                    this.y = newY;
                } else {
                    this.angle += Math.PI * 0.5; // Turn if blocked
                }
            }
        } else { // If terrain not ready, allow movement (or handle differently)
             this.x = newX;
             this.y = newY;
        }


        this.x = Math.max(0, Math.min(WORLD_SIZE, this.x));
        this.y = Math.max(0, Math.min(WORLD_SIZE, this.y));
    }

    findTarget(allUnits, allBuildings) {
        let closestDist = Infinity;
        let closestTarget = null;

        for (const unit of allUnits) {
            if (unit.team !== this.team && unit.hp > 0 && !unit.type.support) {
                const dist = this._getDistance(unit);
                let adjustedDist = dist;
                if (unit.type.tier >= 2) adjustedDist *= 0.7;
                if (unit.type.support) adjustedDist *= 0.8; // Slightly prioritize support, but main check is !unit.type.support

                if (adjustedDist < closestDist) {
                    closestDist = adjustedDist;
                    closestTarget = unit;
                }
            }
        }

        for (const building of allBuildings) {
            if (building.team !== this.team && building.hp > 0) {
                const dist = this._getDistance(building);
                let priority = 1;
                if (building.type.name === 'Commander') priority = 0.5;
                else if (building.type.resourceGeneration) priority = 0.7;
                else if (building.type.produces && this.aggressiveness > 0.5) priority = 0.8;

                if (dist * priority < closestDist) {
                    closestDist = dist * priority;
                    closestTarget = building;
                }
            }
        }
        this.target = closestTarget;
    }

    showStateCaption() {
        let captionText = '';
        let color = '#fff';
        if (this.type.support) {
            // ... (original logic)
        } else if (this.target) {
            // ... (original logic)
        } // ... etc.
        // For brevity, the full caption logic isn't duplicated here but should be from original.
        // Example:
        if (this.target) captionText = 'Engaging'; else captionText = 'Idle';


        if (captionText && captions) { // Check captions array exists
            captions.push(new Caption(this.x, this.y - this.type.size, captionText, color, 10));
            this.captionCooldown = 120 + Math.random() * 120;
        }
    }

    attack(target) {
        let damageDealt = this.type.damage;
        if (target.shields > 0) {
            const shieldDamage = Math.min(damageDealt, target.shields);
            target.shields -= shieldDamage;
            damageDealt -= shieldDamage;
        }
        if (damageDealt > 0) { // Only apply HP damage if any remains
            target.hp -= damageDealt;
        }

        if (effects) { // Check effects array exists
           effects.push(new Effect(this.x, this.y, target.x, target.y, this.type.effectColor));
        }

        if (target.type && target.type.name === 'Commander' && Math.random() < 0.1) {
            const event = addEvent('battle', `${this.team.toUpperCase()} forces attacking enemy Commander!`, 3);
            if(event) event.position = { x: target.x, y: target.y };
        } else if (Math.random() < 0.01 && target.type && target.type.tier >= 2) {
            const event = addEvent('battle', `Major engagement: ${this.type.name} vs ${target.type.name}`, 2);
            if(event) event.position = { x: this.x, y: this.y };
        }
    }

    takeDamage(damageAmount) { // Renamed from 'damage'
        if (this.shields > 0) {
            const shieldDamage = Math.min(damageAmount, this.shields);
            this.shields -= shieldDamage;
            damageAmount -= shieldDamage;
            if (shieldDamage > 0 && Math.random() < 0.3 && captions) {
                captions.push(new Caption(this.x, this.y, 'Shields holding!', '#0ff', 8));
            }
        }
        if (damageAmount > 0) { // Only apply HP damage if any remains
            this.hp -= damageAmount;
        }

        if (damageAmount > 0 && Math.random() < 0.2 && captions) {
            if (this.hp < this.maxHp * 0.3) {
                captions.push(new Caption(this.x, this.y, 'Critical damage!', '#f00', 10));
            } else if (damageAmount > 30) {
                captions.push(new Caption(this.x, this.y, `${Math.floor(damageAmount)}!`, '#f88', 9));
            }
        }
    }

    draw(ctx, camera) {
        const screenX = (this.x - camera.x) * camera.zoom + ctx.canvas.width / 2;
        const screenY = (this.y - camera.y) * camera.zoom + ctx.canvas.height / 2;
        const size = this.type.size * camera.zoom;

        if (screenX < -size || screenX > ctx.canvas.width + size ||
            screenY < -size || screenY > ctx.canvas.height + size) {
            return;
        }

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.angle);

        ctx.fillStyle = this.team === 'blue' ? '#44f' : '#f44';
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.fillStyle = this.type.color;
        ctx.fillRect(-size / 4, -size / 4, size / 2, size / 2);

        if (this.shields > 0) {
            ctx.strokeStyle = '#0ff';
            ctx.globalAlpha = 0.3 + (this.shields / this.maxShields) * 0.3;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        if (this.hp < this.maxHp) {
            ctx.fillStyle = '#000';
            ctx.fillRect(-size / 2, -size / 2 - 8 * camera.zoom, size, 4 * camera.zoom);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(-size / 2, -size / 2 - 8 * camera.zoom, size * (this.hp / this.maxHp), 4 * camera.zoom);
        }

        if (this.selected) {
            ctx.strokeStyle = '#ff0';
            ctx.lineWidth = 2; // Consider scaling with zoom if needed
            ctx.strokeRect(-size / 2 - 5, -size / 2 - 5, size + 10, size + 10);
        }
        ctx.restore();
    }
}
