import { Caption } from '../entities/Caption.js';
// currentUnits, currentBuildings, currentCaptions are passed as arguments

export function coordinateAttacks(currentUnits, currentBuildings, currentCaptions) {
    if (!currentUnits || !currentBuildings || !currentCaptions) {
        // console.warn("Missing dependencies for coordinateAttacks");
        return;
    }
    for (const team of ['blue', 'red']) {
        const teamCombatUnits = currentUnits.filter(u => u.team === team && u.type && !u.type.support);
        const processedUnits = new Set();

        for (const unit of teamCombatUnits) {
            if (processedUnits.has(unit)) continue;

            // Unit._getDistance was an internal method. If Unit class uses imported getDistance,
            // this would need adjustment or Unit instances need that method.
            // Assuming _getDistance is available on unit instances as per original structure.
            const nearbyFriendlyUnits = teamCombatUnits.filter(u =>
                !processedUnits.has(u) &&
                unit._getDistance(u) < 150
            );

            if (nearbyFriendlyUnits.length >= 3) {
                const currentGroup = [unit, ...nearbyFriendlyUnits];
                currentGroup.forEach(u => processedUnits.add(u));

                const potentialEnemies = [
                    ...currentUnits.filter(u => u.team !== team && u.hp > 0), // only living enemies
                    ...currentBuildings.filter(b => b.team !== team && b.hp > 0) // only standing buildings
                ];

                if (potentialEnemies.length > 0) {
                    const groupCenterX = currentGroup.reduce((sum, u) => sum + u.x, 0) / currentGroup.length;
                    const groupCenterY = currentGroup.reduce((sum, u) => sum + u.y, 0) / currentGroup.length;

                    let bestTargetForGroup = null;
                    let highestScore = -Infinity;

                    for (const enemy of potentialEnemies) {
                        const distanceToEnemy = Math.sqrt((enemy.x - groupCenterX) ** 2 + (enemy.y - groupCenterY) ** 2);
                        let targetScore = 1000 / (distanceToEnemy + 100);

                        if (enemy.type) {
                            if (enemy.type.name === 'Commander') targetScore *= 3;
                            else if (enemy.type.tier && enemy.type.tier >= 2) targetScore *= 2;
                            else if (enemy.type.resourceGeneration) targetScore *= 1.5;
                        }
                        // Consider enemy HP - lower HP might be better to finish off, or full HP worse
                        targetScore *= (1 / (enemy.hp / enemy.maxHp + 0.1)); // Prioritize damaged targets


                        if (targetScore > highestScore) {
                            highestScore = targetScore;
                            bestTargetForGroup = enemy;
                        }
                    }

                    if (bestTargetForGroup) {
                        currentGroup.forEach(u => {
                            u.target = bestTargetForGroup;
                            u.lastTargetSwitch = Date.now();
                        });
                        currentCaptions.push(new Caption(groupCenterX, groupCenterY,
                            `Coordinated strike!`, '#ff0', 14));
                    }
                }
            }
        }
    }
}
