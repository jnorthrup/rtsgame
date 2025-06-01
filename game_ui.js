// game_ui.js
// This script assumes gameState, canvas, camera, units, buildings are global variables
// defined in the main script of index.html before this script's functions are called.

function updateIntrospectionUIDisplay() {
    const introspectionDiv = document.getElementById('introspection');
    if (!introspectionDiv) return;

    if (typeof gameState === 'undefined' || gameState.hoveredEntity === undefined || gameState.hoveredEntity === null) {
        introspectionDiv.style.display = 'none';
        return;
    }
    const entity = gameState.hoveredEntity;

    if (entity && entity.type) { // Ensure entity and its type property exist
        introspectionDiv.innerHTML = ''; // Clear previous content
        let html = '';
        const entityType = entity.type;
        const teamColor = entity.team === 'blue' ? '#44f' : '#f44';

        html += `<div class="intro-header" style="color: ${teamColor};">${entity.update ? 'Unit' : 'Building'}: ${entityType.name} (${entity.team})</div>`;

        html += `<div class="intro-line"><span class="intro-label">HP:</span> <span class="intro-value">${Math.floor(entity.hp)}/${entityType.maxHp}</span></div>`;
        if (entityType.maxHp > 0) {
            const hpPercent = (entity.hp / entityType.maxHp) * 100;
            html += `<div class="health-bar"><div class="health-fill" style="width: ${hpPercent}%;"></div></div>`;
        }

        const currentShields = entity.shields !== undefined ? entity.shields : (entityType.shields !== undefined ? entityType.shields : 0);
        const maxShields = entity.maxShields !== undefined ? entity.maxShields : (entityType.maxShields !== undefined ? entityType.maxShields : (entityType.shields !== undefined ? entityType.shields : 0));

        if (maxShields > 0 || typeof entity.shields === 'number') {
            html += `<div class="intro-line"><span class="intro-label">Shields:</span> <span class="intro-value">${Math.floor(currentShields)}/${maxShields}</span></div>`;
            if (maxShields > 0) {
                const shieldPercent = (currentShields / maxShields) * 100;
                html += `<div class="shield-bar"><div class="shield-fill" style="width: ${shieldPercent}%;"></div></div>`;
            } else {
                html += `<div class="shield-bar"><div class="shield-fill" style="width: 0%;"></div></div>`;
            }
        }

        html += `<div class="intro-line"><span class="intro-label">Position:</span> <span class="intro-value">(${entity.x.toFixed(1)}, ${entity.y.toFixed(1)})</span></div>`;

        if (entity.update) {
            html += `<div class="intro-line"><span class="intro-label">Speed:</span> <span class="intro-value">${entityType.speed}</span></div>`;
            html += `<div class="intro-line"><span class="intro-label">Damage:</span> <span class="intro-value">${entityType.damage}</span></div>`;
            html += `<div class="intro-line"><span class="intro-label">Range:</span> <span class="intro-value">${entityType.range}</span></div>`;
            let taskDescription = 'Idle';
            if (entity.target && entity.target.type) {
                taskDescription = `Attacking ${entity.target.type.name} (${entity.target.team})`;
                if (entity.target.maxHp) {
                    html += `<div class="intro-line" style="padding-left: 10px;"><span class="intro-label">Target HP:</span> <span class="intro-value">${Math.floor(entity.target.hp)}/${entity.target.maxHp}</span></div>`;
                } else {
                    html += `<div class="intro-line" style="padding-left: 10px;"><span class="intro-label">Target:</span> <span class="intro-value">${entity.target.type.name} (Info N/A)</span></div>`;
                }
            } else if (entity.patrolTarget) {
                taskDescription = `Patrolling to (${entity.patrolTarget.x.toFixed(0)}, ${entity.patrolTarget.y.toFixed(0)})`;
            } else if (entity.vx !== 0 || entity.vy !== 0) {
                taskDescription = 'Moving';
            }
            html += `<div class="intro-line"><span class="intro-label">Task:</span> <span class="intro-value">${taskDescription}</span></div>`;
        }

        if (entity.productionQueue) {
            if (entity.productionQueue.length > 0) {
                const currentProd = entity.productionQueue[0];
                const progress = (entity.productionProgress / currentProd.buildTime) * 100;
                html += `<div class="intro-line"><span class="intro-label">Producing:</span> <span class="intro-value">${currentProd.name} (${progress.toFixed(0)}%)</span></div>`;
                if (currentProd.cost) {
                    html += `<div class="intro-line" style="padding-left: 10px;"><span class="intro-label">Unit Cost:</span> <span class="intro-value">M:${currentProd.cost.mass || 0}, E:${currentProd.cost.energy || 0}</span></div>`;
                }
            } else {
                html += `<div class="intro-line"><span class="intro-label">Production:</span> <span class="intro-value">Idle</span></div>`;
            }
        }
        if (entityType.resourceGeneration) {
            html += `<div class="intro-line"><span class="intro-label">Generates:</span> <span class="intro-value">${entityType.resourceGeneration.amount} ${entityType.resourceGeneration.type}/sec</span></div>`;
        }

        introspectionDiv.innerHTML = html;
        if (typeof canvas !== 'undefined' && canvas) {
            const canvasRect = canvas.getBoundingClientRect();
            introspectionDiv.style.position = 'absolute';
            introspectionDiv.style.top = (canvasRect.top + document.documentElement.scrollTop + 20) + 'px';
            introspectionDiv.style.right = '20px';
            introspectionDiv.style.left = 'auto';
            introspectionDiv.style.display = 'block';
        } else {
             introspectionDiv.style.display = 'none';
        }
    } else {
        introspectionDiv.style.display = 'none';
    }
}

function handleIntrospectionHover(event) {
    if (typeof gameState === 'undefined' || typeof canvas === 'undefined' || typeof camera === 'undefined' || typeof units === 'undefined' || typeof buildings === 'undefined') {
        return;
    }
    const worldXMouse = (event.clientX - canvas.width / 2) / camera.zoom + camera.x;
    const worldYMouse = (event.clientY - canvas.height / 2) / camera.zoom + camera.y;
    let foundEntity = null;

    for (let i = units.length - 1; i >= 0; i--) {
        const unit = units[i];
        if (!unit.type) continue;
        const unitSize = unit.type.size;
        if (worldXMouse >= unit.x - unitSize / 2 && worldXMouse <= unit.x + unitSize / 2 &&
            worldYMouse >= unit.y - unitSize / 2 && worldYMouse <= unit.y + unitSize / 2) {
            foundEntity = unit;
            break;
        }
    }
    if (!foundEntity) {
        for (let i = buildings.length - 1; i >= 0; i--) {
            const building = buildings[i];
            if (!building.type) continue;
            const buildingSize = building.type.size;
            if (worldXMouse >= building.x - buildingSize / 2 && worldXMouse <= building.x + buildingSize / 2 &&
                worldYMouse >= building.y - buildingSize / 2 && worldYMouse <= building.y + buildingSize / 2) {
                foundEntity = building;
                break;
            }
        }
    }
    gameState.hoveredEntity = foundEntity;
}
