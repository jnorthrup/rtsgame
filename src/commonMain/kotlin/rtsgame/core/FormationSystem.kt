package rtsgame.core

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * FormationSystem handles unit positioning in formations
 */
object FormationSystem {
    /**
     * Calculate the position for a unit in a formation
     * @param leaderPos Position of the formation leader
     * @param unitIndex Index of the unit in the formation (0 = leader)
     * @param totalUnits Total number of units in the formation
     * @param spacing Distance between units
     * @return Position for the unit
     */
    fun calculateSlot(leaderPos: Vec3, unitIndex: Int, totalUnits: Int, spacing: Float): Vec3 {
        if (unitIndex == 0 || totalUnits <= 1) {
            return leaderPos
        }

        // Simple line formation for now
        // Units arrange in a line perpendicular to movement direction
        // For simplicity, assume formation faces positive X direction
        
        val unitsPerRow = 5 // Max units per row
        val row = unitIndex / unitsPerRow
        val col = unitIndex % unitsPerRow
        
        // Center the formation
        val offsetFromCenter = (unitsPerRow - 1) * spacing * 0.5f
        val xOffset = col * spacing - offsetFromCenter
        val zOffset = row * spacing // Behind the leader
        
        return Vec3(
            leaderPos.first + xOffset,
            leaderPos.second,
            leaderPos.third + zOffset
        )
    }

    /**
     * Calculate slot position for a unit in formation using Position
     */
    fun calculateSlot(leaderPosition: Position, spacing: Float, index: Int, unitCount: Int): Position {
        return calculateSlot(leaderPosition, spacing, index, unitCount, "DEFAULT")
    }
    
    /**
     * Calculate slot position for a unit in formation with specific formation type
     */
    fun calculateSlot(leaderPosition: Position, spacing: Float, index: Int, unitCount: Int, formationType: String): Position {
        if (unitCount <= 1) return leaderPosition

        when (formationType.uppercase()) {
            "LINE" -> {
                // Horizontal line formation
                val centerOffset = (unitCount - 1).toFloat() / 2f
                val offset = (index.toFloat() - centerOffset) * spacing
                return Position(leaderPosition.x + offset, leaderPosition.y)
            }
            "COLUMN" -> {
                // Vertical line formation
                val offset = index.toFloat() * spacing
                return Position(leaderPosition.x, leaderPosition.y + offset)
            }
            "CIRCLE" -> {
                // Circular formation
                val radius = spacing * (unitCount.toFloat() / 6f)
                val angle = 2f * PI.toFloat() * (index.toFloat() / unitCount.toFloat())
                val x = leaderPosition.x + cos(angle) * radius
                val y = leaderPosition.y + sin(angle) * radius
                return Position(x, y)
            }
            "WEDGE" -> {
                // V-shaped formation
                val row = index / 2
                val side = if (index % 2 == 0) -1 else 1
                val x = leaderPosition.x + side * row * spacing * 0.5f
                val y = leaderPosition.y + row * spacing * 0.8f
                return Position(x, y)
            }
            else -> {
                // DEFAULT behavior - smart arrangement based on unit count
                
                // For larger groups (>=8), arrange on a circle for better distribution
                if (unitCount >= 8) {
                    val radius = spacing * (unitCount.toFloat() / 6f)
                    val angle = 2f * PI.toFloat() * (index.toFloat() / unitCount.toFloat())
                    val x = leaderPosition.x + cos(angle) * radius
                    val y = leaderPosition.y + sin(angle) * radius
                    return Position(x, y)
                }

                // For medium groups (4-7), arrange in rows
                if (unitCount >= 4) {
                    val rowSize = (unitCount + 1) / 2 // ceil division
                    val row = index / rowSize
                    val col = index % rowSize
                    val centerOffset = (rowSize - 1).toFloat() / 2f
                    val x = leaderPosition.x + (col.toFloat() - centerOffset) * spacing
                    val y = leaderPosition.y + (0.5f - row.toFloat()) * spacing
                    return Position(x, y)
                }

                // For small groups (2-3), center units around the leader in a line
                val centerOffset = (unitCount - 1).toFloat() / 2f
                val offset = (index.toFloat() - centerOffset) * spacing
                val x = leaderPosition.x + offset
                val y = leaderPosition.y
                return Position(x, y)
            }
        }
    }
    
