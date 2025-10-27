package com.rtsgame.shared.systems

import com.rtsgame.shared.config.FormationConfig
import com.rtsgame.shared.entity.GameUnit
import com.rtsgame.shared.game.GameState
import com.rtsgame.shared.map.Position
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

class FormationSystem(internal val config: FormationConfig) {
    companion object {
        internal const val DEFAULT_UNIT_SIZE = 10f
        /**
         * Small helper used by tests and simple formation placements.
         * For a single unit (unitCount <= 1) the canonical slot is the leader's position.
         * More sophisticated distributions may be implemented later.
         */
        fun calculateSlot(leaderPosition: Position, spacing: Float, index: Int, unitCount: Int): Position {
            if (unitCount <= 1) return leaderPosition

            // For larger groups, arrange on a circle for better distribution
            if (unitCount >= 8) {
                val radius = spacing * (unitCount.toFloat() / 6f)
                val angle = 2f * kotlin.math.PI.toFloat() * (index.toFloat() / unitCount.toFloat())
                val x = leaderPosition.x + kotlin.math.cos(angle) * radius
                val y = leaderPosition.y + kotlin.math.sin(angle) * radius
                return Position(x, y)
            }

            // Center units around the leader in a line. For n units, offset each by (i - (n-1)/2) * spacing
            val centerOffset = (unitCount - 1).toFloat() / 2f
            val offset = (index.toFloat() - centerOffset) * spacing
            val x = leaderPosition.x + offset
            val y = leaderPosition.y
            return Position(x, y)
        }
    }

    fun updateFormation(unit: GameUnit, gameState: GameState): GameUnit {
        val leader = findLeader(unit, gameState)
        return if (leader == null || leader == unit) {
            // Unit is its own leader
            updateLeader(unit)
        } else {
            // Unit is a follower
            updateFollower(unit, leader)
        }
    }

    internal fun findLeader(unit: GameUnit, gameState: GameState): GameUnit? {
        val strategicRange = config.commandRanges.strategic
        return gameState.entities.values
            .filterIsInstance<GameUnit>()
            .filter { it.team == unit.team && it != unit }
            .filter { it.position.distanceTo(unit.position) <= strategicRange }
            .maxByOrNull { it.authority }
    }

    internal fun updateLeader(unit: GameUnit): GameUnit {
        // Leader uses default movement and targeting
        return unit.copy(
            leaderTargetPosition = unit.patrolTarget,
            leaderPredictedPosition = null,
            idealFormationSlotWorld = null
        )
    }

    internal fun updateFollower(unit: GameUnit, leader: GameUnit): GameUnit {
        // Check if follower is too far from leader
        val maxSeparationDistance = config.commandRanges.strategic * config.maxFollowerSeparationDistanceFactor
        if (unit.position.distanceTo(leader.position) > maxSeparationDistance) {
            // Regroup using A* pathfinding
            return unit.copy(
                patrolTarget = leader.position,
                leaderTargetPosition = null,
                leaderPredictedPosition = null,
                idealFormationSlotWorld = null
            )
        }

        // Predict leader's future position
        val predictedPosition = predictLeaderPosition(leader)
        // Determine group's followers deterministically and compute an index for this unit
        val followers = gameState.entities.values
            .filterIsInstance<GameUnit>()
            .filter { it.team == leader.team && it != leader }
            .sortedBy { it.id }
        val unitIndex = followers.indexOfFirst { it.id == unit.id }.let { if (it < 0) 0 else it }
        val unitCount = followers.size
        val spacing = config.minFormationSlotDistance
        val idealSlot = calculateSlot(predictedPosition, spacing, unitIndex, unitCount)

        // Calculate and apply steering forces
        val steering = calculateSteeringForces(unit, idealSlot)
        return applySteeringForces(unit, steering, predictedPosition, idealSlot)
    }

    internal fun predictLeaderPosition(leader: GameUnit): Position {
        val predictionTime = config.predictionTimeSeconds
        return Position(
            leader.position.x + leader.velocity.x * predictionTime,
            leader.position.y + leader.velocity.y * predictionTime
        )
    }

