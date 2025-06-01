import { UNIT_TYPES } from '../config/unitTypes.js'; // Used by constructor and potentially methods
import { BUILDING_TYPES } from '../config/buildingTypes.js'; // Used by performSupportRole
import { WORLD_SIZE, TILE_SIZE, GRID_SIZE, TERRAIN_TYPES } from '../config/gameConstants.js';
import { findPath } from '../pathfinding/astar.js';
// Effect and Caption constructors will be used via gameContext.Effect and gameContext.Caption

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
        this.task = null; // Generic task, could be expanded
        this.shields = type.shields || 0;
        this.maxShields = type.shields || 0;
        this.shieldRegen = type.shieldRegen || 0;
        this.patrolTarget = null;
        this.lastTargetSwitch = 0;
        this.aggressiveness = Math.random();
        this.formation = null;
        this.captionCooldown = 0;
        this.constructionTask = null; // Specific for ACU/Engineer type units
        if (this.type.grenadeAbility) {
            this.grenadeCooldown = 0;
        }
        this.stuckFrames = 0;
        this.significantMoveThreshold = (this.type.size / 4) || 2.5; // Min distance in world units
        this.lastPositionForStuckCheck = { x: this.x, y: this.y };
        this.isEscaping = false;
        this.escapeAngle = 0;
        this.escapeDuration = 0;
        this.STUCK_FRAMES_THRESHOLD = 30;
        this.ESCAPE_MODE_DURATION_FRAMES = 60;
        this.path = null;
        this.currentWaypointIndex = 0;
        this.pathRequestCooldown = 0;
        this.PATH_REQUEST_INTERVAL = 30; // Request path every ~0.5s at 60fps
    }

    getCurrentSpeed(gameContext) {
        const { terrain } = gameContext;
        // Ensure TILE_SIZE, GRID_SIZE, TERRAIN_TYPES are accessible,
        // they are imported at the top of the file.

        const tileX = Math.floor(this.x / TILE_SIZE);
        const tileY = Math.floor(this.y / TILE_SIZE);

        if (tileX >= 0 && tileX < GRID_SIZE && tileY >= 0 && tileY < GRID_SIZE &&
            terrain[tileX] && terrain[tileX][tileY] !== undefined) {
            const terrainType = terrain[tileX][tileY];

            if (this.type.movementType === 'amphibious') {
                if (terrainType === TERRAIN_TYPES.WATER && typeof this.type.speedWater === 'number') {
                    return this.type.speedWater;
                } else if (terrainType === TERRAIN_TYPES.LAND && typeof this.type.speedLand === 'number') {
                    return this.type.speedLand;
                }
            }
        }
        // Fallback to default speed
        return this.type.speed;
    }

    update(gameContext) {
        const { units, buildings } = gameContext; // Get local references for convenience

        // Shield regeneration
        if (this.shields < this.maxShields) {
            this.shields = Math.min(this.maxShields, this.shields + this.shieldRegen);
        }

        // Support unit behavior
        if (this.type.support) {
            this.performSupportRole(gameContext);
            // If ACU is building, it might return early from performSupportRole.
            // Other support logic (like shield gen) might not need to return early.
            if (this.type === UNIT_TYPES.commander && this.constructionTask) {
                 // Commander might be busy building, skip combat/movement if so.
                 // The return is handled inside performSupportRole for ACU construction.
            } else if (this.type.name === 'Shield Generator') {
                // Shield generator logic is self-contained in performSupportRole
            } else if (this.type.name === 'Engineer' && this.target) {
                // Engineer might be busy, skip other default behaviors.
                // Engineer's return is handled in performSupportRole
            } else {
                 // Default movement/targeting if not busy with a specific support task
                 this.defaultMovementAndTargeting(gameContext);
            }
            // Support units like Shield Generator still need stuck detection if they move.
            // ACU and Engineer might be stationary during construction/repair,
            // but if they get stuck moving to a site, this is useful.
            // So, call updateStuckDetection for all units after their main logic.
        } else {
            this.defaultMovementAndTargeting(gameContext);
        }

        this.updateStuckDetection(gameContext); // Called for all units after movement attempt
    }

    defaultMovementAndTargeting(gameContext) {
        const { units, buildings } = gameContext; // Keep for findTarget

        if (this.isEscaping) {
            if (this.escapeDuration > 0) {
                this.angle = this.escapeAngle;
                const currentSpeed = this.getCurrentSpeed(gameContext);
                this.vx = Math.cos(this.angle) * currentSpeed;
                this.vy = Math.sin(this.angle) * currentSpeed;
                this.escapeDuration--;
            } else {
                this.isEscaping = false;
                this.stuckFrames = 0;
                this.path = null; // Clear path after escaping, force re-path
            }
        } else {
            // TARGET ACQUISITION (similar to before)
            if (!this.target || this.target.hp <= 0 || (Date.now() - this.lastTargetSwitch > 5000 && Math.random() < 0.1)) {
                this.findTarget(gameContext); // findTarget sets this.target
                this.lastTargetSwitch = Date.now();
                this.path = null; // New target, clear old path
            }
            if (Math.random() < 0.005 && !this.target && !this.patrolTarget) { // Only look for patrol if no current combat target or existing patrol
                // Simplified patrol target selection for brevity
                if (gameContext.resourceNodes && gameContext.resourceNodes.length > 0) {
                    const targetNode = gameContext.resourceNodes[Math.floor(Math.random() * gameContext.resourceNodes.length)];
                    if (targetNode) {
                        this.patrolTarget = { x: targetNode.x, y: targetNode.y };
                        this.path = null; // New patrol target, clear old path
                    }
                }
            }

            const currentPrimaryDestination = this.target || this.patrolTarget;

            if (currentPrimaryDestination) {
                let needsNewPath = false;
                if (!this.path) {
                    needsNewPath = true;
                } else {
                    // More robust check: if target moved significantly from path's end, or if unit is far from current path.
                    // Simple check for now: if cooldown is up, consider re-pathing.
                    if (this.pathRequestCooldown <= 0) {
                        // Check if target has moved significantly from path's intended destination
                        const pathEndPoint = this.path[this.path.length-1];
                        const dxTarget = currentPrimaryDestination.x - pathEndPoint.x;
                        const dyTarget = currentPrimaryDestination.y - pathEndPoint.y;
                        if (Math.sqrt(dxTarget*dxTarget + dyTarget*dyTarget) > TILE_SIZE * 2) { // If target moved > 2 tiles from path end
                           needsNewPath = true;
                        }
                    }
                }

                if (needsNewPath && this.pathRequestCooldown <= 0) {
                    const moveType = this.type.movementType || 'land';
                    console.log(`Unit ${this.type.name} requesting path. MovementType: '${moveType}'`); // ADD THIS LOG (uncommented)
                    this.path = findPath(
                        { x: this.x, y: this.y },
                        { x: currentPrimaryDestination.x, y: currentPrimaryDestination.y },
                        gameContext,
                        moveType
                    );
                    this.currentWaypointIndex = 0;
                    this.pathRequestCooldown = this.PATH_REQUEST_INTERVAL;
                    if (!this.path) {
                        if (gameContext.addEvent) gameContext.addEvent(gameContext, 'debug', `Path not found: ${this.type.name} to ${currentPrimaryDestination.type ? currentPrimaryDestination.type.name : 'point'}`, 0);
                        // console.log(`Unit ${this.type.name} (${this.team}) could not find path to ${currentPrimaryDestination.type ? currentPrimaryDestination.type.name : 'point'}.`);
                    } else {
                         if (gameContext.addEvent) gameContext.addEvent(gameContext, 'debug', `Path found for ${this.type.name} with ${this.path.length} waypoints.`, 0);
                         console.log(`DEBUG: Unit ${this.type.name} new path found. Length: ${this.path.length}. Waypoints: ${JSON.stringify(this.path)}`); // JSON.stringify can be verbose
                    }
                }

                // PATH FOLLOWING
                if (this.path && this.currentWaypointIndex < this.path.length) {
                    console.log(`DEBUG: Unit ${this.type.name} (${this.team}, ID: ${this.id || 'N/A'}) at (${this.x.toFixed(1)}, ${this.y.toFixed(1)}). Path length: ${this.path.length}. Current WP Index: ${this.currentWaypointIndex}.`);
                    const waypoint = this.path[this.currentWaypointIndex];
                    const dx = waypoint.x - this.x;
                    const dy = waypoint.y - this.y;
                    const distanceToWaypoint = Math.sqrt(dx * dx + dy * dy);
                    const WAYPOINT_REACH_THRESHOLD = Math.max(this.type.size || 10, TILE_SIZE * 0.75);
                    console.log(`DEBUG: Unit ${this.type.name} targeting WP ${this.currentWaypointIndex}: (${waypoint.x.toFixed(1)}, ${waypoint.y.toFixed(1)}). Dist: ${distanceToWaypoint.toFixed(1)}. Threshold: ${WAYPOINT_REACH_THRESHOLD.toFixed(1)}`);

                    if (distanceToWaypoint < WAYPOINT_REACH_THRESHOLD) {
                        console.log(`DEBUG: Unit ${this.type.name} REACHED WP ${this.currentWaypointIndex}.`);
                        this.currentWaypointIndex++;
                        if (this.currentWaypointIndex >= this.path.length) { // Reached end of path
                            this.path = null;
                            if (this.patrolTarget && Math.abs(this.x - this.patrolTarget.x) < WAYPOINT_REACH_THRESHOLD && Math.abs(this.y - this.patrolTarget.y) < WAYPOINT_REACH_THRESHOLD) {
                                this.patrolTarget = null; // Arrived at patrol point
                            }
                            // If it was a this.target, it will either be attacked next (if in range) or a new path requested if it moved.
                        }
                    }

                    if (this.path && this.currentWaypointIndex < this.path.length) {
                        const nextWaypoint = this.path[this.currentWaypointIndex];
                        this.angle = Math.atan2(nextWaypoint.y - this.y, nextWaypoint.x - this.x);
                        const currentSpeed = this.getCurrentSpeed(gameContext);
                        this.vx = Math.cos(this.angle) * currentSpeed;
                        this.vy = Math.sin(this.angle) * currentSpeed;
                    } else { // Path just finished or became null
                        this.vx = 0; this.vy = 0;
                    }
                } else if (this.target) { // NO PATH, but has a target (fallback to direct engagement or stop)
                    const distToTarget = this.getDistance(this.target);
                    if (distToTarget > this.type.range) {
                        // Fallback: direct move if very close, or path failed and target is not immediately reachable
                        // This can replace the old direct movement logic.
                        // If path failed, unit might just stop if target is far.
                        // For simplicity, if path failed, we stop unless very close.
                        if (distToTarget < TILE_SIZE * 2) { // If very close, try direct move
                           this.angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
                           const currentSpeed = this.getCurrentSpeed(gameContext);
                           this.vx = Math.cos(this.angle) * currentSpeed;
                           this.vy = Math.sin(this.angle) * currentSpeed;
                        } else {
                           this.vx = 0; this.vy = 0; // Stop if path failed and target is not very close
                        }
                    } else { // In range to attack
                        this.vx = 0; this.vy = 0;
                        if (this.cooldown <= 0) { this.attack(this.target, gameContext); this.cooldown = this.type.attackSpeed; }
                    }
                } else if (this.patrolTarget) { // NO PATH, but has a patrol target (e.g. path failed)
                    // Similar to target: if very close, try direct move. Else stop.
                    const distToPatrol = Math.sqrt(Math.pow(this.patrolTarget.x - this.x, 2) + Math.pow(this.patrolTarget.y - this.y, 2));
                     if (distToPatrol < TILE_SIZE * 2) {
                        this.angle = Math.atan2(this.patrolTarget.y - this.y, this.patrolTarget.x - this.x);
                        const currentSpeed = this.getCurrentSpeed(gameContext);
                        this.vx = Math.cos(this.angle) * currentSpeed;
                        this.vy = Math.sin(this.angle) * currentSpeed;
                     } else {
                        this.vx = 0; this.vy = 0;
                     }
                      if (distToPatrol < TILE_SIZE * 0.5) this.patrolTarget = null; // Arrived
                } else { // NO TARGET, NO PATH (wander)
                    if (Math.random() < 0.02) { this.angle += (Math.random() - 0.5) * 0.5; }
                    const currentSpeed = this.getCurrentSpeed(gameContext);
                    this.vx = Math.cos(this.angle) * currentSpeed * 0.5;
                    this.vy = Math.sin(this.angle) * currentSpeed * 0.5;
                }
            } else { // NO CURRENT PRIMARY DESTINATION (target or patrolTarget)
                // Wander logic
                if (Math.random() < 0.02) { this.angle += (Math.random() - 0.5) * 0.5; }
                const currentSpeed = this.getCurrentSpeed(gameContext);
                this.vx = Math.cos(this.angle) * currentSpeed * 0.5;
                this.vy = Math.sin(this.angle) * currentSpeed * 0.5;
            }
        } // End of main 'else' for 'if (this.isEscaping)'

        this.applyMovement(gameContext);

        if (this.cooldown > 0) this.cooldown--;
        if (this.pathRequestCooldown > 0) this.pathRequestCooldown--;
        if (this.type.grenadeAbility && this.grenadeCooldown > 0) {
            this.grenadeCooldown--;
        }
        if (this.captionCooldown > 0) this.captionCooldown--;

        // showStateCaption might be too spammy with pathfinding debug, consider conditional logging
        // if (this.captionCooldown <= 0 && Math.random() < 0.01) {
        //     this.showStateCaption(gameContext);
        // }
    }

    launchGrenade(targetX, targetY, gameContext) {
        // UNIT_TYPES is imported at the top of the file.
        // Ensure GrenadeProjectile constructor will be available via gameContext.
        // We'll assume gameContext.GrenadeProjectile and gameContext.projectiles will exist.
        const { GrenadeProjectile, projectiles, addEvent } = gameContext;

        if (!this.type.grenadeAbility) {
            console.warn(`${this.type.name} does not have grenade ability.`);
            return;
        }

        if (this.grenadeCooldown > 0) {
            console.log(`${this.type.name} grenade is on cooldown: ${this.grenadeCooldown} frames left.`);
            if (addEvent) addEvent(gameContext, 'ui_error', 'Grenade ability on cooldown!', 1);
            return;
        }

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.type.grenadeAbility.range) {
            console.log(`Target out of grenade range. Max: ${this.type.grenadeAbility.range}, Target: ${dist.toFixed(0)}`);
            if (addEvent) addEvent(gameContext, 'ui_error', 'Target out of grenade range!', 1);
            return;
        }

        if (!GrenadeProjectile) {
            console.error("GrenadeProjectile class is not available on gameContext!");
            return;
        }
        if (!projectiles) {
            console.error("gameContext.projectiles array is not available!");
            return;
        }

        console.log(`${this.team} ${this.type.name} launching grenade at ${targetX.toFixed(0)}, ${targetY.toFixed(0)}`);

        const projectile = new GrenadeProjectile(
            this.x, this.y, // startX, startY
            targetX, targetY,
            this.team,
            this.type.grenadeAbility // Pass the whole ability config
            // gameContext is no longer passed directly to projectile constructor based on typical entity design
            // The projectile's update method will receive gameContext.
        );
        projectiles.push(projectile);

        this.grenadeCooldown = this.type.grenadeAbility.cooldownTime;

        if (addEvent) { // Add a game event for the launch
            addEvent(gameContext, 'ability_used', `${this.type.name} launched grenade.`, 2, { x: this.x, y: this.y });
        }
    }


    performSupportRole(gameContext) {
        const { units, buildings, resources, captions, resourceNodes, addEvent, Building: BuildingContructor, Caption: CaptionConstructor, Effect: EffectConstructor } = gameContext;
        // UNIT_TYPES and BUILDING_TYPES are imported directly. TILE_SIZE, GRID_SIZE, TERRAIN_TYPES also imported.

        if (this.type === UNIT_TYPES.commander) {
            if (!this.constructionTask && this.type.buildList && this.type.buildList.length > 0) {
                const buildingToBuildType = this.type.buildList[0];

                if (buildingToBuildType && resources[this.team].mass >= buildingToBuildType.cost.mass &&
                    resources[this.team].energy >= buildingToBuildType.cost.energy) {
                    const buildOffsets = [{ dx: 100, dy: 0 }, { dx: -100, dy: 0 }, { dx: 0, dy: 100 }, { dx: 0, dy: -100 }, { dx: 150, dy: 150 }, { dx: -150, dy: -150 }];
                    for (const offset of buildOffsets) {
                        const buildX = this.x + offset.dx;
                        const buildY = this.y + offset.dy;
                        const tileX = Math.floor(buildX / TILE_SIZE);
                        const tileY = Math.floor(buildY / TILE_SIZE);

                        if (tileX >= 0 && tileX < GRID_SIZE && tileY >= 0 && tileY < GRID_SIZE &&
                            gameContext.terrain[tileX][tileY] === TERRAIN_TYPES.LAND) {
                            let isSpotClear = true;
                            for (const b of buildings) {
                                const dist = Math.sqrt((b.x - buildX) ** 2 + (b.y - buildY) ** 2);
                                if (dist < (b.type.size / 2 + buildingToBuildType.size / 2)) {
                                    isSpotClear = false; break;
                                }
                            }
                            if (isSpotClear) {
                                this.constructionTask = { targetX: buildX, targetY: buildY, type: buildingToBuildType, progress: 0, buildingStarted: false };
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
                        this.moveTowards(targetPos, gameContext);
                    } else {
                        resources[this.team].mass -= this.constructionTask.type.cost.mass;
                        resources[this.team].energy -= this.constructionTask.type.cost.energy;
                        this.constructionTask.buildingStarted = true;
                        this.vx = 0; this.vy = 0;
                        captions.push(new CaptionConstructor(this.constructionTask.targetX, this.constructionTask.targetY, `Constructing ${this.constructionTask.type.name}`, '#0f0', 10));
                        console.log(`${this.team} ACU arrived, starting construction of ${this.constructionTask.type.name}`);
                    }
                } else {
                    this.constructionTask.progress += (this.type.buildRate || 1.0);
                    if (this.captionCooldown <= 0 && Math.random() < 0.05) {
                        const progressPercent = Math.floor((this.constructionTask.progress / this.constructionTask.type.buildTime) * 100);
                        captions.push(new CaptionConstructor(this.x, this.y - this.type.size - 10, `Build: ${progressPercent}%`, '#FFF', 8));
                        this.captionCooldown = 30;
                    }
                    if (this.constructionTask.progress >= this.constructionTask.type.buildTime) {
                        const newBuilding = new BuildingContructor(this.constructionTask.targetX, this.constructionTask.targetY, this.team, this.constructionTask.type);
                        buildings.push(newBuilding);
                        addEvent(gameContext, 'build', `${this.team.toUpperCase()} ACU completed ${this.constructionTask.type.name}!`, 2, { x: newBuilding.x, y: newBuilding.y });
                        console.log(`${this.team} ACU completed ${this.constructionTask.type.name}`);
                        this.constructionTask = null;
                    }
                }
                return; // ACU is busy, skip other logic
            }
             // If ACU has nothing to build, it can move/fight like a normal unit.
            this.defaultMovementAndTargeting(gameContext);

        } else if (this.type.name === 'Engineer') {
            let target = null;
            let minDist = Infinity;
            for (const building of buildings) {
                if (building.team === this.team && building.hp < building.maxHp) {
                    const dist = this.getDistance(building);
                    if (dist < minDist) { minDist = dist; target = building; }
                }
            }
            if (!target) {
                for (const node of resourceNodes) {
                    if (!node.occupied && node.amount > 0) {
                        const dist = Math.sqrt((node.x - this.x) ** 2 + (node.y - this.y) ** 2);
                        if (dist < minDist) { minDist = dist; target = node; }
                    }
                }
            }

            if (target) {
                this.moveTowards(target, gameContext);
                if (minDist < 100) { // Range to repair or build extractor
                    if (target.hp !== undefined) { // It's a building to repair
                        target.hp = Math.min(target.maxHp, target.hp + 2); // Repair rate
                    } else if (target.amount !== undefined && !target.occupied) { // It's a resource node
                        target.occupied = true;
                        buildings.push(new BuildingContructor(target.x, target.y, this.team,
                            target.type === 'mass' ? BUILDING_TYPES.massExtractor : BUILDING_TYPES.energyExtractor));
                        const event = addEvent(gameContext, 'resource', `${this.team.toUpperCase()} built ${target.type} extractor`, 2, { x: target.x, y: target.y });
                    }
                }
                 return; // Engineer is busy
            } else {
                // Follow friendly units or patrol if nothing to do
                 this.defaultMovementAndTargeting(gameContext);
            }
        } else if (this.type.name === 'Shield Generator') {
            for (const unit of units) {
                if (unit.team === this.team && unit !== this) {
                    const dist = this.getDistance(unit);
                    if (dist < (this.type.shieldRadius || 200) ) { // Assuming shieldRadius on type
                        unit.shields = Math.min(unit.maxShields, unit.shields + (this.type.shieldBoost || 1));
                    }
                }
            }
            // Shield generators can also move
            this.defaultMovementAndTargeting(gameContext);
        }
    }

    moveTowards(target, gameContext) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const moveThreshold = target.type ? target.type.size / 2 : 50; // Move closer to smaller targets

        if (dist > moveThreshold) {
            this.angle = Math.atan2(dy, dx);
            const currentSpeed = this.getCurrentSpeed(gameContext);
            this.vx = Math.cos(this.angle) * currentSpeed;
            this.vy = Math.sin(this.angle) * currentSpeed;
        } else {
            this.vx = 0;
            this.vy = 0;
        }
        this.applyMovement(gameContext);
    }

    applyMovement(gameContext) {
        const { terrain } = gameContext; // Constants TILE_SIZE, GRID_SIZE, WORLD_SIZE, TERRAIN_TYPES are imported
        const newX = this.x + this.vx;
        const newY = this.y + this.vy;

        // Boundary checks
        const boundedX = Math.max(0, Math.min(WORLD_SIZE, newX));
        const boundedY = Math.max(0, Math.min(WORLD_SIZE, newY));

        const tileX = Math.floor(boundedX / TILE_SIZE);
        const tileY = Math.floor(boundedY / TILE_SIZE);

        let canMove = false;
        if (tileX >= 0 && tileX < GRID_SIZE && tileY >= 0 && tileY < GRID_SIZE && terrain[tileX] && terrain[tileX][tileY] !== undefined) {
            const terrainType = terrain[tileX][tileY];
            if (this.type.movementType === 'amphibious') {
                if (terrainType === TERRAIN_TYPES.LAND || terrainType === TERRAIN_TYPES.WATER) {
                    canMove = true;
                }
            } else if ((this.type.domain === 'land' && terrainType !== TERRAIN_TYPES.WATER) ||
                       (this.type.domain === 'sea' && terrainType === TERRAIN_TYPES.WATER) ||
                       (this.type.domain === 'air')) {
                canMove = true;
            }
        }


        if (canMove) {
            this.x = boundedX;
            this.y = boundedY;
        } else {
            // Preserve the unit's original velocity components if needed, or recalculate.
            // For simplicity, we'll use the current angle and speed to probe.
            // const originalVx = this.vx;
            // const originalVy = this.vy;

            const probeAngles = [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2];
            const currentSpeed = this.getCurrentSpeed(gameContext); // Use current speed for probing

            for (const probeAngle of probeAngles) {
                const potentialAngle = this.angle + probeAngle;
                const probeDist = currentSpeed > 0 ? currentSpeed : TILE_SIZE / 2; // Use speed or a small fixed distance

                const probeX = this.x + Math.cos(potentialAngle) * probeDist;
                const probeY = this.y + Math.sin(potentialAngle) * probeDist;

                const probeTileX = Math.floor(probeX / TILE_SIZE);
                const probeTileY = Math.floor(probeY / TILE_SIZE);

                let isProbePathClear = false;
                if (probeTileX >= 0 && probeTileX < GRID_SIZE && probeTileY >= 0 && probeTileY < GRID_SIZE &&
                    terrain[probeTileX] && terrain[probeTileX][probeTileY] !== undefined) {
                    const terrainTypeProbe = terrain[probeTileX][probeTileY];
                    if (this.type.movementType === 'amphibious') {
                        if (terrainTypeProbe === TERRAIN_TYPES.LAND || terrainTypeProbe === TERRAIN_TYPES.WATER) {
                            isProbePathClear = true;
                        }
                    } else if ((this.type.domain === 'land' && terrainTypeProbe !== TERRAIN_TYPES.WATER) ||
                               (this.type.domain === 'sea' && terrainTypeProbe === TERRAIN_TYPES.WATER) ||
                               (this.type.domain === 'air')) {
                        isProbePathClear = true;
                    }
                }

                if (isProbePathClear) {
                    this.angle = potentialAngle;
                    this.vx = Math.cos(this.angle) * currentSpeed;
                    this.vy = Math.sin(this.angle) * currentSpeed;

                    // Move a small step in the new direction
                    // Ensure the small step doesn't immediately put it into another obstacle
                    const stepFactor = 0.5; // Adjust this factor as needed
                    const nextStepX = this.x + this.vx * stepFactor;
                    const nextStepY = this.y + this.vy * stepFactor;

                    const nextStepTileX = Math.floor(nextStepX / TILE_SIZE);
                    const nextStepTileY = Math.floor(nextStepY / TILE_SIZE);

                    let canTakeSmallStep = false;
                     if (nextStepTileX >= 0 && nextStepTileX < GRID_SIZE && nextStepTileY >= 0 && nextStepTileY < GRID_SIZE &&
                        terrain[nextStepTileX] && terrain[nextStepTileX][nextStepTileY] !== undefined) {
                        const nextStepTerrainType = terrain[nextStepTileX][nextStepTileY];
                        if (this.type.movementType === 'amphibious') {
                            if (nextStepTerrainType === TERRAIN_TYPES.LAND || nextStepTerrainType === TERRAIN_TYPES.WATER) {
                                canTakeSmallStep = true;
                            }
                        } else if ((this.type.domain === 'land' && nextStepTerrainType !== TERRAIN_TYPES.WATER) ||
                                   (this.type.domain === 'sea' && nextStepTerrainType === TERRAIN_TYPES.WATER) ||
                                   (this.type.domain === 'air')) {
                            canTakeSmallStep = true;
                        }
                    }

                    if(canTakeSmallStep) {
                        this.x = Math.max(0, Math.min(WORLD_SIZE, nextStepX));
                        this.y = Math.max(0, Math.min(WORLD_SIZE, nextStepY));
                    } else {
                        // If even the small step is blocked, just update angle and velocity,
                        // hoping the main movement logic in the next frame resolves it.
                        // Or, could revert to original angle and try another probe.
                        // For now, just set vx/vy to 0 if small step fails.
                        this.vx = 0;
                        this.vy = 0;
                    }
                    return; // Exit applyMovement after finding a new path and making a small move
                }
            }

            // If no probe angle found a clear path, stop momentum
            this.vx = 0;
            this.vy = 0;
            // Optional: this.angle += Math.PI; // Turn 180 degrees if completely stuck
        }

        // --- Unit-to-unit separation ---
        const allUnits = gameContext.units; // Get all units from gameContext
        const SEPARATION_STRENGTH = 0.2; // How strongly they push each other, adjust as needed
        const MIN_UNIT_BUFFER = this.type.size * 0.25; // A small buffer based on unit size, e.g., 25% of its own size

        for (const otherUnit of allUnits) {
            if (this === otherUnit) {
                continue; // Skip self
            }

            const dx = this.x - otherUnit.x;
            const dy = this.y - otherUnit.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            // Define minimum separation based on both units' sizes
            // Assuming type.size is a diameter-like property
            const desiredSeparation = (this.type.size / 2) + (otherUnit.type.size / 2) + MIN_UNIT_BUFFER;

            if (distance < desiredSeparation) {
                const overlap = desiredSeparation - distance;

                // Avoid division by zero if distance is very small (units are exactly on top)
                // In such a case, apply a minimal random push or just push along x-axis.
                let pushX = 0;
                let pushY = 0;

                if (distance > 0.01) { // If units are not exactly on top of each other
                    pushX = (dx / distance) * overlap * SEPARATION_STRENGTH;
                    pushY = (dy / distance) * overlap * SEPARATION_STRENGTH;
                } else { // Units are too close or on top, apply a default small push
                    pushX = (Math.random() - 0.5) * SEPARATION_STRENGTH * overlap; // Small random push
                    pushY = (Math.random() - 0.5) * SEPARATION_STRENGTH * overlap;
                     if (pushX === 0 && pushY === 0) pushX = SEPARATION_STRENGTH * overlap; // Ensure some push if random is zero
                }

                // Apply the separation push to current unit's position
                let newX = this.x + pushX;
                let newY = this.y + pushY;

                // Check against world boundaries (WORLD_SIZE is imported)
                this.x = Math.max(0, Math.min(WORLD_SIZE, newX));
                this.y = Math.max(0, Math.min(WORLD_SIZE, newY));

                // IMPORTANT: This is a simple model. Ideally, the push should also be
                // applied to otherUnit (or half to each). For simplicity in this pass,
                // only the current unit is moved. This can lead to one unit pushing others
                // more effectively depending on update order.
                // Also, this separation does not re-check for terrain collisions after push,
                // so units could be pushed into impassable terrain. This is a known limitation
                // of this simpler approach.
            }
        }
    }

    findTarget(gameContext) {
        const { units, buildings } = gameContext;
        let closestDist = Infinity;
        let newTarget = null; // Changed from 'closest' to 'newTarget' to avoid conflict with outer scope if any

        // Find enemy units
        for (const unit of units) {
            if (unit.team !== this.team && unit.hp > 0 && !unit.type.support) { // Don't target support units primarily
                const dist = this.getDistance(unit);
                let adjustedDist = dist;
                if (unit.type.tier >= 2) adjustedDist *= 0.7;
                if (unit.type.name === UNIT_TYPES.commander.name) adjustedDist *= 0.5; // Prioritize enemy commander

                if (adjustedDist < closestDist) {
                    closestDist = adjustedDist;
                    newTarget = unit;
                }
            }
        }
        // Find enemy buildings
        for (const building of buildings) {
            if (building.team !== this.team && building.hp > 0) {
                const dist = this.getDistance(building);
                let priority = 1.0;
                 // BUILDING_TYPES.commander does not exist; commanders are units.
                 // TODO: Review logic for commander-specific building interaction if a special "command center" building type is added later.
                if (building.type.resourceGeneration) priority = 0.8;
                else if (building.type.produces) priority = 0.9;

                const adjustedDist = dist * priority;

                if (adjustedDist < closestDist) {
                    closestDist = adjustedDist;
                    newTarget = building;
                }
            }
        }
        this.target = newTarget;
    }

    getDistance(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    showStateCaption(gameContext) {
        const { captions, Caption: CaptionConstructor } = gameContext;
        let captionText = ''; // Renamed from 'caption' to 'captionText'
        let color = '#fff';

        if (this.type.support) {
            if (this.type === UNIT_TYPES.commander && this.constructionTask) {
                if (this.constructionTask.buildingStarted) {
                    const progressPercent = Math.floor((this.constructionTask.progress / this.constructionTask.type.buildTime) * 100);
                    captionText = `Build: ${progressPercent}%`; color = '#0f0';
                } else {
                    captionText = `Moving to build`; color = '#ff0';
                }
            } else if (this.type.name === 'Engineer') {
                captionText = this.target ? 'Repairing/Building' : 'Seeking task'; color = '#0f0';
            } else if (this.type.name === 'Shield Generator') {
                captionText = 'Projecting shields'; color = '#0ff';
            }
        } else if (this.target) {
            captionText = this.getDistance(this.target) > this.type.range ? 'Engaging' : 'Firing!';
            color = this.getDistance(this.target) > this.type.range ? '#f88' : '#f00';
        } else if (this.patrolTarget) {
            captionText = 'Patrolling'; color = '#ff0';
        } else {
            captionText = 'Idle'; color = '#888';
        }

        if (captionText) {
            captions.push(new CaptionConstructor(this.x, this.y - this.type.size, captionText, color, 10));
            this.captionCooldown = 120 + Math.random() * 120;
        }
    }

    attack(target, gameContext) {
        const { effects, addEvent, Effect: EffectConstructor } = gameContext;
        let damage = this.type.damage;

        // Apply damage to shields first if the target has shields
        if (target.shields !== undefined && target.shields > 0) {
            const shieldDamage = Math.min(damage, target.shields);
            target.shields -= shieldDamage;
            damage -= shieldDamage;
        }

        // Apply remaining damage to HP
        if (damage > 0 && target.hp > 0) {
             target.takeDamage(damage, gameContext); // Pass gameContext to takeDamage
        }

        effects.push(new EffectConstructor(this.x, this.y, target.x, target.y, this.type.effectColor));

        // Check if target is a unit commander. BUILDING_TYPES.commander is not a valid check here.
        if (target.type && target.type === UNIT_TYPES.commander && Math.random() < 0.1) {
            const event = addEvent(gameContext, 'battle', `${this.team.toUpperCase()} attacking enemy Commander!`, 3, { x: target.x, y: target.y });
        } else if (Math.random() < 0.01 && target.type && target.type.tier >= 2) {
            const event = addEvent(gameContext, 'battle', `Major engagement: ${this.type.name} vs ${target.type.name}`, 2, { x: this.x, y: this.y });
        }
    }

    takeDamage(damage, gameContext) { // Added gameContext
        const { captions, Caption: CaptionConstructor } = gameContext;
        // Shields already handled by the attacker before calling takeDamage,
        // but if called directly, this logic is a fallback.
        // For now, assuming damage passed is direct HP damage.
        this.hp -= damage;

        if (damage > 0 && Math.random() < 0.2) {
            if (this.hp <= 0) { // Check if unit is destroyed
                 // Handled in main update loop
            } else if (this.hp < this.maxHp * 0.3) {
                captions.push(new CaptionConstructor(this.x, this.y, 'Critical damage!', '#f00', 10));
            } else if (damage > 30) {
                captions.push(new CaptionConstructor(this.x, this.y, `${Math.floor(damage)}!`, '#f88', 9));
            }
        }
    }

    draw(ctx, camera, gameContext) { // Added gameContext for canvas dimensions via camera
        const screenX = (this.x - camera.x) * camera.zoom + camera.canvasWidth / 2;
        const screenY = (this.y - camera.y) * camera.zoom + camera.canvasHeight / 2;
        const size = this.type.size * camera.zoom;

        if (screenX < -size || screenX > camera.canvasWidth + size ||
            screenY < -size || screenY > camera.canvasHeight + size) {
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
            ctx.lineWidth = 2 * camera.zoom; // Scale line width with zoom
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        if (this.hp < this.maxHp) {
            ctx.fillStyle = '#000';
            ctx.fillRect(-size / 2, -size / 2 - (8 * camera.zoom), size, (4 * camera.zoom));
            ctx.fillStyle = '#0f0';
            ctx.fillRect(-size / 2, -size / 2 - (8 * camera.zoom), size * (this.hp / this.maxHp), (4 * camera.zoom));
        }

        if (this.selected) {
            ctx.strokeStyle = '#ff0';
            ctx.lineWidth = 2 * camera.zoom; // Scale line width
            ctx.strokeRect(-size / 2 - (5 * camera.zoom), -size / 2 - (5 * camera.zoom), size + (10 * camera.zoom), size + (10 * camera.zoom));
        }
        ctx.restore();
    }

    updateStuckDetection(gameContext) {
        // Calculate distance moved this frame
        const dxMoved = this.x - this.lastPositionForStuckCheck.x;
        const dyMoved = this.y - this.lastPositionForStuckCheck.y;
        const distanceMoved = Math.sqrt(dxMoved * dxMoved + dyMoved * dyMoved);

        // Check if unit was trying to move
        const wasTryingToMove = (this.target || this.patrolTarget || this.isEscaping || this.vx !== 0 || this.vy !== 0);

        if (wasTryingToMove && distanceMoved < this.significantMoveThreshold) {
            this.stuckFrames++;
        } else {
            this.stuckFrames = 0;
        }

        this.lastPositionForStuckCheck = { x: this.x, y: this.y };

        if (this.stuckFrames > this.STUCK_FRAMES_THRESHOLD && !this.isEscaping) {
            this.isEscaping = true;
            this.escapeDuration = this.ESCAPE_MODE_DURATION_FRAMES;
            // Determine escape angle:
            this.escapeAngle = this.angle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
            this.escapeAngle += (Math.random() - 0.5) * (Math.PI / 4); // Add up to +/- 22.5 degrees

            if (gameContext.addEvent) {
                 gameContext.addEvent(gameContext, 'debug', `${this.type.name} stuck, trying escape. Angle: ${this.escapeAngle.toFixed(2)}`, 0, { x: this.x, y: this.y });
            }
        }
    }
}

export { Unit };