    /**
     * Calculate adjusted leader speed based on follower positions
     * Slows down when followers are too far behind
     */
    fun calculateLeaderSpeed(leader: Position, followers: List<Position>, baseSpeed: Float): Float {
        if (followers.isEmpty()) return baseSpeed
        
        // Calculate distances from leader to each follower
        val distances = followers.map { leader.distanceTo(it) }
        val maxDistance = distances.maxOrNull() ?: 0f
        val avgDistance = distances.average().toFloat()
        
        // Define ideal formation spacing
        val idealDistance = 5f
        val maxFormationDistance = 15f
        
        // If followers are too far behind, slow down the leader
        val adjustmentFactor = when {
            maxDistance <= idealDistance -> 1f // No adjustment needed
            maxDistance > maxFormationDistance -> 0.2f // Very slow for scattered formation
            else -> {
                // Linear interpolation between ideal and max distance
                val overDistance = maxDistance - idealDistance
                val maxOverDistance = maxFormationDistance - idealDistance
                val slowDownRatio = overDistance / maxOverDistance
                1f - (0.8f * slowDownRatio) // Slow down by up to 80%
            }
        }
        
        // Additional adjustment based on average distance (formation cohesion)
        val cohesionFactor = when {
            avgDistance <= idealDistance -> 1f
            avgDistance > idealDistance * 2 -> 0.5f
            else -> 1f - ((avgDistance - idealDistance) / (idealDistance * 2)) * 0.5f
        }
        
        val finalSpeed = baseSpeed * adjustmentFactor * cohesionFactor
        return kotlin.math.max(0.1f * baseSpeed, finalSpeed) // Never go below 10% of base speed
    }
    
    /**
     * Calculate combat bonus for formation type based on unit positioning
     */
    fun calculateCombatBonus(unitPositions: List<Position>, formationType: String): Float {
        if (unitPositions.size < 2) return 0f
        
        // Calculate formation cohesion (how well units maintain formation)
        val cohesion = calculateFormationCohesion(unitPositions, formationType)
        
        // Base bonus multiplier based on formation type
        val baseBonus = when (formationType.uppercase()) {
            "LINE" -> {
                // Line formation: flanking bonus, better for ranged combat
                val alignment = calculateLineAlignment(unitPositions)
                2.0f * alignment * cohesion
            }
            "CIRCLE" -> {
                // Circle formation: defensive bonus, all-around protection
                val circularness = calculateCircularFormation(unitPositions)
                1.5f * circularness * cohesion
            }
            "WEDGE" -> {
                // Wedge formation: breakthrough bonus, concentrated attack
                val wedgeShape = calculateWedgeFormation(unitPositions)
                2.5f * wedgeShape * cohesion
            }
            "COLUMN" -> {
                // Column formation: mobility bonus, good for movement
                val columnAlignment = calculateColumnAlignment(unitPositions)
                1.2f * columnAlignment * cohesion
            }
            else -> {
                // Default/scattered: minimal bonus
                0.5f * cohesion
            }
        }
        
        // Apply unit count scaling (more units = more bonus, but diminishing returns)
        val unitCountBonus = kotlin.math.sqrt(unitPositions.size.toFloat()) / 2f
        
        return baseBonus * unitCountBonus
    }
    
