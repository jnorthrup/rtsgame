import { UNIT_TYPES } from '../config/unitTypes.js';
import { BUILDING_TYPES } from '../config/buildingTypes.js';
import { WORLD_SIZE, TILE_SIZE, GRID_SIZE, TERRAIN_TYPES } from '../config/gameConstants.js';
// Note: Access to global arrays like 'captions', 'effects', 'buildings', 'resources', 'resourceNodes'
// and functions like 'addEvent' will be addressed in subsequent refactoring steps.
// For now, the Unit class methods will continue to reference these as if they are
// in the same scope or global.

class Unit {
            constructor(x, y, team, type) {
                this.x = x;
                this.y = y;
                this.team = team;
                this.type = type;
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
                this.constructionTask = null; // Initialize construction task
            }

            update(units, buildings) { // Pass other global arrays if they become local to main.js
                // Shield regeneration
                if (this.shields < this.maxShields) {
                    this.shields = Math.min(this.maxShields, this.shields + this.shieldRegen);
                }

                // Support unit behavior
                if (this.type.support) {
                    this.performSupportRole(units, buildings); // Potentially pass other globals like resourceNodes, resources, captions
                    return; // If ACU is building, it returns from performSupportRole, otherwise other support logic runs.
                }

                // Combat behavior with dynamic objectives
                if (!this.target || this.target.hp <= 0 ||
                    (Date.now() - this.lastTargetSwitch > 5000 && Math.random() < 0.1)) {
                    this.findTarget(units, buildings); // Pass other globals if needed
                    this.lastTargetSwitch = Date.now();
                }

                // Patrol or raid behavior
                if (Math.random() < 0.005) {
                    if (this.aggressiveness > 0.7) {
                        // Aggressive units seek enemy base
                        // This assumes `buildings` array is available in this scope or passed.
                        // If `UNIT_TYPES.commander` is used for comparison, it's fine.
                        const enemyCommanderBuilding = buildings.find(b => b.team !== this.team && b.type.name === 'Commander'); // This might refer to old building commander
                        const enemyCommanderUnit = units.find(u => u.team !== this.team && u.type === UNIT_TYPES.commander);


                        if (enemyCommanderUnit) {
                             this.patrolTarget = { x: enemyCommanderUnit.x + (Math.random() - 0.5) * 500,
                                                 y: enemyCommanderUnit.y + (Math.random() - 0.5) * 500 };
                        } else if (enemyCommanderBuilding) { // Fallback for old logic if any commander buildings still exist
                             this.patrolTarget = { x: enemyCommanderBuilding.x + (Math.random() - 0.5) * 500,
                                                 y: enemyCommanderBuilding.y + (Math.random() - 0.5) * 500 };
                        }
                    } else if (this.aggressiveness < 0.3) {
                        // Defensive units patrol home base
                        const friendlyCommanderUnit = units.find(u => u.team === this.team && u.type === UNIT_TYPES.commander);
                        const friendlyCommanderBuilding = buildings.find(b => b.team === this.team && b.type.name === 'Commander'); // Fallback

                        if (friendlyCommanderUnit) {
                            this.patrolTarget = { x: friendlyCommanderUnit.x + (Math.random() - 0.5) * 300,
                                                 y: friendlyCommanderUnit.y + (Math.random() - 0.5) * 300 };
                        } else if (friendlyCommanderBuilding) {
                             this.patrolTarget = { x: friendlyCommanderBuilding.x + (Math.random() - 0.5) * 300,
                                                 y: friendlyCommanderBuilding.y + (Math.random() - 0.5) * 300 };
                        }
                    } else {
                        // Neutral units patrol resource points (assumes resourceNodes is global or passed)
                        if (resourceNodes && resourceNodes.length > 0) {
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
                            this.attack(this.target); // Assumes 'effects' is global or passed for new Effect
                            this.cooldown = this.type.attackSpeed;
                        }
                    }
                } else if (this.patrolTarget) {
                    // Move to patrol target
                    const dx = this.patrolTarget.x - this.x;
                    const dy = this.patrolTarget.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist > 50) {
                        this.angle = Math.atan2(dy, dx);
                        this.vx = Math.cos(this.angle) * this.type.speed * 0.8;
                        this.vy = Math.sin(this.angle) * this.type.speed * 0.8;
                    } else {
                        this.patrolTarget = null; // Reached patrol point
                    }
                } else {
                    // Wander behavior with formation tendency
                    if (Math.random() < 0.02) {
                        this.angle += (Math.random() - 0.5) * 0.5;

                        const nearbyFriendly = units.filter(u =>
                            u.team === this.team &&
                            u !== this &&
                            this.getDistance(u) < 200
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

                this.applyMovement(); // Uses TILE_SIZE, GRID_SIZE, terrain (global or passed)

                if (this.cooldown > 0) this.cooldown--;
                if (this.captionCooldown > 0) this.captionCooldown--;

                if (this.captionCooldown <= 0 && Math.random() < 0.01) {
                    this.showStateCaption(); // Assumes 'captions' is global or passed for new Caption
                }
            }

            performSupportRole(units, buildings) { // Assumes globals: UNIT_TYPES, resources, BUILDING_TYPES, TILE_SIZE, GRID_SIZE, terrain, resourceNodes, captions, addEvent
                if (this.type === UNIT_TYPES.commander) {
                    if (!this.constructionTask && this.type.buildList && this.type.buildList.length > 0) {
                        const buildingToBuildType = this.type.buildList[0];

                        if (buildingToBuildType && resources[this.team].mass >= buildingToBuildType.cost.mass &&
                            resources[this.team].energy >= buildingToBuildType.cost.energy) {

                            const buildOffsets = [
                                { dx: 100, dy: 0 }, { dx: -100, dy: 0 },
                                { dx: 0, dy: 100 }, { dx: 0, dy: -100 },
                                { dx: 150, dy: 150 }, { dx: -150, dy: -150 }
                            ];

                            for (const offset of buildOffsets) {
                                const buildX = this.x + offset.dx;
                                const buildY = this.y + offset.dy;
                                const tileX = Math.floor(buildX / TILE_SIZE);
                                const tileY = Math.floor(buildY / TILE_SIZE);

                                if (tileX >= 0 && tileX < GRID_SIZE && tileY >= 0 && tileY < GRID_SIZE &&
                                    terrain[tileX][tileY] === TERRAIN_TYPES.LAND) {

                                    let isSpotClear = true;
                                    for (const b of buildings) {
                                        const dist = Math.sqrt((b.x - buildX)**2 + (b.y - buildY)**2);
                                        if (dist < (b.type.size / 2 + buildingToBuildType.size / 2)) {
                                            isSpotClear = false;
                                            break;
                                        }
                                    }

                                    if (isSpotClear) {
                                        this.constructionTask = {
                                            targetX: buildX,
                                            targetY: buildY,
                                            type: buildingToBuildType,
                                            progress: 0,
                                            buildingStarted: false
                                        };
                                        console.log(`${this.team} ACU starting task to build ${buildingToBuildType.name} at ${buildX.toFixed(0)},${buildY.toFixed(0)}`);
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    if (this.constructionTask) {
                        if (!this.constructionTask.buildingStarted) {
                            const targetPos = { x: this.constructionTask.targetX, y: this.constructionTask.targetY };
                            const distToSite = this.getDistance(targetPos);
                            const requiredDist = (this.constructionTask.type.size / 2) + (this.type.size / 2) + 20;

                            if (distToSite > requiredDist) {
                                this.moveTowards(targetPos);
                            } else {
                                resources[this.team].mass -= this.constructionTask.type.cost.mass;
                                resources[this.team].energy -= this.constructionTask.type.cost.energy;
                                this.constructionTask.buildingStarted = true;
                                this.vx = 0; this.vy = 0;
                                captions.push(new Caption(this.constructionTask.targetX, this.constructionTask.targetY, `Constructing ${this.constructionTask.type.name}`, '#0f0', 10));
                                console.log(`${this.team} ACU arrived at site, starting construction of ${this.constructionTask.type.name}`);
                            }
                        } else {
                            this.constructionTask.progress += (this.type.buildRate || 1.0);
                             if (this.captionCooldown <= 0 && Math.random() < 0.05) {
                                const progressPercent = Math.floor((this.constructionTask.progress / this.constructionTask.type.buildTime) * 100);
                                captions.push(new Caption(this.x, this.y - this.type.size -10, `Build: ${progressPercent}%`, '#FFF', 8));
                                this.captionCooldown = 30;
                            }

                            if (this.constructionTask.progress >= this.constructionTask.type.buildTime) {
                                const newBuilding = new Building(this.constructionTask.targetX, this.constructionTask.targetY, this.team, this.constructionTask.type);
                                buildings.push(newBuilding); // Assumes 'Building' class is available
                                addEvent('build', `${this.team.toUpperCase()} ACU completed ${this.constructionTask.type.name}!`, 2);
                                console.log(`${this.team} ACU completed ${this.constructionTask.type.name}`);
                                this.constructionTask = null;
                            }
                        }
                        return;
                    }
                } else if (this.type.name === 'Engineer') {
                    let target = null;
                    let minDist = Infinity;

                    for (const building of buildings) {
                        if (building.team === this.team && building.hp < building.maxHp) {
                            const dist = this.getDistance(building);
                            if (dist < minDist) {
                                minDist = dist;
                                target = building;
                            }
                        }
                    }

                    if (!target) {
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
                                buildings.push(new Building(target.x, target.y, this.team,
                                    target.type === 'mass' ? BUILDING_TYPES.massExtractor : BUILDING_TYPES.energyExtractor));
                                const event = addEvent('resource',
                                    `${this.team.toUpperCase()} built ${target.type} extractor`, 2);
                                event.position = { x: target.x, y: target.y };
                            }
                        }
                    } else {
                        const friendly = units.find(u => u.team === this.team && u !== this && !u.type.support);
                        if (friendly) {
                            this.moveTowards(friendly);
                        }
                    }
                } else if (this.type.name === 'Shield Generator') {
                    for (const unit of units) {
                        if (unit.team === this.team && unit !== this) {
                            const dist = this.getDistance(unit);
                            if (dist < 200) {
                                unit.shields = Math.min(unit.maxShields + 50, unit.shields + 1);
                            }
                        }
                    }
                }
            }

            moveTowards(target) {
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 50) { // Keep a small distance, or use target.type.size if available
                    this.angle = Math.atan2(dy, dx);
                    this.vx = Math.cos(this.angle) * this.type.speed;
                    this.vy = Math.sin(this.angle) * this.type.speed;
                } else {
                    this.vx = 0;
                    this.vy = 0;
                }

                this.applyMovement();
            }

            applyMovement() {
                const newX = this.x + this.vx;
                const newY = this.y + this.vy;
                const tileX = Math.floor(newX / TILE_SIZE);
                const tileY = Math.floor(newY / TILE_SIZE);

                if (tileX >= 0 && tileX < GRID_SIZE && tileY >= 0 && tileY < GRID_SIZE && terrain[tileX]) { // Added terrain[tileX] check
                    const terrainType = terrain[tileX][tileY];

                    if ((this.type.domain === 'land' && terrainType !== TERRAIN_TYPES.WATER) ||
                        (this.type.domain === 'sea' && terrainType === TERRAIN_TYPES.WATER) ||
                        (this.type.domain === 'air')) {
                        this.x = newX;
                        this.y = newY;
                    } else {
                        this.angle += Math.PI * 0.5; // Turn away from invalid terrain
                    }
                }

                this.x = Math.max(0, Math.min(WORLD_SIZE, this.x));
                this.y = Math.max(0, Math.min(WORLD_SIZE, this.y));
            }

            findTarget(units, buildings) { // Pass other globals if needed
                let closestDist = Infinity;
                let closest = null;

                for (const unit of units) {
                    if (unit.team !== this.team && unit.hp > 0 && !unit.type.support) {
                        const dist = this.getDistance(unit);
                        let adjustedDist = dist;
                        if (unit.type.tier >= 2) adjustedDist *= 0.7;
                        if (unit.type.support) adjustedDist *= 0.8;

                        if (adjustedDist < closestDist) {
                            closestDist = adjustedDist;
                            closest = unit;
                        }
                    }
                }

                for (const building of buildings) {
                    if (building.team !== this.team && building.hp > 0) {
                        const dist = this.getDistance(building);
                        let priority = 1;

                        if (building.type.name === 'Commander') priority = 0.5;
                        else if (building.type.resourceGeneration) priority = 0.7;
                        else if (building.type.produces && this.aggressiveness > 0.5) priority = 0.8;

                        if (dist * priority < closestDist) {
                            closestDist = dist * priority;
                            closest = building;
                        }
                    }
                }
                this.target = closest;
            }

            getDistance(other) {
                const dx = other.x - this.x;
                const dy = other.y - this.y;
                return Math.sqrt(dx * dx + dy * dy);
            }

            showStateCaption() { // Assumes 'captions' is global or passed
                let caption = '';
                let color = '#fff';

                if (this.type.support) {
                     if (this.type === UNIT_TYPES.commander && this.constructionTask) {
                        if (this.constructionTask.buildingStarted) {
                             const progressPercent = Math.floor((this.constructionTask.progress / this.constructionTask.type.buildTime) * 100);
                             caption = `Build: ${progressPercent}%`; color = '#0f0';
                        } else {
                            caption = `Moving to build`; color = '#ff0';
                        }
                    } else if (this.type.name === 'Engineer') {
                        caption = this.target ? 'Repairing' : 'Seeking resources';
                        color = '#0f0';
                    } else if (this.type.name === 'Shield Generator') {
                        caption = 'Projecting shields';
                        color = '#0ff';
                    }
                } else if (this.target) {
                    if (this.getDistance(this.target) > this.type.range) {
                        caption = 'Engaging';
                        color = '#f88';
                    } else {
                        caption = 'Firing!';
                        color = '#f00';
                    }
                } else if (this.patrolTarget) {
                    if (this.aggressiveness > 0.7) {
                        caption = 'Raiding';
                        color = '#f80';
                    } else if (this.aggressiveness < 0.3) {
                        caption = 'Defending';
                        color = '#88f';
                    } else {
                        caption = 'Patrolling';
                        color = '#ff0';
                    }
                } else {
                    caption = 'Searching';
                    color = '#888';
                }

                if (caption) {
                    captions.push(new Caption(this.x, this.y - this.type.size, caption, color, 10));
                    this.captionCooldown = 120 + Math.random() * 120;
                }
            }

            attack(target) { // Assumes 'effects' is global or passed
                let damage = this.type.damage;
                if (target.shields > 0) {
                    const shieldDamage = Math.min(damage, target.shields);
                    target.shields -= shieldDamage;
                    damage -= shieldDamage;
                }
                target.hp -= damage;

                effects.push(new Effect(this.x, this.y, target.x, target.y, this.type.effectColor));

                if (target.type && target.type.name === 'Commander' && Math.random() < 0.1) { // Check target.type first
                    const event = addEvent('battle',
                        `${this.team.toUpperCase()} forces attacking enemy Commander!`, 3);
                    event.position = { x: target.x, y: target.y };
                } else if (Math.random() < 0.01 && target.type && target.type.tier >= 2) { // Check target.type first
                    const event = addEvent('battle',
                        `Major engagement: ${this.type.name} vs ${target.type.name}`, 2);
                    event.position = { x: this.x, y: this.y };
                }
            }

            takeDamage(damage) { // Assumes 'captions' is global or passed
                if (this.shields > 0) {
                    const shieldDamage = Math.min(damage, this.shields);
                    this.shields -= shieldDamage;
                    damage -= shieldDamage;

                    if (shieldDamage > 0 && Math.random() < 0.3) {
                        captions.push(new Caption(this.x, this.y, 'Shields holding!', '#0ff', 8));
                    }
                }
                this.hp -= damage;

                if (damage > 0 && Math.random() < 0.2) {
                    if (this.hp < this.maxHp * 0.3) {
                        captions.push(new Caption(this.x, this.y, 'Critical damage!', '#f00', 10));
                    } else if (damage > 30) {
                        captions.push(new Caption(this.x, this.y, `${Math.floor(damage)}!`, '#f88', 9));
                    }
                }
            }

            draw(ctx, camera) {
                const screenX = (this.x - camera.x) * camera.zoom + canvas.width / 2;
                const screenY = (this.y - camera.y) * camera.zoom + canvas.height / 2;
                const size = this.type.size * camera.zoom;

                if (screenX < -size || screenX > canvas.width + size ||
                    screenY < -size || screenY > canvas.height + size) {
                    return;
                }

                ctx.save();
                ctx.translate(screenX, screenY);
                ctx.rotate(this.angle);

                ctx.fillStyle = this.team === 'blue' ? '#44f' : '#f44';
                ctx.fillRect(-size/2, -size/2, size, size);

                ctx.fillStyle = this.type.color;
                ctx.fillRect(-size/4, -size/4, size/2, size/2);

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
                    ctx.fillRect(-size/2, -size/2 - 8, size, 4);
                    ctx.fillStyle = '#0f0';
                    ctx.fillRect(-size/2, -size/2 - 8, size * (this.hp / this.maxHp), 4);
                }

                if (this.selected) {
                    ctx.strokeStyle = '#ff0';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(-size/2 - 5, -size/2 - 5, size + 10, size + 10);
                }

                ctx.restore();
            }
        }

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
                this.shields = 0;
                this.maxShields = 0;
                this.captionCooldown = 0;
            }

            update(units) { // Assumes globals: resources, UNIT_TYPES, captions, addEvent
                if (this.type.resourceGeneration) {
                    resources[this.team][this.type.resourceGeneration.type] += this.type.resourceGeneration.amount;
                    resources[this.team][this.type.resourceGeneration.type + 'Income'] =
                        this.type.resourceGeneration.amount * 60;
                }

                if (this.type.produces && this.productionQueue.length === 0) {
                    const unitTypes = this.type.produces.filter(unitType => {
                        return resources[this.team].mass >= (unitType.cost?.mass || 0) &&
                               resources[this.team].energy >= (unitType.cost?.energy || 0);
                    });

                    if (unitTypes.length > 0 && Math.random() < 0.02) {
                        const unitType = unitTypes[Math.floor(Math.random() * unitTypes.length)];
                        this.productionQueue.push(unitType);

                        if (unitType.cost) {
                            resources[this.team].mass -= unitType.cost.mass || 0;
                            resources[this.team].energy -= unitType.cost.energy || 0;
                        }
                    }
                }

                if (this.productionQueue.length > 0) {
                    this.productionProgress++;

                    if (this.captionCooldown <= 0 && Math.random() < 0.01) {
                        const progress = Math.floor((this.productionProgress / this.productionQueue[0].buildTime) * 100);
                        captions.push(new Caption(this.x, this.y - this.type.size,
                            `Building ${this.productionQueue[0].name} ${progress}%`, '#ff0', 10));
                        this.captionCooldown = 90;
                    }

                    if (this.productionProgress >= this.productionQueue[0].buildTime) {
                        const unitType = this.productionQueue.shift();
                        const unit = new Unit(this.rallyx, this.rallyy, this.team, unitType); // Assumes Unit class is available
                        units.push(unit);
                        this.productionProgress = 0;

                        captions.push(new Caption(this.x, this.y - this.type.size,
                            `${unitType.name} ready!`, '#0f0', 12));

                        if (unitType.name === 'Experimental' || unitType.tier === 3) {
                            const event = addEvent('build',
                                `${this.team.toUpperCase()} completed ${unitType.name}!`, 3);
                            event.position = { x: this.x, y: this.y };
                        }
                    }
                }

                if (this.captionCooldown > 0) this.captionCooldown--;
            }

            draw(ctx, camera) {
                const screenX = (this.x - camera.x) * camera.zoom + canvas.width / 2;
                const screenY = (this.y - camera.y) * camera.zoom + canvas.height / 2;
                const size = this.type.size * camera.zoom;

                if (screenX < -size || screenX > canvas.width + size ||
                    screenY < -size || screenY > canvas.height + size) {
                    return;
                }

                ctx.fillStyle = this.team === 'blue' ? '#226' : '#622';
                ctx.fillRect(screenX - size/2, screenY - size/2, size, size);

                ctx.fillStyle = this.type.color;
                ctx.fillRect(screenX - size/3, screenY - size/3, size*2/3, size*2/3);

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

                if (this.hp < this.maxHp) {
                    ctx.fillStyle = '#000';
                    ctx.fillRect(screenX - size/2, screenY - size/2 - 10, size, 5);
                    ctx.fillStyle = '#0f0';
                    ctx.fillRect(screenX - size/2, screenY - size/2 - 10, size * (this.hp / this.maxHp), 5);
                }

                if (this.productionQueue.length > 0) {
                    ctx.fillStyle = '#ff0';
                    ctx.fillRect(screenX - size/2, screenY + size/2 + 5,
                                size * (this.productionProgress / this.productionQueue[0].buildTime), 3);
                }

                if (this.type.name === 'Commander') { // This specific check might be for old building-based commander
                    ctx.strokeStyle = '#ff0';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, size * 0.7, 0, Math.PI * 2);
                    ctx.stroke();

                    if (this.shields > 0) {
                        ctx.strokeStyle = '#0ff';
                        ctx.globalAlpha = 0.5;
                        ctx.lineWidth = 5;
                        ctx.beginPath();
                        ctx.arc(screenX, screenY, size * 0.9, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.globalAlpha = 1;
                    }
                }
            }
        }

