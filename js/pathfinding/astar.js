// js/pathfinding/astar.js

import { TILE_SIZE, GRID_SIZE, TERRAIN_TYPES } from '../config/gameConstants.js'; // Assuming these are available and correctly pathed

class PathNode {
    constructor(x, y, parent = null) {
        this.x = x; // grid x
        this.y = y; // grid y
        this.parent = parent;

        this.gCost = 0; // Cost from start to current node
        this.hCost = 0; // Heuristic cost from current node to end
        this.fCost = 0; // gCost + hCost
    }

    equals(otherNode) {
        return this.x === otherNode.x && this.y === otherNode.y;
    }
}

function calculateHeuristic(nodeA, nodeB) {
    // Manhattan distance
    return Math.abs(nodeA.x - nodeB.x) + Math.abs(nodeA.y - nodeB.y);
}

function isTraversable(gridX, gridY, gameContext, unitMovementType) {
    const { terrain } = gameContext; // gameConstants are imported at module level

    console.log(`isTraversable CALLED: gridX=${gridX}, gridY=${gridY}, unitMovementType='${unitMovementType}'`);

    // Check bounds
    if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) {
        console.log(`isTraversable: Out of bounds.`);
        return false;
    }
    if (!terrain[gridX] || terrain[gridX][gridY] === undefined) { // This check might be problematic if terrain[gridX] itself is undefined
        console.log(`isTraversable: Terrain data missing or undefined at [${gridX}][${gridY}].`);
        return false;
    }

    const terrainTypeAtNodeRaw = terrain[gridX][gridY];
    const terrainTypeAtNode = parseInt(terrainTypeAtNodeRaw, 10);

    console.log(`isTraversable: Node [${gridX},${gridY}] has RawType='${terrainTypeAtNodeRaw}' (type: ${typeof terrainTypeAtNodeRaw}), ParsedType=${terrainTypeAtNode} (type: ${typeof terrainTypeAtNode})`);
    console.log(`isTraversable: Comparing against TERRAIN_TYPES: LAND=${TERRAIN_TYPES.LAND}, WATER=${TERRAIN_TYPES.WATER}, MOUNTAIN=${TERRAIN_TYPES.MOUNTAIN}`);

    if (isNaN(terrainTypeAtNode)) {
        console.log(`isTraversable: Parsed terrainType is NaN for raw value '${terrainTypeAtNodeRaw}'. Node [${gridX},${gridY}] considered not traversable.`);
        return false;
    }

    if (unitMovementType === 'land') {
        const isWater = terrainTypeAtNode === TERRAIN_TYPES.WATER;
        const isMountain = terrainTypeAtNode === TERRAIN_TYPES.MOUNTAIN;
        const result = !isWater && !isMountain;
        console.log(`isTraversable (land unit): terrainTypeAtNode=${terrainTypeAtNode}. IsWater=${isWater}, IsMountain=${isMountain}. Result=${result}`);
        return result;
    } else if (unitMovementType === 'amphibious') {
        const isMountain = terrainTypeAtNode === TERRAIN_TYPES.MOUNTAIN;
        const result = !isMountain;
        console.log(`isTraversable (amphibious unit): terrainTypeAtNode=${terrainTypeAtNode}. IsMountain=${isMountain}. Result=${result}`);
        return result;
    } else if (unitMovementType === 'air') {
        console.log(`isTraversable (air unit): Result=true`);
        return true;
    }

    console.log(`isTraversable: Unknown unitMovementType or fallthrough. unitMovementType='${unitMovementType}'. Result=false`);
    return false;
}

function getNeighbors(node, gameContext, unitMovementType) {
    const neighbors = [];
    const directions = [
        { x: 0, y: -1 }, // Up
        { x: 0, y: 1 },  // Down
        { x: -1, y: 0 }, // Left
        { x: 1, y: 0 }   // Right
        // Add diagonals if needed: { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 }
    ];

    for (const dir of directions) {
        const neighborX = node.x + dir.x;
        const neighborY = node.y + dir.y;

        if (isTraversable(neighborX, neighborY, gameContext, unitMovementType)) {
            neighbors.push(new PathNode(neighborX, neighborY));
        }
    }
    return neighbors;
}

