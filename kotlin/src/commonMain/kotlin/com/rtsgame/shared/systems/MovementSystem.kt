package com.rtsgame.shared.systems

import com.rtsgame.shared.entity.Position
import com.rtsgame.shared.entity.GameUnit
import com.rtsgame.shared.game.GameState
import com.rtsgame.shared.map.GameMap
import com.rtsgame.shared.pathfinding.Pathfinder
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

class MovementSystem(internal val gameMap: GameMap) {
    internal val pathfinder = Pathfinder(gameMap)

    companion object {
        // Compute next position moving from current towards target at given speed and dt
        fun stepPosition(current: com.rtsgame.shared.map.Position, target: com.rtsgame.shared.map.Position, speed: Float, dt: Float): com.rtsgame.shared.map.Position {
            val dir = current.directionTo(target)
            val moveDist = speed * dt
            val dx = dir.x * moveDist
            val dy = dir.y * moveDist
            return com.rtsgame.shared.map.Position(current.x + dx, current.y + dy)
        }
    }

    fun update(gameState: GameState, deltaTime: Float): GameState {
        var newState = gameState

        gameState.entities.values.forEach { entity ->
            if (entity is GameUnit && entity.path.isNotEmpty()) {
                val updatedUnit = updateUnitMovement(entity, deltaTime)
                newState = newState.updateEntity(updatedUnit)
            }
        }

        return newState
    }

    internal fun updateUnitMovement(unit: GameUnit, deltaTime: Float): GameUnit {
        if (unit.path.isEmpty() || unit.currentPathIndex >= unit.path.size) {
            return unit
        }

        val targetPosition = unit.path[unit.currentPathIndex]
        val currentPosition = unit.position

        // Calculate direction and distance
        val dx = targetPosition.x - currentPosition.x
        val dy = targetPosition.y - currentPosition.y
        val distance = sqrt(dx * dx + dy * dy)

        // If we're close enough to the target, move to the next waypoint
        if (distance < 1f) {
            return unit.advancePath()
        }

        // Calculate movement
        val speed = unit.speed * deltaTime
        val angle = atan2(dy, dx)
        val newX = currentPosition.x + cos(angle) * speed
        val newY = currentPosition.y + sin(angle) * speed

        // Check if the new position is walkable
        val newPosition = Position(newX, newY)
        if (gameMap.isWalkable(newPosition)) {
            return unit.updatePosition(newPosition)
        } else {
            // If the path is blocked, recalculate path using the unit's destination (last waypoint)
            val destination = unit.path.lastOrNull() ?: currentPosition
            val newPath = pathfinder.findPath(currentPosition, destination)
            return if (newPath != null) {
                unit.setPath(newPath)
            } else {
                // no path -> stop moving
                unit.copy(path = emptyList(), currentPathIndex = 0)
            }
        }
    }

    fun moveUnit(gameState: GameState, unitId: String, targetPosition: Position): GameState {
        val unit = gameState.entities[unitId] as? GameUnit ?: return gameState
        val path = pathfinder.findPath(unit.position, targetPosition) ?: return gameState

        val updatedUnit = unit.setPath(path)
        return gameState.updateEntity(updatedUnit)
    }
} 