    private fun calculateFormationCohesion(positions: List<Position>, formationType: String): Float {
        if (positions.size < 2) return 0f
        
        // Calculate average distance between units
        var totalDistance = 0f
        var pairs = 0
        
        for (i in positions.indices) {
            for (j in (i + 1) until positions.size) {
                totalDistance += positions[i].distanceTo(positions[j])
                pairs++
            }
        }
        
        val avgDistance = totalDistance / pairs
        val idealDistance = 3f // Ideal spacing for formations
        
        // Cohesion is best when units are at ideal distance (not too close, not too far)
        return kotlin.math.exp(-kotlin.math.abs(avgDistance - idealDistance) / idealDistance)
    }
    
    private fun calculateLineAlignment(positions: List<Position>): Float {
        if (positions.size < 3) return 1f
        
        // For line formation, check how well units align on Y-axis
        val avgY = positions.map { it.y }.average().toFloat()
        val yVariance = positions.map { (it.y - avgY) * (it.y - avgY) }.average().toFloat()
        
        // Better alignment = lower variance = higher bonus
        return kotlin.math.exp(-yVariance / 4f)
    }
    
    private fun calculateCircularFormation(positions: List<Position>): Float {
        if (positions.size < 3) return 0.5f
        
        // Calculate center point
        val centerX = positions.map { it.x }.average().toFloat()
        val centerY = positions.map { it.y }.average().toFloat()
        val center = Position(centerX, centerY)
        
        // Check how well units form a circle (similar distances from center)
        val distances = positions.map { it.distanceTo(center) }
        val avgDistance = distances.average().toFloat()
        val distanceVariance = distances.map { (it - avgDistance) * (it - avgDistance) }.average().toFloat()
        
        return kotlin.math.exp(-distanceVariance / (avgDistance * avgDistance + 1f))
    }
    
    private fun calculateWedgeFormation(positions: List<Position>): Float {
        if (positions.size < 3) return 0.5f
        
        // Find the frontmost unit (smallest Y, assuming north is negative Y)
        val frontUnit = positions.minByOrNull { it.y } ?: return 0f
        
        // Check if other units form a V shape behind the front unit
        val behindUnits = positions.filter { it != frontUnit && it.y > frontUnit.y }
        if (behindUnits.isEmpty()) return 0.5f
        
        // Calculate how well units spread out in V formation
        val leftUnits = behindUnits.filter { it.x < frontUnit.x }
        val rightUnits = behindUnits.filter { it.x > frontUnit.x }
        
        val balance = kotlin.math.min(leftUnits.size, rightUnits.size).toFloat() / 
                     kotlin.math.max(leftUnits.size, rightUnits.size).toFloat()
        
        return balance
    }
    
    private fun calculateColumnAlignment(positions: List<Position>): Float {
        if (positions.size < 3) return 1f
        
        // For column formation, check how well units align on X-axis
        val avgX = positions.map { it.x }.average().toFloat()
        val xVariance = positions.map { (it.x - avgX) * (it.x - avgX) }.average().toFloat()
        
        // Better alignment = lower variance = higher bonus
        return kotlin.math.exp(-xVariance / 4f)
    }
    
    /**
     * Find path that considers formation width and obstacles
     * This pathfinding takes into account the space needed for the entire formation
     */
    fun findFormationAwarePath(start: Position, goal: Position, formationWidth: Float, obstacles: List<Position>): List<Position> {
        if (obstacles.isEmpty()) {
            return listOf(start, goal)
        }
        
        // Expand obstacles by formation width to create safe zones
        val expandedObstacles = obstacles.map { obstacle ->
            // Create an expanded area around each obstacle
            val radius = formationWidth / 2f + 1f // Extra safety margin
            obstacle to radius
        }
        
        // Simple pathfinding that avoids expanded obstacles
        val path = mutableListOf<Position>()
        path.add(start)
        
        // Check if direct path is clear
        if (isPathClear(start, goal, expandedObstacles)) {
            path.add(goal)
            return path
        }
        
        // Find waypoints around obstacle clusters
        val waypoints = findWaypoints(start, goal, expandedObstacles, formationWidth)
        path.addAll(waypoints)
        path.add(goal)
        
        return path
    }
    