function retracePath(startNode, endNode) {
    const path = [];
    let currentNode = endNode;
    while (currentNode && !currentNode.equals(startNode)) {
        path.push({ x: currentNode.x, y: currentNode.y }); // Store grid coordinates
        currentNode = currentNode.parent;
    }
    if (currentNode && currentNode.equals(startNode)) {
         path.push({ x: currentNode.x, y: currentNode.y });
    }
    path.reverse(); // Path is from start to end

    // Convert grid coordinates to world coordinates (center of tile)
    return path.map(node => ({
        x: node.x * TILE_SIZE + TILE_SIZE / 2,
        y: node.y * TILE_SIZE + TILE_SIZE / 2
    }));
}

export function findPath(startCoords, endCoords, gameContext, unitMovementType = 'land') {
    // Convert world coordinates to grid coordinates
    const startGridX = Math.floor(startCoords.x / TILE_SIZE);
    const startGridY = Math.floor(startCoords.y / TILE_SIZE);
    const endGridX = Math.floor(endCoords.x / TILE_SIZE);
    const endGridY = Math.floor(endCoords.y / TILE_SIZE);

    const startNode = new PathNode(startGridX, startGridY);
    const endNode = new PathNode(endGridX, endGridY);

    // Check if start or end nodes are not traversable
    if (!isTraversable(startNode.x, startNode.y, gameContext, unitMovementType)) {
        console.warn(`A* Pathfinding: Start node (${startNode.x},${startNode.y}) type '${unitMovementType}' not traversable.`);
        return null;
    }
    if (!isTraversable(endNode.x, endNode.y, gameContext, unitMovementType)) {
        console.warn(`A* Pathfinding: End node (${endNode.x},${endNode.y}) type '${unitMovementType}' not traversable.`);
        return null;
    }


    const openSet = [];
    const closedSet = new Set(); // Stores 'x,y' strings for efficient lookup

    openSet.push(startNode);

    let iterationCount = 0;
    const MAX_ITERATIONS = GRID_SIZE * GRID_SIZE * 2; // Safety break for performance

    while (openSet.length > 0) {
        iterationCount++;
        if (iterationCount > MAX_ITERATIONS) {
            console.warn("A* pathfinding exceeded max iterations.");
            return null; // Path not found or too complex
        }

        // Find node with lowest fCost in openSet (or use index 0 due to sort)
        let currentNode = openSet[0];

        // Remove current node from openSet and add to closedSet
        openSet.shift(); // remove first element
        closedSet.add(`${currentNode.x},${currentNode.y}`);

        // Path found
        if (currentNode.equals(endNode)) {
            return retracePath(startNode, currentNode);
        }

        const neighbors = getNeighbors(currentNode, gameContext, unitMovementType);
        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            if (closedSet.has(neighborKey)) {
                continue; // Already evaluated
            }

            const newGCost = currentNode.gCost + 1; // Assuming cost of 1 to move to an adjacent tile

            let existingNodeInOpenSet = null;
            for(let i=0; i < openSet.length; i++) {
                if(openSet[i].equals(neighbor)) {
                    existingNodeInOpenSet = openSet[i];
                    break;
                }
            }

            if (!existingNodeInOpenSet || newGCost < existingNodeInOpenSet.gCost) {
                neighbor.gCost = newGCost;
                neighbor.hCost = calculateHeuristic(neighbor, endNode);
                neighbor.fCost = neighbor.gCost + neighbor.hCost;
                neighbor.parent = currentNode;

                if (!existingNodeInOpenSet) {
                    openSet.push(neighbor);
                }
                // If it was already in openSet, its costs are updated.
                // The list will be re-sorted.
            }
        }
         // Sort openSet by fCost to keep the lowest fCost node at the beginning
        openSet.sort((a, b) => a.fCost - b.fCost || a.hCost - b.hCost);
    }

    console.log(`A* Pathfinding: No path found from (${startGridX},${startGridY}) to (${endGridX},${endGridY}) for ${unitMovementType}.`);
    return null; // No path found
}