    internal fun calculateIdealFormationSlot(unit: GameUnit, leaderPosition: Position): Position {
        val angle = unit.formationAngle
        val distance = config.minFormationSlotDistance
        return Position(
            leaderPosition.x + cos(angle) * distance,
            leaderPosition.y + sin(angle) * distance
        )
    }

    internal fun calculateSteeringForces(unit: GameUnit, targetPosition: Position): Position {
        var steering = Position(0f, 0f)

        // Seek/Arrive force
        val seekForce = calculateSeekForce(unit, targetPosition)
        steering = steering + seekForce

        // Separation force
        val separationForce = calculateSeparationForce(unit)
        steering = steering + separationForce * config.steeringWeights.separation

        // Terrain avoidance force
        val terrainForce = calculateTerrainAvoidanceForce(unit)
        steering = steering + terrainForce * config.steeringWeights.terrainAvoidance

        // Truncate by max force
        val maxForce = config.defaultMaxForce
        val forceMagnitude = sqrt(steering.x * steering.x + steering.y * steering.y)
        if (forceMagnitude > maxForce) {
            steering = steering * (maxForce / forceMagnitude)
        }

        return steering
    }

    internal fun calculateSeekForce(unit: GameUnit, targetPosition: Position): Position {
        val toTarget = targetPosition - unit.position
        val distance = sqrt(toTarget.x * toTarget.x + toTarget.y * toTarget.y)
        
        // Arrive behavior: slow down when close to target
        val arrivalRadius = DEFAULT_UNIT_SIZE * config.arrivalRadiusFactor
        val speed = if (distance < arrivalRadius) {
            unit.speed * (distance / arrivalRadius)
        } else {
            unit.speed
        }

        return if (distance > 0) {
            toTarget * (speed / distance)
        } else {
            Position(0f, 0f)
        }
    }

    internal fun calculateSeparationForce(unit: GameUnit): Position {
        // Backwards-compatible: default to no nearby units
        return calculateSeparationForce(unit, emptyList())
    }

    // Testable variant: accepts nearby units so unit tests can inject neighbors.
    internal fun calculateSeparationForce(unit: GameUnit, nearbyUnits: List<GameUnit>): Position {
        var force = Position(0f, 0f)
        val neighborRadius = DEFAULT_UNIT_SIZE * config.neighborRadiusFactor

        for (other in nearbyUnits) {
            if (other == unit) continue

            val toUnit = unit.position - other.position
            val distance = sqrt(toUnit.x * toUnit.x + toUnit.y * toUnit.y)

            if (distance > 0f && distance < neighborRadius) {
                val strength = 1f - (distance / neighborRadius)
                // Avoid division by zero; scale by normalized direction
                val normalized = toUnit * (1f / distance)
                force = force + normalized * strength
            }
        }

        return force
    }

    internal fun calculateTerrainAvoidanceForce(unit: GameUnit): Position {
        // TODO: Implement terrain avoidance using feeler
        return Position(0f, 0f)
    }

    internal fun applySteeringForces(
        unit: GameUnit,
        steering: Position,
        predictedPosition: Position,
        idealSlot: Position
    ): GameUnit {
        // Apply steering to velocity
        val newVelocity = unit.velocity + steering

        // Truncate velocity by max speed
        val speed = sqrt(newVelocity.x * newVelocity.x + newVelocity.y * newVelocity.y)
        val finalVelocity = if (speed > unit.speed) {
            newVelocity * (unit.speed / speed)
        } else {
            newVelocity
        }

        // Update angle smoothly
        val newAngle = if (speed > 0) {
            val targetAngle = kotlin.math.atan2(finalVelocity.y, finalVelocity.x)
            val angleDiff = targetAngle - unit.angle
            val maxTurn = config.defaultMaxTurnRateRadiansPerFrame
            unit.angle + angleDiff.coerceIn(-maxTurn, maxTurn)
        } else {
            unit.angle
        }

    return unit.copy(
            velocity = finalVelocity,
            angle = newAngle,
            leaderPredictedPosition = predictedPosition,
            idealFormationSlotWorld = idealSlot
        )
    }
} 