        // Game entities
        let units = [];
        let buildings = [];
        let effects = [];
        let captions = [];

        // Caption class for flyover text
        class Caption {
            constructor(x, y, text, color = '#fff', size = 12) {
                this.x = x;
                this.y = y;
                this.text = text;
                this.color = color;
                this.size = size;
                this.life = 60; // 1 second
                this.vy = -0.5; // Float upward
                this.alpha = 1;
            }

            update() {
                this.y += this.vy;
                this.life--;
                this.alpha = Math.min(1, this.life / 20);
            }

            draw(ctx, camera) {
                const screenX = (this.x - camera.x) * camera.zoom + canvas.width / 2;
                const screenY = (this.y - camera.y) * camera.zoom + canvas.height / 2;

                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = this.color;
                ctx.font = `${this.size * camera.zoom}px Arial`;
                ctx.textAlign = 'center';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.strokeText(this.text, screenX, screenY);
                ctx.fillText(this.text, screenX, screenY);
                ctx.restore();
            }
        }

        // Initialize game
        function initGame() {
            units = [];
            buildings = [];
            effects = [];
            captions = [];
            gameState.winner = null;
            gameState.gameTime = 0;
            gameState.events = [];

            // Reset resources
            resources.blue = { mass: 1000, energy: 1000, massIncome: 0, energyIncome: 0 };
            resources.red = { mass: 1000, energy: 1000, massIncome: 0, energyIncome: 0 };

            let blueStart = null;
            let redStart = null;
            const MAX_INIT_RETRIES = 10; // Max retries for finding start positions
            const COMMANDER_START_AREA_SIZE = 5; // Commanders need a 5x5 clear land area

            console.log("Initializing game, attempting to generate terrain and find starting positions...");

            for (let i = 0; i < MAX_INIT_RETRIES; i++) {
                console.log(`Attempt ${i + 1}/${MAX_INIT_RETRIES} to generate terrain and find start spots.`);
                generateTerrain(); // This function now handles its own land percentage retries

                blueStart = findLandPosition(WORLD_SIZE * 0.2, WORLD_SIZE * 0.5, COMMANDER_START_AREA_SIZE);
                redStart = findLandPosition(WORLD_SIZE * 0.8, WORLD_SIZE * 0.5, COMMANDER_START_AREA_SIZE);

                if (blueStart && redStart) {
                    console.log(`Successfully found starting positions for both teams after ${i + 1} attempt(s).`);
                    break;
                } else {
                    console.warn(`Could not find suitable ${COMMANDER_START_AREA_SIZE}x${COMMANDER_START_AREA_SIZE} starting areas. Blue found: ${!!blueStart}, Red found: ${!!redStart}. Regenerating terrain...`);
                }
            }

            if (!blueStart) {
                console.error(`CRITICAL: Failed to find suitable starting position for BLUE team after ${MAX_INIT_RETRIES} attempts. Placing at default fallback.`);
                blueStart = { x: WORLD_SIZE * 0.2, y: WORLD_SIZE * 0.5 }; // Fallback
            }
            if (!redStart) {
                console.error(`CRITICAL: Failed to find suitable starting position for RED team after ${MAX_INIT_RETRIES} attempts. Placing at default fallback.`);
                redStart = { x: WORLD_SIZE * 0.8, y: WORLD_SIZE * 0.5 }; // Fallback
            }

            // Spawn ACU units
            if (UNIT_TYPES.commander) {
                units.push(new Unit(blueStart.x, blueStart.y, 'blue', UNIT_TYPES.commander));
                units.push(new Unit(redStart.x, redStart.y, 'red', UNIT_TYPES.commander));
                addEvent('strategic', 'Commanders deployed!', 3);
            } else {
                console.error("UNIT_TYPES.commander is not defined! Cannot spawn ACUs.");
            }

            // Comment out old commander building spawning
            // buildings.push(new Building(blueStart.x, blueStart.y, 'blue', BUILDING_TYPES.commander));
            // buildings.push(new Building(redStart.x, redStart.y, 'red', BUILDING_TYPES.commander));

            // Comment out initial factory placement
            // console.log("Placing initial factories...");
            // placeFactoriesAroundCommander(blueStart, 'blue');
            // placeFactoriesAroundCommander(redStart, 'red');

            // Comment out initial engineer spawning
            // units.push(new Unit(blueStart.x + 50, blueStart.y, 'blue', UNIT_TYPES.engineer));
            // units.push(new Unit(blueStart.x - 50, blueStart.y, 'blue', UNIT_TYPES.engineer));
            // units.push(new Unit(redStart.x + 50, redStart.y, 'red', UNIT_TYPES.engineer));
            // units.push(new Unit(redStart.x - 50, redStart.y, 'red', UNIT_TYPES.engineer));

            // Center camera
            camera.x = WORLD_SIZE / 2;
            camera.y = WORLD_SIZE / 2;
            camera.zoom = 0.5;

            addEvent('strategic', 'Battle commenced!', 3);
        }

