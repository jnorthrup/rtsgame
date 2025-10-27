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
    fun predictPositionAlongPath(current: Position, velocity: Vec3, path: List<Position>, predictionTime: Float): Position {
        if (path.isEmpty()) {
            // No path available, fall back to velocity projection
            val distance = velocity.first * predictionTime
            return Position(current.x + distance, current.y + velocity.second * predictionTime)
        }
        
        // Calculate speed from velocity magnitude
        val currentSpeed = sqrt(velocity.first * velocity.first + velocity.second * velocity.second)
        if (currentSpeed <= 0f) {
            return current // Not moving
        }
        
        // Calculate total distance to travel
        val totalDistance = currentSpeed * predictionTime
        
        // Build the complete path including current position
        val fullPath = listOf(current) + path
        var remainingDistance = totalDistance
        var currentSegment = 0
        
        // Travel along the path segments
        while (currentSegment < fullPath.size - 1 && remainingDistance > 0) {
            val segmentStart = fullPath[currentSegment]
            val segmentEnd = fullPath[currentSegment + 1]
            
            val segmentDx = segmentEnd.x - segmentStart.x
            val segmentDy = segmentEnd.y - segmentStart.y
            val segmentLength = sqrt(segmentDx * segmentDx + segmentDy * segmentDy)
            
            if (segmentLength <= 0f) {
                currentSegment++
                continue
            }
            
            if (remainingDistance <= segmentLength) {
                // Final position is within this segment
                val t = remainingDistance / segmentLength
                return Position(
                    segmentStart.x + segmentDx * t,
                    segmentStart.y + segmentDy * t
                )
            } else {
                // Move to end of this segment and continue
                remainingDistance -= segmentLength
                currentSegment++
            }
        }
        
        // If we've consumed all path segments, return the final path point
        return if (fullPath.isNotEmpty()) fullPath.last() else current
    }    /**
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