    private fun isPathClear(start: Position, end: Position, expandedObstacles: List<Pair<Position, Float>>): Boolean {
        // Check if line segment from start to end intersects any expanded obstacles
        for ((obstacle, radius) in expandedObstacles) {
            if (lineIntersectsCircle(start, end, obstacle, radius)) {
                return false
            }
        }
        return true
    }
    
    private fun lineIntersectsCircle(lineStart: Position, lineEnd: Position, center: Position, radius: Float): Boolean {
        // Distance from point to line segment algorithm
        val A = lineEnd.x - lineStart.x
        val B = lineEnd.y - lineStart.y
        val C = center.x - lineStart.x
        val D = center.y - lineStart.y
        
        val dot = C * A + D * B
        val lenSq = A * A + B * B
        
        if (lenSq == 0f) return center.distanceTo(lineStart) <= radius
        
        val param = dot / lenSq
        
        val closestPoint = when {
            param < 0 -> lineStart
            param > 1 -> lineEnd
            else -> Position(lineStart.x + param * A, lineStart.y + param * B)
        }
        
        return center.distanceTo(closestPoint) <= radius
    }
    
    private fun findWaypoints(start: Position, goal: Position, expandedObstacles: List<Pair<Position, Float>>, formationWidth: Float): List<Position> {
        // Find the main obstacle cluster blocking the direct path
        val directLine = goal - start
        val midPoint = start + (directLine * 0.5f)
        
        // Find obstacles near the direct path
        val blockingObstacles = expandedObstacles.filter { (obstacle, radius) ->
            lineIntersectsCircle(start, goal, obstacle, radius)
        }
        
        if (blockingObstacles.isEmpty()) return emptyList()
        
        // Calculate detour direction (perpendicular to direct path)
        val pathDirection = directLine.normalized()
        val perpendicular = Position(-pathDirection.y, pathDirection.x) // 90-degree rotation
        
        // Try going around the obstacle cluster
        val detourDistance = formationWidth + 3f // Safe detour distance
        
        // Try both sides of the obstacle
        val leftDetour = midPoint + (perpendicular * detourDistance)
        val rightDetour = midPoint - (perpendicular * detourDistance)
        
        // Choose the side with fewer obstacles
        val leftBlocked = expandedObstacles.any { (obstacle, radius) ->
            leftDetour.distanceTo(obstacle) <= radius
        }
        val rightBlocked = expandedObstacles.any { (obstacle, radius) ->
            rightDetour.distanceTo(obstacle) <= radius
        }
        
        return when {
            !leftBlocked -> listOf(leftDetour)
            !rightBlocked -> listOf(rightDetour)
            else -> {
                // Both sides blocked, go further out
                val farDetour = midPoint + (perpendicular * (detourDistance * 2f))
                listOf(farDetour)
            }
        }
    }
    
    // Helper extension functions for Position math
    private operator fun Position.minus(other: Position): Position = Position(this.x - other.x, this.y - other.y)
    private operator fun Position.plus(other: Position): Position = Position(this.x + other.x, this.y + other.y)
    private operator fun Position.times(scalar: Float): Position = Position(this.x * scalar, this.y * scalar)
    
    private fun Position.normalized(): Position {
        val length = kotlin.math.sqrt(x * x + y * y)
        return if (length > 0f) Position(x / length, y / length) else Position(0f, 0f)
    }
    
    /**
     * Calculate formation positions for all units
     * TODO: Implement comprehensive formation position calculation
     */
    fun calculateFormationPositions(leader: Position, spacing: Float, unitCount: Int, formationType: String): List<Position> {
        return (0 until unitCount).map { index ->
            calculateSlot(leader, spacing, index, unitCount, formationType)
        }
    }
    
