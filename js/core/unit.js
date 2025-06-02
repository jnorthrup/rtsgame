import { UNIT_TYPES } from '../config/unitTypes.js'; // Used by constructor and potentially methods
import { BUILDING_TYPES } from '../config/buildingTypes.js'; // Used by performSupportRole
import { WORLD_SIZE, TILE_SIZE, GRID_SIZE, TERRAIN_TYPES } from '../config/gameConstants.js';
import { findPath } from '../pathfinding/astar.js';
// Effect and Caption constructors will be used via gameContext.Effect and gameContext.Caption

class Unit {
    constructor(x, y, team, type, gameContext) { // Added gameContext to constructor
        this.x = x;
        this.y = y;
        this.team = team;
        this.type = type;
        this.hp = type.maxHp;
        this.maxHp = type.maxHp;
        this.target = null;
        this.cooldown = 0;
        this.angle = gameContext.seedRandom.random() * Math.PI * 2; // Use seeded random
        this.vx = 0;
        this.vy = 0;
        this.selected = false;
        this.task = null; // Generic task, could be expanded
        this.shields = type.shields || 0;
        this.maxShields = type.shields || 0;
        this.shieldRegen = type.shieldRegen || 0;
        this.patrolTarget = null;
        this.lastTargetSwitch = 0;
        this.aggressiveness = 0.7 + gameContext.seedRandom.random() * 0.3; // Use seeded random
        this.tacticalRole = this.determineTacticalRole();
        this.lastFireTime = 0;
        this.preferredRange = this.type.range * 0.8;
        this.militaryRank = this.determineMilitaryRank();
        this.survivalPriority = this.calculateSurvivalPriority();
        this.commandAuthority = this.type.tier * 10 + (this.type.support ? 5 : 0); // Original command authority
        this.protectionNeeds = [];
        this.lastThreatAssessment = 0;
        this.fleeThreshold = this.maxHp * 0.2;
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

        // Enhanced authority properties
        this.baseAuthority = this.commandAuthority; // Use original for base
        this.healthAuthorityModifier = 0;
        this.veterancyAuthorityModifier = 0;
        this.contextAuthorityModifier = 0;
        this.effectiveAuthority = this.baseAuthority;

        // Veterancy tracking
        this.combatExperience = 0;        // Successful attacks landed
        this.survivalTime = 0;            // Time alive in combat zones
        this.commandExperience = 0;       // Subordinates successfully commanded
        this.killCount = 0;               // Enemy units destroyed
        this.damageDelt = 0;              // Total damage inflicted
        this.lastPromotionTime = 0;       // Prevents spam promotions
        this.veterancyLevel = 'GREEN';

        // Health-based command fitness
        this.commandFitness = 'FULL_COMMAND';
        this.lastAuthorityUpdate = 0;
        this.commandSuccesses = 0;
        this.commandFailures = 0;
        this.currentCommander = null; // Track who this unit is following
        this.lastCommandChange = 0; // Timestamp of last command transfer
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
        const { units, buildings, deltaTime } = gameContext; // Get local references for convenience

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

        this.updateStuckDetection(gameContext);
        this.updateTacticalBehavior(gameContext);
        this.updateSurvivalBehaviors(gameContext);
        this.executeCommandHierarchy(gameContext);
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
            // TARGET ACQUISITION - More stable targeting
            if (!this.target || this.target.hp <= 0 || (Date.now() - this.lastTargetSwitch > 15000 && gameContext.seedRandom.random() < 0.05)) { // Use seeded random
                this.findTarget(gameContext);
                this.lastTargetSwitch = Date.now();
                this.path = null;
            }
            if (gameContext.seedRandom.random() < 0.005 && !this.target && !this.patrolTarget) { // Only look for patrol if no current combat target or existing patrol // Use seeded random
                // Simplified patrol target selection for brevity
                if (gameContext.resourceNodes && gameContext.resourceNodes.length > 0) {
                    const targetNode = gameContext.resourceNodes[Math.floor(gameContext.seedRandom.random() * gameContext.resourceNodes.length)]; // Use seeded random
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
                    // console.log(`Unit ${this.type.name} requesting path. MovementType: '${moveType}'`); // ADD THIS LOG (uncommented)
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
                         // console.log(`DEBUG: Unit ${this.type.name} new path found. Length: ${this.path.length}. Waypoints: ${JSON.stringify(this.path)}`); // JSON.stringify can be verbose
                    }
                }

                // PATH FOLLOWING
                if (this.path && this.currentWaypointIndex < this.path.length) {
                    // console.log(`DEBUG: Unit ${this.type.name} (${this.team}, ID: ${this.id || 'N/A'}) at (${this.x.toFixed(1)}, ${this.y.toFixed(1)}). Path length: ${this.path.length}. Current WP Index: ${this.currentWaypointIndex}.`);
                    const waypoint = this.path[this.currentWaypointIndex];
                    const dx = waypoint.x - this.x;
                    const dy = waypoint.y - this.y;
                    const distanceToWaypoint = Math.sqrt(dx * dx + dy * dy);
                    const WAYPOINT_REACH_THRESHOLD = Math.max(this.type.size || 10, TILE_SIZE * 0.75);
                    // console.log(`DEBUG: Unit ${this.type.name} targeting WP ${this.currentWaypointIndex}: (${waypoint.x.toFixed(1)}, ${waypoint.y.toFixed(1)}). Dist: ${distanceToWaypoint.toFixed(1)}. Threshold: ${WAYPOINT_REACH_THRESHOLD.toFixed(1)}`);

                    if (distanceToWaypoint < WAYPOINT_REACH_THRESHOLD) {
                        // console.log(`DEBUG: Unit ${this.type.name} REACHED WP ${this.currentWaypointIndex}.`);
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
                } else if (this.target) {
                    const distToTarget = this.getDistance(this.target);
                    this.handleCombatPositioning(distToTarget, gameContext);
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
                    if (gameContext.seedRandom.random() < 0.02) { this.angle += (gameContext.seedRandom.random() - 0.5) * 0.5; } // Use seeded random
                    const currentSpeed = this.getCurrentSpeed(gameContext);
                    this.vx = Math.cos(this.angle) * currentSpeed * 0.5;
                    this.vy = Math.sin(this.angle) * currentSpeed * 0.5;
                }
            } else { // NO CURRENT PRIMARY DESTINATION (target or patrolTarget)
                // Wander logic
                if (gameContext.seedRandom.random() < 0.02) { this.angle += (gameContext.seedRandom.random() - 0.5) * 0.5; } // Use seeded random
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
        // if (this.captionCooldown <= 0 && gameContext.seedRandom.random() < 0.01) { // Use seeded random
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
                let buildingToBuildType = null;
                
                // Count existing economic buildings
                const teamExtractors = buildings.filter(b => 
                    b.team === this.team && 
                    (b.type.name === 'Mass Extractor' || b.type.name === 'Energy Plant')
                ).length;
                
                const teamFactories = buildings.filter(b => 
                    b.team === this.team && 
                    b.type.produces && b.type.produces.length > 0
                ).length;
                
                // PHASE 1: Critical Resource Start - Build mass extractor first (most important)
                if (teamExtractors === 0) {
                    for (const buildType of this.type.buildList) {
                        if (buildType.name === 'Mass Extractor' &&
                            resources[this.team].mass >= buildType.cost.mass &&
                            resources[this.team].energy >= buildType.cost.energy) {
                            buildingToBuildType = buildType;
                            console.log(`${this.team} Commander building FIRST mass extractor for economy`);
                            break;
                        }
                    }
                }
                
                // PHASE 2: Energy Support - Build energy plant after first mass extractor
                if (!buildingToBuildType && teamExtractors >= 1 && 
                    buildings.filter(b => b.team === this.team && b.type.name === 'Energy Plant').length === 0) {
                    for (const buildType of this.type.buildList) {
                        if (buildType.name === 'Energy Plant' &&
                            resources[this.team].mass >= buildType.cost.mass &&
                            resources[this.team].energy >= buildType.cost.energy) {
                            buildingToBuildType = buildType;
                            console.log(`${this.team} Commander building energy plant for power`);
                            break;
                        }
                    }
                }
                
                // PHASE 3: Emergency Factory - Land factory ASAP for engineers and defense
                if (!buildingToBuildType && teamExtractors >= 1 && teamFactories === 0 &&
                    resources[this.team].mass >= 200 && resources[this.team].energy >= 100) {
                    for (const buildType of this.type.buildList) {
                        if (buildType.name === 'Land Factory' &&
                            resources[this.team].mass >= buildType.cost.mass &&
                            resources[this.team].energy >= buildType.cost.energy) {
                            buildingToBuildType = buildType;
                            console.log(`${this.team} Commander building PRIORITY Land Factory for engineers & defense`);
                            break;
                        }
                    }
                }
                
                // PHASE 4: Economic Expansion - More extractors for sustainability
                if (!buildingToBuildType && teamFactories > 0 && teamExtractors < 4) {
                    for (const buildType of this.type.buildList) {
                        if (buildType.name === 'Mass Extractor' &&
                            resources[this.team].mass >= buildType.cost.mass &&
                            resources[this.team].energy >= buildType.cost.energy) {
                            buildingToBuildType = buildType;
                            console.log(`${this.team} Commander expanding economy with mass extractor`);
                            break;
                        }
                    }
                }
                
                // PHASE 5: Anti-Air Defense - Air factory for air superiority and AA units
                if (!buildingToBuildType && teamFactories === 1 && teamExtractors >= 3 &&
                    resources[this.team].mass >= 150 && resources[this.team].energy >= 120) {
                    // Check if we're under air threat
                    const enemyAirUnits = units.filter(u => 
                        u.team !== this.team && u.type.domain === 'air' && 
                        Math.sqrt((u.x - this.x) ** 2 + (u.y - this.y) ** 2) < 500
                    ).length;
                    
                    if (enemyAirUnits > 0 || gameContext.gameState.gameTime > 120) { // Build air defense after 2 minutes
                        for (const buildType of this.type.buildList) {
                            if (buildType.name === 'Air Factory' &&
                                resources[this.team].mass >= buildType.cost.mass &&
                                resources[this.team].energy >= buildType.cost.energy) {
                                buildingToBuildType = buildType;
                                console.log(`${this.team} Commander building Air Factory for anti-air defense (threats: ${enemyAirUnits})`);
                                break;
                            }
                        }
                    }
                }
                
                // PHASE 6: Late Game Economy - More extractors for advanced units
                if (!buildingToBuildType && teamFactories >= 1 && teamExtractors < 6) {
                    for (const buildType of this.type.buildList) {
                        if ((buildType.name === 'Mass Extractor' || buildType.name === 'Energy Plant') &&
                            resources[this.team].mass >= buildType.cost.mass &&
                            resources[this.team].energy >= buildType.cost.energy) {
                            buildingToBuildType = buildType;
                            console.log(`${this.team} Commander expanding late-game economy`);
                            break;
                        }
                    }
                }

                if (buildingToBuildType) {
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
                    if (this.captionCooldown <= 0 && gameContext.seedRandom.random() < 0.05) { // Use seeded random
                        const progressPercent = Math.floor((this.constructionTask.progress / this.constructionTask.type.buildTime) * 100);
                        captions.push(new CaptionConstructor(this.x, this.y - this.type.size - 10, `Build: ${progressPercent}%`, '#FFF', 8));
                        this.captionCooldown = 30;
                    }
                    if (this.constructionTask.progress >= this.constructionTask.type.buildTime) {
                        const newBuilding = new BuildingContructor(this.constructionTask.targetX, this.constructionTask.targetY, this.team, this.constructionTask.type, gameContext);
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
            
            // FIRST PRIORITY: Find unoccupied resource nodes
            for (const node of resourceNodes) {
                if (!node.occupied && node.amount > 0) {
                    const dist = Math.sqrt((node.x - this.x) ** 2 + (node.y - this.y) ** 2);
                    if (dist < minDist) { minDist = dist; target = node; }
                }
            }
            
            // SECOND PRIORITY: Repair damaged buildings only if no resource nodes available
            if (!target) {
                for (const building of buildings) {
                    if (building.team === this.team && building.hp < building.maxHp) {
                        const dist = this.getDistance(building);
                        if (dist < minDist) { minDist = dist; target = building; }
                    }
                }
            }

            if (target) {
                // Force movement toward resource nodes with high priority
                if (target.amount !== undefined) { // It's a resource node
                    this.target = null; // Clear combat target
                    this.patrolTarget = { x: target.x, y: target.y }; // Use pathfinding
                    this.aggressiveness = 0.2; // Stay defensive while building
                }
                
                this.moveTowards(target, gameContext);
                if (minDist < 100) { // Range to repair or build extractor
                    if (target.hp !== undefined) { // It's a building to repair
                        target.hp = Math.min(target.maxHp, target.hp + 2); // Repair rate
                    } else if (target.amount !== undefined && !target.occupied) { // It's a resource node
                        target.occupied = true;
                        buildings.push(new BuildingContructor(target.x, target.y, this.team,
                            target.type === 'mass' ? BUILDING_TYPES.massExtractor : BUILDING_TYPES.energyExtractor, gameContext));
                        addEvent(gameContext, 'resource', `${this.team.toUpperCase()} Engineer built ${target.type} extractor!`, 2, { x: target.x, y: target.y });
                        console.log(`${this.team} Engineer completed ${target.type} extractor at (${target.x}, ${target.y})`);
                    }
                }
                 return; // Engineer is busy
            } else {
                // If no resources available, patrol near commander for protection
                const commander = units.find(u => u.team === this.team && u.type === UNIT_TYPES.commander);
                if (commander && this.getDistance(commander) > 150) {
                    this.patrolTarget = { x: commander.x, y: commander.y };
                } else {
                    this.defaultMovementAndTargeting(gameContext);
                }
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
                    pushX = (gameContext.seedRandom.random() - 0.5) * SEPARATION_STRENGTH * overlap; // Small random push // Use seeded random
                    pushY = (gameContext.seedRandom.random() - 0.5) * SEPARATION_STRENGTH * overlap; // Use seeded random
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

    determineTacticalRole() {
        if (this.type.range > 150) return 'sniper';
        if (this.type.speed > 2.5) return 'scout';
        if (this.type.damage > 40) return 'assault';
        return 'infantry';
    }

    determineMilitaryRank() {
        if (this.type.name === 'Commander') return 'GENERAL';
        if (this.type.name === 'Experimental') return 'COLONEL';
        if (this.type.tier >= 2.5) return 'MAJOR';
        if (this.type.tier >= 2) return 'CAPTAIN';
        if (this.type.support) return 'LIEUTENANT';
        if (this.type.tier >= 1.5) return 'SERGEANT';
        return 'PRIVATE';
    }

    calculateSurvivalPriority() {
        let priority = 0;
        if (this.type.name === 'Commander') priority += 1000;
        if (this.type.support) priority += 200;
        if (this.type.tier >= 3) priority += 150;
        if (this.type.tier >= 2) priority += 100;
        priority += this.type.maxHp / 10;
        return priority;
    }

    findTarget(gameContext) {
        const { units, buildings } = gameContext;
        let bestTarget = null;
        let bestScore = -1;
        const maxScanRange = this.type.range * 2;

        // First priority: Protect high-value allies by targeting their threats
        const threatenedAllies = units.filter(ally => 
            ally.team === this.team && 
            ally.survivalPriority > this.survivalPriority &&
            this.getDistance(ally) < 250
        );

        for (const ally of threatenedAllies) {
            for (const enemy of units) {
                if (enemy.team !== this.team && enemy.hp > 0) {
                    const allyThreatDist = ally.getDistance(enemy);
                    const myDistToEnemy = this.getDistance(enemy);
                    
                    if (allyThreatDist < ally.type.range * 1.5 && myDistToEnemy < maxScanRange) {
                        let protectionScore = 200; // Base protection score
                        protectionScore += ally.survivalPriority / 10;
                        protectionScore -= myDistToEnemy / 5;
                        
                        if (protectionScore > bestScore) {
                            bestScore = protectionScore;
                            bestTarget = enemy;
                        }
                    }
                }
            }
        }

        // Second priority: Standard target selection
        if (!bestTarget) {
            for (const unit of units) {
                if (unit.team !== this.team && unit.hp > 0) {
                    const dist = this.getDistance(unit);
                    if (dist > maxScanRange) continue;

                    let score = 100 - (dist / 10);
                    
                    // Prioritize by survival value and threat level
                    score += unit.survivalPriority / 20;
                    if (this.tacticalRole === 'sniper' && unit.type.support) score += 50;
                    if (this.tacticalRole === 'assault' && unit.type.name === UNIT_TYPES.commander.name) score += 100;
                    if (unit.type.tier >= 2) score += 30;
                    if (unit.hp < unit.maxHp * 0.3) score += 20;

                    if (score > bestScore) {
                        bestScore = score;
                        bestTarget = unit;
                    }
                }
            }
        }

        // Third priority: Buildings
        if (!bestTarget || bestScore < 50) {
            for (const building of buildings) {
                if (building.team !== this.team && building.hp > 0) {
                    const dist = this.getDistance(building);
                    if (dist > maxScanRange) continue;

                    let score = 60 - (dist / 15);
                    if (building.type.resourceGeneration) score += 40;
                    if (building.type.produces) score += 30;

                    if (score > bestScore) {
                        bestScore = score;
                        bestTarget = building;
                    }
                }
            }
        }
        
        this.target = bestTarget;
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
            this.captionCooldown = 120 + gameContext.seedRandom.random() * 120; // Use seeded random
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
        if (target.type && target.type === UNIT_TYPES.commander && gameContext.seedRandom.random() < 0.1) { // Use seeded random
            const event = addEvent(gameContext, 'battle', `${this.team.toUpperCase()} attacking enemy Commander!`, 3, { x: target.x, y: target.y });
        } else if (gameContext.seedRandom.random() < 0.01 && target.type && target.type.tier >= 2) { // Use seeded random
            const event = addEvent(gameContext, 'battle', `Major engagement: ${this.type.name} vs ${target.type.name}`, 2, { x: this.x, y: this.y });
        }
    }

    takeDamage(damage, gameContext) { // Added gameContext
        const { captions, Caption: CaptionConstructor } = gameContext;
        // Shields already handled by the attacker before calling takeDamage,
        // but if called directly, this logic is a fallback.
        // For now, assuming damage passed is direct HP damage.
        this.hp -= damage;

        if (damage > 0 && gameContext.seedRandom.random() < 0.2) { // Use seeded random
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

    handleCombatPositioning(distToTarget, gameContext) {
        const inRange = distToTarget <= this.type.range;
        const tooClose = distToTarget < this.preferredRange * 0.5;
        
        if (tooClose && this.tacticalRole === 'sniper') {
            // Snipers back away to maintain distance
            this.angle = Math.atan2(this.y - this.target.y, this.x - this.target.x);
            const currentSpeed = this.getCurrentSpeed(gameContext);
            this.vx = Math.cos(this.angle) * currentSpeed * 0.5;
            this.vy = Math.sin(this.angle) * currentSpeed * 0.5;
        } else if (!inRange) {
            // Move closer if out of range
            this.angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            const currentSpeed = this.getCurrentSpeed(gameContext);
            this.vx = Math.cos(this.angle) * currentSpeed;
            this.vy = Math.sin(this.angle) * currentSpeed;
        } else {
            // In optimal range - stop and shoot
            this.vx = 0;
            this.vy = 0;
            if (this.cooldown <= 0) {
                this.attack(this.target, gameContext);
                this.cooldown = this.type.attackSpeed;
                this.lastFireTime = Date.now();
            }
        }
    }

    updateTacticalBehavior(gameContext) {
        const now = Date.now();
        
        // Agglomeration: Units naturally group together for mutual support
        this.executeAgglomeration(gameContext);
        
        // Movement: Coordinated movement based on group dynamics
        this.executeGroupMovement(gameContext);
        
        // Interaction: Units benefit each other based on hierarchy
        this.executeUnitInteractions(gameContext);
        
        // Repositioning: Dynamic tactical positioning
        this.executeRepositioning(gameContext);
    }
    
    executeAgglomeration(gameContext) {
        const { units } = gameContext;
        const agglomerationRange = 400; // Increased range
        const nearbyAllies = units.filter(u => 
            u.team === this.team && 
            u !== this && 
            this.getDistance(u) < agglomerationRange
        );
        
        if (nearbyAllies.length >= 2) { // Only group when 3+ units
            // Calculate center of mass for friendly units
            let centerX = this.x;
            let centerY = this.y;
            let totalWeight = this.survivalPriority;
            
            for (const ally of nearbyAllies) {
                const weight = ally.survivalPriority;
                centerX += ally.x * weight;
                centerY += ally.y * weight;
                totalWeight += weight;
            }
            
            centerX /= totalWeight;
            centerY /= totalWeight;
            
            const distToCenter = Math.sqrt((centerX - this.x) ** 2 + (centerY - this.y) ** 2);
            
            // Strong pull toward center when not in immediate combat
            if (!this.target && !this.isEscaping && distToCenter > 100) {
                const driftStrength = 0.8; // Much stronger pull
                this.angle = Math.atan2(centerY - this.y, centerX - this.x);
                const currentSpeed = this.getCurrentSpeed(gameContext);
                this.vx = Math.cos(this.angle) * currentSpeed * driftStrength;
                this.vy = Math.sin(this.angle) * currentSpeed * driftStrength;
                
                // Add patrol target to center for pathfinding
                this.patrolTarget = { x: centerX, y: centerY };
            }
        }
    }
    
    executeGroupMovement(gameContext) {
        const { units } = gameContext;
        const movementRange = 500; // Increased range
        
        // Find group leader (highest command authority nearby)
        let groupLeader = null;
        let highestAuthority = this.commandAuthority;
        
        for (const ally of units) {
            if (ally.team === this.team && 
                ally.commandAuthority > highestAuthority &&
                this.getDistance(ally) < movementRange) {
                highestAuthority = ally.commandAuthority;
                groupLeader = ally;
            }
        }
        
        if (groupLeader && groupLeader !== this) {
            const leaderDist = this.getDistance(groupLeader);
            const idealDistance = 80 + (this.militaryRank === 'PRIVATE' ? 40 : 0);
            
            // More aggressive following behavior
            if (leaderDist > idealDistance + 20) {
                // Strong movement toward leader using pathfinding
                this.patrolTarget = { x: groupLeader.x, y: groupLeader.y };
                this.target = null; // Clear combat target to focus on formation
                
                // Direct movement for immediate response
                this.angle = Math.atan2(groupLeader.y - this.y, groupLeader.x - this.x);
                const currentSpeed = this.getCurrentSpeed(gameContext);
                this.vx = Math.cos(this.angle) * currentSpeed * 0.9;
                this.vy = Math.sin(this.angle) * currentSpeed * 0.9;
            }
            
            // Formation spacing - spread around leader in tactical positions
            if (leaderDist < 60 && leaderDist > 20) {
                const spreadAngle = this.angle + (gameContext.seedRandom.random() - 0.5) * Math.PI / 2; // Use seeded random
                const spreadDist = 15;
                this.x += Math.cos(spreadAngle) * spreadDist;
                this.y += Math.sin(spreadAngle) * spreadDist;
            }
        }
    }
    
    executeUnitInteractions(gameContext) {
        const { units } = gameContext;
        const interactionRange = 120;
        
        for (const ally of units) {
            if (ally.team === this.team && ally !== this && this.getDistance(ally) < interactionRange) {
                // Higher rank units benefit lower rank units
                if (this.commandAuthority > ally.commandAuthority) {
                    this.provideBenefit(ally);
                } else if (ally.commandAuthority > this.commandAuthority) {
                    this.receiveBenefit(ally);
                }
            }
        }
    }
    
    provideBenefit(subordinate) {
        // Higher ranking units provide benefits to lower ranking ones
        if (this.militaryRank === 'GENERAL' || this.militaryRank === 'COLONEL') {
            // Command bonus: improved accuracy and morale
            subordinate.aggressiveness = Math.min(1.0, subordinate.aggressiveness + 0.01);
            
            // Coordination bonus: share target information
            if (this.target && !subordinate.target) {
                subordinate.target = this.target;
            }
        }
        
        if (this.type.support) {
            // Support units provide direct benefits
            if (this.type.name === 'Shield Generator') {
                subordinate.shields = Math.min(subordinate.maxShields, 
                    subordinate.shields + (this.type.shieldBoost || 2));
            }
        }
    }
    
    receiveBenefit(superior) {
        // Lower ranking units receive benefits from higher ranking ones
        if (superior.militaryRank === 'GENERAL' && this.militaryRank === 'PRIVATE') {
            // Command structure bonus
            this.preferredRange = Math.min(this.type.range, this.preferredRange + 1);
        }
        
        // Protection seeking behavior
        if (this.hp < this.maxHp * 0.6 && superior.hp > superior.maxHp * 0.8) {
            const distToSuperior = this.getDistance(superior);
            if (distToSuperior > 80) {
                // Move closer to healthy superior for protection
                this.patrolTarget = { x: superior.x, y: superior.y };
            }
        }
    }
    
    executeRepositioning(gameContext) {
        const { units } = gameContext;
        
        // Tactical repositioning based on battlefield conditions
        if (this.target) {
            const enemiesNearby = units.filter(enemy => 
                enemy.team !== this.team && 
                enemy.hp > 0 && 
                this.getDistance(enemy) < this.type.range * 1.5
            );
            
            const alliesNearby = units.filter(ally => 
                ally.team === this.team && 
                ally !== this && 
                this.getDistance(ally) < 150
            );
            
            // If outnumbered, reposition to be closer to allies
            if (enemiesNearby.length > alliesNearby.length + 1 && alliesNearby.length > 0) {
                const nearestAlly = alliesNearby.reduce((closest, ally) => 
                    this.getDistance(ally) < this.getDistance(closest) ? ally : closest
                );
                
                // Gradual repositioning toward ally
                const angle = Math.atan2(nearestAlly.y - this.y, nearestAlly.x - this.x);
                this.x += Math.cos(angle) * 0.3;
                this.y += Math.sin(angle) * 0.3;
            }
            
            // If in advantageous position, hold ground
            if (alliesNearby.length > enemiesNearby.length && this.hp > this.maxHp * 0.7) {
                this.aggressiveness = Math.min(1.0, this.aggressiveness + 0.005);
            }
        }
    }

    updateSurvivalBehaviors(gameContext) {
        const now = Date.now();
        
        // Periodic threat assessment
        if (now - this.lastThreatAssessment > 2000) {
            this.assessThreats(gameContext);
            this.lastThreatAssessment = now;
        }
        
        // Self-preservation: flee when critically damaged
        if (this.hp < this.fleeThreshold && !this.isEscaping) {
            this.executeTacticalRetreat(gameContext);
        }
        
        // Shield management for support units
        if (this.type.support && this.shields < this.maxShields * 0.5) {
            this.seekProtection(gameContext);
        }
    }
    
    assessThreats(gameContext) {
        const { units } = gameContext;
        const threatRange = this.type.range * 1.5;
        this.protectionNeeds = [];
        
        let immediateThreats = 0;
        for (const enemy of units) {
            if (enemy.team !== this.team && enemy.hp > 0) {
                const dist = this.getDistance(enemy);
                if (dist < threatRange) {
                    immediateThreats++;
                    // Higher tier units represent greater threats
                    if (enemy.type.tier > this.type.tier) {
                        this.protectionNeeds.push('HEAVY_SUPPORT');
                    }
                    if (enemy.type.damage > this.type.maxHp * 0.3) {
                        this.protectionNeeds.push('IMMEDIATE_RETREAT');
                    }
                }
            }
        }
        
        if (immediateThreats > 2 && this.militaryRank !== 'GENERAL') {
            this.protectionNeeds.push('REINFORCEMENTS');
        }
    }
    
    executeTacticalRetreat(gameContext) {
        const { units } = gameContext;
        
        // Find friendly units to retreat toward
        let bestRetreatPoint = null;
        let maxSafety = -1;
        
        for (const ally of units) {
            if (ally.team === this.team && ally !== this && ally.hp > ally.maxHp * 0.7) {
                const dist = this.getDistance(ally);
                if (dist < 300) {
                    const safety = ally.survivalPriority + ally.hp;
                    if (safety > maxSafety) {
                        maxSafety = safety;
                        bestRetreatPoint = { x: ally.x, y: ally.y };
                    }
                }
            }
        }
        
        if (bestRetreatPoint) {
            this.target = null; // Stop fighting
            this.patrolTarget = bestRetreatPoint;
            this.aggressiveness = 0.1; // Become defensive
        }
    }
    
    seekProtection(gameContext) {
        const { units } = gameContext;
        
        // Find higher-ranking units to stay near
        let protector = null;
        let minDist = Infinity;
        
        for (const ally of units) {
            if (ally.team === this.team && ally.commandAuthority > this.commandAuthority) {
                const dist = this.getDistance(ally);
                if (dist < minDist && dist > 50) { // Not too close, not too far
                    minDist = dist;
                    protector = ally;
                }
            }
        }
        
        if (protector && minDist > 120) {
            this.patrolTarget = { x: protector.x, y: protector.y };
        }
    }
    
    executeCommandHierarchy(gameContext) {
        const { units } = gameContext;
        
        // High-ranking units can issue orders to lower ranks
        if (this.militaryRank === 'GENERAL' || this.militaryRank === 'COLONEL') {
            this.issueStrategicOrders(gameContext);
        }
        
        // Lower ranking units follow orders from higher ranks
        if (this.commandAuthority < 50) {
            this.followSuperiorOrders(gameContext);
        }
    }
    
    issueStrategicOrders(gameContext) {
        const { units } = gameContext;
        const subordinates = units.filter(u => 
            u.team === this.team && 
            u.commandAuthority < this.commandAuthority &&
            this.getDistance(u) < 400
        );
        
        // Order retreats for critically damaged units
        for (const sub of subordinates) {
            if (sub.hp < sub.maxHp * 0.3 && !sub.isEscaping) {
                sub.protectionNeeds.push('COMMANDER_RETREAT_ORDER');
                sub.executeTacticalRetreat(gameContext);
            }
        }
        
        // Coordinate group attacks
        if (subordinates.length >= 3 && this.target) {
            const attackGroup = subordinates.slice(0, 3);
            for (const attacker of attackGroup) {
                if (!attacker.target || this.getDistance(attacker.target) > 200) {
                    attacker.target = this.target;
                    attacker.lastTargetSwitch = Date.now();
                }
            }
        }
    }
    
    followSuperiorOrders(gameContext) {
        const { units } = gameContext;
        
        // Find commanding officer
        let commander = null;
        let highestAuthority = 0;
        
        for (const ally of units) {
            if (ally.team === this.team && 
                ally.commandAuthority > this.commandAuthority &&
                ally.commandAuthority > highestAuthority &&
                this.getDistance(ally) < 300) {
                highestAuthority = ally.commandAuthority;
                commander = ally;
            }
        }
        
        if (commander) {
            // Follow commander's target priorities
            if (commander.target && !this.target && this.getDistance(commander.target) < this.type.range * 2) {
                this.target = commander.target;
            }
            
            // Maintain formation distance based on rank
            const formationDistance = this.militaryRank === 'PRIVATE' ? 80 : 120;
            const distToCommander = this.getDistance(commander);
            
            if (distToCommander > formationDistance + 50 && !this.target) {
                this.patrolTarget = { x: commander.x, y: commander.y };
            }
        }
    }

    updateStuckDetection(gameContext) {
        const dxMoved = this.x - this.lastPositionForStuckCheck.x;
        const dyMoved = this.y - this.lastPositionForStuckCheck.y;
        const distanceMoved = Math.sqrt(dxMoved * dxMoved + dyMoved * dyMoved);

        const wasTryingToMove = (this.target || this.patrolTarget || this.isEscaping || this.vx !== 0 || this.vy !== 0);

        if (wasTryingToMove && distanceMoved < this.significantMoveThreshold) {
            this.stuckFrames++;
        } else {
            this.stuckFrames = 0;
        }

        this.lastPositionForStuckCheck = { x: this.x, y: this.y };

        if (this.stuckFrames > this.STUCK_FRAMES_THRESHOLD && !this.isEscaping) {
            this.isEscaping = true;
            // Use seeded random for escape angle direction
            this.escapeAngle = this.angle + (gameContext.seedRandom.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2); // Use seeded random
            this.escapeDuration = this.ESCAPE_MODE_DURATION_FRAMES;
        }
    }
}

export { Unit };