        function isAreaClear(gridX, gridY, size, terrainType) {
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    const x = gridX + i;
                    const y = gridY + j;
                    // Check bounds and terrain type
                    if (x >= GRID_SIZE || y >= GRID_SIZE || !terrain[x] || terrain[x][y] === undefined || terrain[x][y] !== terrainType) {
                        return false;
                    }
                }
            }
            return true;
        }

        function findLandPosition(targetX, targetY, minAreaSize = 3) {
            let bestCandidate = null;
            let minDist = Infinity;

            for (let x = 0; x <= GRID_SIZE - minAreaSize; x++) { // Iterate to ensure area fits
                for (let y = 0; y <= GRID_SIZE - minAreaSize; y++) { // Iterate to ensure area fits
                    // Check the top-left tile first for efficiency
                    if (terrain[x] && terrain[x][y] === TERRAIN_TYPES.LAND) {
                        if (isAreaClear(x, y, minAreaSize, TERRAIN_TYPES.LAND)) {
                            // Calculate the center of the found clear area
                            const areaCenterX = (x + minAreaSize / 2) * TILE_SIZE;
                            const areaCenterY = (y + minAreaSize / 2) * TILE_SIZE;

                            const dist = Math.sqrt((areaCenterX - targetX) ** 2 + (areaCenterY - targetY) ** 2);

                            if (dist < minDist) {
                                minDist = dist;
                                bestCandidate = { x: areaCenterX, y: areaCenterY };
                            }
                        }
                    }
                }
            }
            return bestCandidate; // Returns null if no suitable area is found
        }

        function findWaterPosition(targetX, targetY) {
            let bestX = targetX;
            let bestY = targetY;
            let minDist = Infinity;

            for (let x = 0; x < GRID_SIZE; x++) {
                for (let y = 0; y < GRID_SIZE; y++) {
                    if (terrain[x][y] === TERRAIN_TYPES.WATER) {
                        const worldX = x * TILE_SIZE + TILE_SIZE / 2;
                        const worldY = y * TILE_SIZE + TILE_SIZE / 2;
                        const dist = Math.sqrt((worldX - targetX) ** 2 + (worldY - targetY) ** 2);
                        if (dist < minDist) {
                            minDist = dist;
                            bestX = worldX;
                            bestY = worldY;
                        }
                    }
                }
            }

            return { x: bestX, y: bestY };
        }

        function placeFactoriesAroundCommander(commanderPos, team) {
            const offset = 150; // Preferred distance from commander for factories
            const factoryAreaSize = 3; // Factories need a 3x3 clear land area
            let landPos, airPos, navalPos, energyPos1;

            // Land factory
            landPos = findLandPosition(commanderPos.x + offset, commanderPos.y, factoryAreaSize);
            if (!landPos) landPos = findLandPosition(commanderPos.x - offset, commanderPos.y, factoryAreaSize); // Try other side
            if (!landPos) {
                console.warn(`Could not find ideal spot for Land Factory for ${team}, placing at fallback.`);
                landPos = { x: commanderPos.x + offset, y: commanderPos.y };
            }
            buildings.push(new Building(landPos.x, landPos.y, team, BUILDING_TYPES.landFactory));

            // Air factory
            airPos = findLandPosition(commanderPos.x - offset, commanderPos.y - offset, factoryAreaSize); // Try diagonal
            if (!airPos) airPos = findLandPosition(commanderPos.x + offset, commanderPos.y + offset, factoryAreaSize); // Try other diagonal
            if (!airPos) {
                console.warn(`Could not find ideal spot for Air Factory for ${team}, placing at fallback.`);
                airPos = { x: commanderPos.x - offset, y: commanderPos.y - offset };
            }
            buildings.push(new Building(airPos.x, airPos.y, team, BUILDING_TYPES.airFactory));

            // Naval factory (if water nearby)
            navalPos = findWaterPosition(commanderPos.x, commanderPos.y + offset * 1.5); // Place further out
            if (navalPos && navalPos.x !== undefined && navalPos.y !== undefined) { // Check if a valid water position was found
                 const distToCommander = Math.sqrt((navalPos.x - commanderPos.x) ** 2 + (navalPos.y - commanderPos.y) ** 2);
                 if (distToCommander < 700) { // Ensure it's reasonably close
                    buildings.push(new Building(navalPos.x, navalPos.y, team, BUILDING_TYPES.navalFactory));
                 } else {
                    console.log(`Naval factory position for ${team} was too far from commander (${distToCommander.toFixed(0)} units), skipping.`);
                 }
            } else {
                console.log(`No suitable water position found for Naval factory for ${team}.`);
            }

            // Energy plants
            energyPos1 = findLandPosition(commanderPos.x, commanderPos.y - offset, factoryAreaSize);
            if (!energyPos1) {
                console.warn(`Could not find ideal spot for Energy Plant for ${team}, placing at fallback.`);
                energyPos1 = { x: commanderPos.x, y: commanderPos.y - offset};
            }
            buildings.push(new Building(energyPos1.x, energyPos1.y, team, BUILDING_TYPES.energyExtractor));
        }

        // Game loop
        function update() {
            if (gameState.paused || gameState.winner) return;

            gameState.gameTime += 1/60;

            // Update auto camera
            if (camera.autoCamera && camera.cameraTarget && camera.cameraTimer > 0) {
                const dx = camera.cameraTarget.x - camera.x;
                const dy = camera.cameraTarget.y - camera.y;
                camera.x += dx * 0.1;
                camera.y += dy * 0.1;
                camera.cameraTimer--;

                if (camera.cameraTimer <= 0) {
                    camera.cameraTarget = null;
                }
            }

            // Random event focus
            if (camera.autoCamera && !camera.cameraTarget && Math.random() < 0.005) {
                // Focus on random combat or building
                const targets = [...units.filter(u => u.target), ...buildings];
                if (targets.length > 0) {
                    const target = targets[Math.floor(Math.random() * targets.length)];
                    camera.cameraTarget = { x: target.x, y: target.y };
                    camera.cameraTimer = 180;
                }
            }

            // Update units
            for (let i = units.length - 1; i >= 0; i--) {
                const unit = units[i];
                unit.update(units, buildings);

                if (unit.hp <= 0) {
                    // Check if the destroyed unit is an ACU
                    if (unit.type === UNIT_TYPES.commander) {
                        gameState.winner = unit.team === 'blue' ? 'RED' : 'BLUE';
                        captions.push(new Caption(unit.x, unit.y, `${unit.team.toUpperCase()} COMMANDER DESTROYED!`, '#ff0', 20));
                        const event = addEvent('strategic', `${gameState.winner} achieves victory! ${unit.team.toUpperCase()} ACU eliminated.`, 3);
                        event.position = { x: unit.x, y: unit.y };
                        // No need to splice here if the game ends, but if we want post-victory gameplay, keep splice.
                        // For now, the main update loop will stop if gameState.winner is set.
                    } else if (unit.type.tier >= 2) { // Log destruction of other significant units
                        const event = addEvent('battle',
                            `${unit.team.toUpperCase()} ${unit.type.name} destroyed!`, 2);
                        event.position = { x: unit.x, y: unit.y };
                    }

                    units.splice(i, 1);
                    if (unit === gameState.selectedUnit) {
                        gameState.selectedUnit = null;
                        gameState.fpvMode = false;
                    }
                }
            }

            // Update buildings
            for (let i = buildings.length - 1; i >= 0; i--) {
                const building = buildings[i];
                building.update(units);

                if (building.hp <= 0) {
                    // Check if commander died
                    if (building.type.name === 'Commander') { // This check is now effectively dead code as Commander is a Unit
                        gameState.winner = building.team === 'blue' ? 'RED' : 'BLUE';
                        captions.push(new Caption(building.x, building.y, 'COMMANDER DESTROYED!', '#ff0', 20));
                        const event = addEvent('strategic',
                            `${gameState.winner} achieves victory!`, 3);
                        event.position = { x: building.x, y: building.y };
                    } else if (building.type.produces || building.type.resourceGeneration) {
                        captions.push(new Caption(building.x, building.y, 'Structure lost!', '#f88', 12));
                        const event = addEvent('battle',
                            `${building.team.toUpperCase()} ${building.type.name} destroyed!`, 2);
                        event.position = { x: building.x, y: building.y };
                    }
                    buildings.splice(i, 1);
                }
            }

            // Update effects
            for (let i = effects.length - 1; i >= 0; i--) {
                effects[i].update();
                if (effects[i].life <= 0 && effects[i].particles.every(p => p.life <= 0)) {
                    effects.splice(i, 1);
                }
            }

            // Update captions
            for (let i = captions.length - 1; i >= 0; i--) {
                captions[i].update();
                if (captions[i].life <= 0) {
                    captions.splice(i, 1);
                }
            }

            // Strategic AI decisions
            if (Math.random() < 0.01) {
                makeStrategicDecisions();
            }

            // Coordinate group attacks
            if (Math.random() < 0.005) {
                coordinateAttacks();
            }

            // Update camera for FPV mode
            if (gameState.fpvMode && gameState.selectedUnit) {
                camera.x = gameState.selectedUnit.x;
                camera.y = gameState.selectedUnit.y;
                camera.zoom = 10;
            }
        }

        function makeStrategicDecisions() {
            // Check if teams should build advanced factories
            for (const team of ['blue', 'red']) {
                const teamBuildings = buildings.filter(b => b.team === team);
                const hasAdvanced = teamBuildings.some(b => b.type.name === 'Advanced Land Factory');

                if (!hasAdvanced && resources[team].mass > 500 && Math.random() < 0.1) {
                    const commanderBuilding = teamBuildings.find(b => b.type.name === 'Commander'); // Old check
                    const commanderUnit = units.find(u => u.team === team && u.type === UNIT_TYPES.commander);

                    let commanderToBuildNear = commanderUnit || commanderBuilding; // Prefer unit

                    if (commanderToBuildNear) {
                        const pos = findLandPosition(commanderToBuildNear.x + (Math.random() - 0.5) * 300,
                                                   commanderToBuildNear.y + (Math.random() - 0.5) * 300);
                        if(pos) { // Ensure a position was found
                            buildings.push(new Building(pos.x, pos.y, team, BUILDING_TYPES.advancedLandFactory));
                            const event = addEvent('build',
                                `${team.toUpperCase()} constructs Advanced Factory!`, 2);
                            event.position = { x: pos.x, y: pos.y };
                        }
                    }
                }

                // Decide on raid groups
                const teamUnits = units.filter(u => u.team === team && !u.type.support);
                if (teamUnits.length > 10 && Math.random() < 0.05) {
                    // Form raid group
                    const raidSize = Math.min(5 + Math.floor(Math.random() * 5), teamUnits.length / 2);
                    const raiders = teamUnits.slice(0, raidSize);
                    const enemyTargets = buildings.filter(b => b.team !== team && b.type.resourceGeneration);

                    if (enemyTargets.length > 0) {
                        const target = enemyTargets[Math.floor(Math.random() * enemyTargets.length)];
                        raiders.forEach(unit => {
                            unit.patrolTarget = { x: target.x, y: target.y };
                            unit.aggressiveness = 0.9;
                        });

                        if(raiders.length > 0 && raiders[0]){
                             captions.push(new Caption(raiders[0].x, raiders[0].y,
                                `Raid group forming!`, '#f80', 12));
                        }

                        const event = addEvent('strategic',
                            `${team.toUpperCase()} launches raid on enemy economy!`, 2);
                        event.position = { x: target.x, y: target.y };
                    }
                }
            }
        }

        function coordinateAttacks() {
            // Group nearby units for coordinated attacks
            for (const team of ['blue', 'red']) {
                const teamUnits = units.filter(u => u.team === team && !u.type.support);

                // Find clusters of units
                const processed = new Set();

                for (const unit of teamUnits) {
                    if (processed.has(unit)) continue;

                    const nearby = teamUnits.filter(u =>
                        !processed.has(u) &&
                        unit.getDistance(u) < 150
                    );

                    if (nearby.length >= 3) {
                        // Coordinate this group
                        const group = [unit, ...nearby];
                        group.forEach(u => processed.add(u));

                        // Find best target for group
                        const enemies = [...units.filter(u => u.team !== team),
                                       ...buildings.filter(b => b.team !== team)];

                        if (enemies.length > 0) {
                            // Calculate group center
                            const centerX = group.reduce((sum, u) => sum + u.x, 0) / group.length;
                            const centerY = group.reduce((sum, u) => sum + u.y, 0) / group.length;

                            // Find high-value target
                            let bestTarget = null;
                            let bestScore = -Infinity;

                            for (const enemy of enemies) {
                                const dist = Math.sqrt((enemy.x - centerX) ** 2 + (enemy.y - centerY) ** 2);
                                let score = 1000 / (dist + 100);

                                if (enemy.type) { // Check if enemy.type exists
                                    if (enemy.type.name === UNIT_TYPES.commander.name) score *= 3; // Compare with commander unit type name
                                    else if (enemy.type.tier >= 2) score *= 2;
                                    else if (enemy.type.resourceGeneration) score *= 1.5;
                                }

                                if (score > bestScore) {
                                    bestScore = score;
                                    bestTarget = enemy;
                                }
                            }

                            if (bestTarget) {
                                // Assign target to group
                                group.forEach(u => {
                                    u.target = bestTarget;
                                    u.lastTargetSwitch = Date.now();
                                });

                                // Group attack caption
                                captions.push(new Caption(centerX, centerY,
                                    `Coordinated strike!`, '#ff0', 14));
                            }
                        }
                    }
                }
            }
        }

        function render() {
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw terrain
            const startX = Math.floor((camera.x - canvas.width / 2 / camera.zoom) / TILE_SIZE);
            const endX = Math.ceil((camera.x + canvas.width / 2 / camera.zoom) / TILE_SIZE);
            const startY = Math.floor((camera.y - canvas.height / 2 / camera.zoom) / TILE_SIZE);
            const endY = Math.ceil((camera.y + canvas.height / 2 / camera.zoom) / TILE_SIZE);

            for (let x = Math.max(0, startX); x < Math.min(GRID_SIZE, endX); x++) {
                for (let y = Math.max(0, startY); y < Math.min(GRID_SIZE, endY); y++) {
                    const screenX = (x * TILE_SIZE - camera.x) * camera.zoom + canvas.width / 2;
                    const screenY = (y * TILE_SIZE - camera.y) * camera.zoom + canvas.height / 2;
                    const size = TILE_SIZE * camera.zoom;

                    if(terrain[x] && terrain[x][y] !== undefined) { // Ensure terrain tile exists
                        switch (terrain[x][y]) {
                            case TERRAIN_TYPES.WATER:
                                const wave = Math.sin(Date.now() * 0.001 + x * 0.5) * 0.1;
                                ctx.fillStyle = `hsl(200, 50%, ${25 + wave * 10}%)`;
                                break;
                            case TERRAIN_TYPES.LAND:
                                ctx.fillStyle = '#484';
                                break;
                            case TERRAIN_TYPES.MOUNTAIN:
                                ctx.fillStyle = '#666';
                                break;
                        }
                        ctx.fillRect(screenX, screenY, size + 1, size + 1);
                    }
                }
            }

            // Draw resource nodes
            for (const node of resourceNodes) {
                if (node.amount > 0) {
                    const screenX = (node.x - camera.x) * camera.zoom + canvas.width / 2;
                    const screenY = (node.y - camera.y) * camera.zoom + canvas.height / 2;
                    const size = 15 * camera.zoom;

                    ctx.fillStyle = node.type === 'mass' ? '#888' : '#ff0';
                    ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.003) * 0.2;
                    ctx.fillRect(screenX - size/2, screenY - size/2, size, size);
                    ctx.globalAlpha = 1;

                    if (!node.occupied) {
                        ctx.strokeStyle = node.type === 'mass' ? '#aaa' : '#ff8';
                        ctx.strokeRect(screenX - size/2, screenY - size/2, size, size);
                    }
                }
            }

            // Draw buildings
            for (const building of buildings) {
                building.draw(ctx, camera);
            }

            // Draw units
            for (const unit of units) {
                unit.draw(ctx, camera);
            }

            // Draw effects
            for (const effect of effects) {
                effect.draw(ctx, camera);
            }

            // Draw captions (on top of everything)
            for (const caption of captions) {
                caption.draw(ctx, camera);
            }

            // Draw minimap
            drawMinimap();

            // Update UI
            updateUI();

            // Victory screen
            if (gameState.winner) {
                ctx.fillStyle = 'rgba(0,0,0,0.8)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.fillStyle = gameState.winner === 'BLUE' ? '#44f' : '#f44';
                ctx.font = '72px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(gameState.winner + ' WINS!', canvas.width / 2, canvas.height / 2);

                ctx.fillStyle = '#fff';
                ctx.font = '24px Arial';
                ctx.fillText('Press R to restart', canvas.width / 2, canvas.height / 2 + 60);
            }
        }

        function drawMinimap() {
            // Clear minimap
            minimapCtx.fillStyle = '#000';
            minimapCtx.fillRect(0, 0, 200, 200);

            // Draw terrain (simplified)
            const scale = 200 / GRID_SIZE;
            for (let x = 0; x < GRID_SIZE; x += 2) {
                for (let y = 0; y < GRID_SIZE; y += 2) {
                     if(terrain[x] && terrain[x][y] !== undefined) { // Ensure terrain tile exists
                        switch (terrain[x][y]) {
                            case TERRAIN_TYPES.WATER:
                                minimapCtx.fillStyle = '#135';
                                break;
                            case TERRAIN_TYPES.LAND:
                                minimapCtx.fillStyle = '#242';
                                break;
                            case TERRAIN_TYPES.MOUNTAIN:
                                minimapCtx.fillStyle = '#444';
                                break;
                        }
                        minimapCtx.fillRect(x * scale, y * scale, scale * 2, scale * 2);
                    }
                }
            }

            // Draw resource nodes
            for (const node of resourceNodes) {
                if (node.amount > 0) {
                    minimapCtx.fillStyle = node.type === 'mass' ? '#666' : '#880';
                    const mx = (node.x / WORLD_SIZE) * 200;
                    const my = (node.y / WORLD_SIZE) * 200;
                    minimapCtx.fillRect(mx - 1, my - 1, 2, 2);
                }
            }

            // Draw units on minimap
            for (const unit of units) {
                minimapCtx.fillStyle = unit.team === 'blue' ? '#44f' : '#f44';
                const mx = (unit.x / WORLD_SIZE) * 200;
                const my = (unit.y / WORLD_SIZE) * 200;
                minimapCtx.fillRect(mx - 1, my - 1, 2, 2);
            }

            // Draw buildings on minimap
            for (const building of buildings) {
                minimapCtx.fillStyle = building.team === 'blue' ? '#88f' : '#f88';
                const mx = (building.x / WORLD_SIZE) * 200;
                const my = (building.y / WORLD_SIZE) * 200;
                minimapCtx.fillRect(mx - 2, my - 2, 4, 4);

                // Highlight commanders (if they were buildings)
                // This logic is now dead if commanders are only units.
                // if (building.type.name === 'Commander') {
                //     minimapCtx.strokeStyle = '#ff0';
                //    minimapCtx.strokeRect(mx - 3, my - 3, 6, 6);
                // }
            }

            // Draw camera viewport
            minimapCtx.strokeStyle = '#0ff';
            minimapCtx.lineWidth = 2;
            const viewLeft = ((camera.x - canvas.width / 2 / camera.zoom) / WORLD_SIZE) * 200;
            const viewTop = ((camera.y - canvas.height / 2 / camera.zoom) / WORLD_SIZE) * 200;
            const viewWidth = (canvas.width / camera.zoom / WORLD_SIZE) * 200;
            const viewHeight = (canvas.height / camera.zoom / WORLD_SIZE) * 200;
            minimapCtx.strokeRect(viewLeft, viewTop, viewWidth, viewHeight);
        }

        function updateUI() {
            // Count units
            const blueUnits = units.filter(u => u.team === 'blue').length;
            const redUnits = units.filter(u => u.team === 'red').length;

            document.getElementById('blueUnits').textContent = blueUnits;
            document.getElementById('redUnits').textContent = redUnits;

            // Commander health
            const blueCommander = units.find(u => u.team === 'blue' && u.type === UNIT_TYPES.commander);
            const redCommander = units.find(u => u.team === 'red' && u.type === UNIT_TYPES.commander);

            document.getElementById('blueCommander').textContent = blueCommander ?
                Math.round(blueCommander.hp / blueCommander.maxHp * 100) + '%' : 'DESTROYED';
            document.getElementById('redCommander').textContent = redCommander ?
                Math.round(redCommander.hp / redCommander.maxHp * 100) + '%' : 'DESTROYED';

            // Resources
            document.getElementById('blueMass').textContent = Math.floor(resources.blue.mass);
            document.getElementById('blueEnergy').textContent = Math.floor(resources.blue.energy);
            document.getElementById('redMass').textContent = Math.floor(resources.red.mass);
            document.getElementById('redEnergy').textContent = Math.floor(resources.red.energy);

            // Game time
            document.getElementById('gameTime').textContent = formatTime(gameState.gameTime);

            // Zoom level
            document.getElementById('zoomLevel').textContent = camera.zoom.toFixed(1) + 'x';

            // FPV mode indicator
            document.getElementById('fpvMode').style.display = gameState.fpvMode ? 'block' : 'none';
        }

        // Input handling
        let mouseDown = false;
        let lastMouseX = 0;
        let lastMouseY = 0;

        canvas.addEventListener('mousedown', (e) => {
            mouseDown = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;

            // Check minimap click
            const rect = minimap.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                const mx = (e.clientX - rect.left) / 200;
                const my = (e.clientY - rect.top) / 200;
                camera.x = mx * WORLD_SIZE;
                camera.y = my * WORLD_SIZE;
                camera.autoCamera = false;
                return;
            }

            // Select unit
            if (!gameState.fpvMode) {
                const worldX = (e.clientX - canvas.width / 2) / camera.zoom + camera.x;
                const worldY = (e.clientY - canvas.height / 2) / camera.zoom + camera.y;

                gameState.selectedUnit = null;
                for (const unit of units) {
                    const dist = Math.sqrt((unit.x - worldX) ** 2 + (unit.y - worldY) ** 2);
                    if (dist < unit.type.size) {
                        gameState.selectedUnit = unit;
                        unit.selected = true;
                    } else {
                        unit.selected = false;
                    }
                }
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (mouseDown && !gameState.fpvMode) {
                const dx = e.clientX - lastMouseX;
                const dy = e.clientY - lastMouseY;
                camera.x -= dx / camera.zoom;
                camera.y -= dy / camera.zoom;
                camera.autoCamera = false;
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
            }
        });

        canvas.addEventListener('mouseup', () => {
            mouseDown = false;
        });

        canvas.addEventListener('wheel', (e) => {
            if (!gameState.fpvMode) {
                const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                camera.zoom *= zoomFactor;
                camera.zoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, camera.zoom));
            }
            e.preventDefault();
        });

        document.addEventListener('keydown', (e) => {
            switch(e.key.toLowerCase()) {
                case ' ':
                    gameState.paused = !gameState.paused;
                    break;
                case 'r':
                    initGame();
                    break;
                case 'f':
                    if (gameState.selectedUnit) {
                        gameState.fpvMode = !gameState.fpvMode;
                    }
                    break;
                case 'c':
                    camera.autoCamera = !camera.autoCamera;
                    if (camera.autoCamera) {
                        addEvent('strategic', 'Auto-camera enabled', 1);
                    }
                    break;
                case 'escape':
                    gameState.fpvMode = false;
                    break;
            }
        });

        // FPS counter
        let lastTime = 0;
        let fps = 0;
        let frameCount = 0;

        function gameLoop(timestamp) {
            // Calculate FPS
            frameCount++;
            if (timestamp - lastTime >= 1000) {
                fps = frameCount;
                frameCount = 0;
                lastTime = timestamp;
                document.getElementById('fps').textContent = fps;
            }

            update();
            render();
            requestAnimationFrame(gameLoop);
        }

        // Window resize
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });

        // Start game
        initGame();
        requestAnimationFrame(gameLoop);
    </script>
</body>
</html>
[end of js/main.js]