    /**
     * Interpolate between two formations for smooth transitions
     * @param from Starting formation positions
     * @param to Target formation positions  
     * @param t Interpolation factor (0.0 = fully from, 1.0 = fully to)
     */
    fun interpolateFormations(from: List<Position>, to: List<Position>, t: Float): List<Position> {
        if (from.size != to.size) {
            // If formations have different sizes, pad the smaller one
            val maxSize = kotlin.math.max(from.size, to.size)
            val paddedFrom = padFormation(from, maxSize)
            val paddedTo = padFormation(to, maxSize)
            return interpolateFormations(paddedFrom, paddedTo, t)
        }
        
        // Clamp t to valid range
        val clampedT = kotlin.math.max(0f, kotlin.math.min(1f, t))
        
        // Linear interpolation between corresponding positions
        return from.zip(to) { fromPos, toPos ->
            Position(
                fromPos.x + (toPos.x - fromPos.x) * clampedT,
                fromPos.y + (toPos.y - fromPos.y) * clampedT
            )
        }
    }
    
    /**
     * Pad a formation to a target size by duplicating positions
     */
    private fun padFormation(formation: List<Position>, targetSize: Int): List<Position> {
        if (formation.size >= targetSize) return formation
        if (formation.isEmpty()) return List(targetSize) { Position(0f, 0f) }
        
        val result = formation.toMutableList()
        while (result.size < targetSize) {
            // Add positions by duplicating existing ones with slight offset
            val indexToClone = result.size % formation.size
            val originalPos = formation[indexToClone]
            val offset = (result.size - formation.size + 1) * 0.5f
            result.add(Position(originalPos.x + offset, originalPos.y + offset))
        }
        return result
    }
    
    /**
     * Calculate formation positions that avoid obstacles
     * This attempts to place units in formation while steering clear of obstacles
     */
    fun calculateSlotWithCollisionAvoidance(leader: Position, spacing: Float, unitCount: Int, obstacles: List<Position>): List<Position> {
        if (obstacles.isEmpty()) {
            return calculateFormationPositions(leader, spacing, unitCount, "LINE")
        }
        
        // Start with default formation positions
        val defaultPositions = calculateFormationPositions(leader, spacing, unitCount, "LINE")
        
        // Check each position for collisions and adjust if necessary
        val safePositions = mutableListOf<Position>()
        val minDistance = spacing * 0.7f // Minimum safe distance from obstacles
        
        for (position in defaultPositions) {
            var safePosition = position
            var attempts = 0
            val maxAttempts = 8
            
            // Keep trying to find a safe position
            while (attempts < maxAttempts && isPositionBlocked(safePosition, obstacles, minDistance)) {
                // Try different avoidance strategies
                safePosition = when (attempts) {
                    0 -> Position(position.x + spacing, position.y) // Move right
                    1 -> Position(position.x - spacing, position.y) // Move left  
                    2 -> Position(position.x, position.y + spacing) // Move up
                    3 -> Position(position.x, position.y - spacing) // Move down
                    4 -> Position(position.x + spacing * 0.7f, position.y + spacing * 0.7f) // Diagonal up-right
                    5 -> Position(position.x - spacing * 0.7f, position.y + spacing * 0.7f) // Diagonal up-left
                    6 -> Position(position.x + spacing * 0.7f, position.y - spacing * 0.7f) // Diagonal down-right
                    else -> Position(position.x - spacing * 0.7f, position.y - spacing * 0.7f) // Diagonal down-left
                }
                attempts++
            }
            
            safePositions.add(safePosition)
        }
        
        return safePositions
    }
    
    /**
     * Check if a position is too close to any obstacle
     */
    private fun isPositionBlocked(position: Position, obstacles: List<Position>, minDistance: Float): Boolean {
        return obstacles.any { obstacle ->
            position.distanceTo(obstacle) < minDistance
        }
    }
}