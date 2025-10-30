package rtsgame.core

import kotlin.math.sqrt

/**
 * MovementSystem handles entity movement physics and pathfinding
 */
object MovementSystem {
    /**
     * Compute next position moving from current towards target at given speed and dt
     */
    fun stepPosition(current: Vec3, target: Vec3, speed: Float, dt: Float): Vec3 {
        val dx = target.first - current.first
        val dy = target.second - current.second
        val dz = target.third - current.third

        val distance = sqrt(dx * dx + dy * dy + dz * dz)

        if (distance < 0.001f) {
            // Already at target
            return target
        }

        val directionX = dx / distance
        val directionY = dy / distance
        val directionZ = dz / distance

        val moveDistance = speed * dt
        if (moveDistance <= 0f) {
            return current
        }

        if (moveDistance >= distance) {
            // Would overshoot target, so just return target
            return target
        }

        val newX = current.first + directionX * moveDistance
        val newY = current.second + directionY * moveDistance
        val newZ = current.third + directionZ * moveDistance

        return Vec3(newX, newY, newZ)
    }
    
    /**
     * Predict position along a given path beyond simple velocity projection
     * This follows the A* path rather than just projecting velocity
     */
    fun predictPositionAlongPath(
        current: Position,
        velocity: Vec3,
        path: List<Position>,
        predictionTime: Float
    ): Position {
        if (predictionTime <= 0f) {
            return current
        }
        if (path.isEmpty()) {
            // No path available, fall back to velocity projection
            val projectedX = current.x + velocity.first * predictionTime
            val projectedY = current.y + velocity.second * predictionTime
            return Position(projectedX, projectedY)
        }

        val currentSpeed = sqrt(velocity.first * velocity.first + velocity.second * velocity.second)
        if (currentSpeed <= 0f) {
            return current // Not moving
        }

        val fullPath = listOf(current) + path
        var remainingTime = predictionTime
        var previousDirection: Pair<Float, Float>? = null

        var segmentIndex = 0
        while (segmentIndex < fullPath.size - 1 && remainingTime > 0f) {
            val segmentStart = fullPath[segmentIndex]
            val segmentEnd = fullPath[segmentIndex + 1]

            val dx = segmentEnd.x - segmentStart.x
            val dy = segmentEnd.y - segmentStart.y
            val length = sqrt(dx * dx + dy * dy)
            if (length <= 0f) {
                segmentIndex++
                continue
            }

            val direction = dx / length to dy / length
            val turnPenalty = previousDirection?.let { prev ->
                val dot = (prev.first * direction.first) + (prev.second * direction.second)
                val clampedDot = dot.coerceIn(-1f, 1f)
                val deviationFactor = (1f - clampedDot) * 0.5f // 0 (straight) → 1 (opposite)
                1f + deviationFactor * TURN_SLOWDOWN_SCALE
            } ?: 1f

            val effectiveSpeed = currentSpeed / turnPenalty
            val timeToTraverse = length / effectiveSpeed

            if (remainingTime <= timeToTraverse) {
                val traveledDistance = remainingTime * effectiveSpeed
                val t = traveledDistance / length
                return Position(
                    segmentStart.x + dx * t,
                    segmentStart.y + dy * t
                )
            }

            remainingTime -= timeToTraverse
            previousDirection = direction
            segmentIndex++
        }

        return fullPath.last()
    }

    private const val TURN_SLOWDOWN_SCALE = 8f

    /**
     * Calculate steering force for formation movement
     * TODO: Implement proper steering behavior
     */
    fun calculateSteeringForce(current: Position, target: Position, velocity: Vec3, maxForce: Float): Vec3 {
        // Stub implementation - simple direction toward target
        val dx = target.x - current.x
        val dy = target.y - current.y
        val distance = sqrt(dx * dx + dy * dy)
        
        if (distance < 0.001f) return Vec3(0f, 0f, 0f)
        
        val force = minOf(maxForce, distance)
        return Vec3(dx / distance * force, dy / distance * force, 0f)
    }
    
    /**
     * Apply steering force to velocity
     * TODO: Implement proper steering integration
     */
    fun applySteering(velocity: Vec3, steering: Vec3, maxSpeed: Float, dt: Float): Vec3 {
        // Stub implementation - add steering and clamp to max speed
        val newVx = velocity.first + steering.first * dt
        val newVy = velocity.second + steering.second * dt
        val newVz = velocity.third + steering.third * dt
        
        val speed = sqrt(newVx * newVx + newVy * newVy + newVz * newVz)
        if (speed > maxSpeed) {
            val scale = maxSpeed / speed
            return Vec3(newVx * scale, newVy * scale, newVz * scale)
        }
        
        return Vec3(newVx, newVy, newVz)
    }
}