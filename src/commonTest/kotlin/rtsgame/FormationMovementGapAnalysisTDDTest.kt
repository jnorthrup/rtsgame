package rtsgame

import kotlin.test.Test
import kotlin.test.assertTrue
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.fail
import rtsgame.core.Position
import rtsgame.core.FormationSystem
import rtsgame.core.MovementSystem
import rtsgame.core.Vec3

/**
 * Red TDD tests for missing formation movement features identified in gap analysis.
 * These tests should FAIL initially, driving implementation of new functionality.
 */
class FormationMovementGapAnalysisTDDTest {
    
    @Test
    fun testDynamicFormationTypeChanges() {
        // GREEN: Test ability to change formation types dynamically
        // Referenced in TODO_IntegrateFeatures.md: "Formation Transitions"
        
        val leader = Position(0f, 0f)
        val spacing = 3f
        val unitCount = 4
        
        // Test LINE formation - units should be in a horizontal line
        val lineSlot1 = FormationSystem.calculateSlot(leader, spacing, 1, unitCount, "LINE")
        val lineSlot2 = FormationSystem.calculateSlot(leader, spacing, 2, unitCount, "LINE")
        
        // In LINE formation, units should have same Y but different X
        assertEquals(leader.y, lineSlot1.y, 0.1f, "LINE formation should align Y coordinates")
        assertEquals(leader.y, lineSlot2.y, 0.1f, "LINE formation should align Y coordinates")
        assertTrue(lineSlot1.x != lineSlot2.x, "LINE formation should have different X coordinates")
        
        // Test COLUMN formation - units should be in a vertical line
        val colSlot1 = FormationSystem.calculateSlot(leader, spacing, 1, unitCount, "COLUMN")
        val colSlot2 = FormationSystem.calculateSlot(leader, spacing, 2, unitCount, "COLUMN")
        
        // In COLUMN formation, units should have same X but different Y
        assertEquals(leader.x, colSlot1.x, 0.1f, "COLUMN formation should align X coordinates")
        assertEquals(leader.x, colSlot2.x, 0.1f, "COLUMN formation should align X coordinates")
        assertTrue(colSlot1.y != colSlot2.y, "COLUMN formation should have different Y coordinates")
        
        // Test CIRCLE formation - units should be arranged in a circle
        val circleSlot1 = FormationSystem.calculateSlot(leader, spacing, 1, unitCount, "CIRCLE")
        val circleSlot2 = FormationSystem.calculateSlot(leader, spacing, 2, unitCount, "CIRCLE")
        
        // In CIRCLE formation, units should be at roughly equal distances from center
        val dist1 = leader.distanceTo(circleSlot1)
        val dist2 = leader.distanceTo(circleSlot2)
        assertEquals(dist1, dist2, 1f, "CIRCLE formation units should be equidistant from center")
    }
    
    @Test
    fun testFormationLeaderSpeedAdjustment() {
        // GREEN: Test dynamic leader speed adjustment based on follower positions
        // Referenced in TODO_IntegrateFeatures.md: "Speed adjustment based on formation spread"
        
        val leader = Position(0f, 0f)
        val baseSpeed = 5f
        
        // Test with close followers - should maintain full speed
        val closeFollowers = listOf(
            Position(2f, 2f),   // Near follower
            Position(3f, 1f),   // Near follower
            Position(1f, 3f)    // Near follower
        )
        val closeSpeed = FormationSystem.calculateLeaderSpeed(leader, closeFollowers, baseSpeed)
        assertTrue(closeSpeed >= baseSpeed * 0.8f, "Close formation should maintain near full speed")
        
        // Test with scattered followers - should reduce speed significantly
        val scatteredFollowers = listOf(
            Position(10f, 10f), // Far follower
            Position(1f, 1f),   // Near follower
            Position(20f, 20f)  // Very far follower
        )
        val scatteredSpeed = FormationSystem.calculateLeaderSpeed(leader, scatteredFollowers, baseSpeed)
        assertTrue(scatteredSpeed < baseSpeed * 0.6f, "Scattered formation should reduce leader speed")
        assertTrue(scatteredSpeed >= baseSpeed * 0.1f, "Speed should never go below 10% of base speed")
        
        // Test empty followers - should return base speed
        val emptySpeed = FormationSystem.calculateLeaderSpeed(leader, emptyList(), baseSpeed)
        assertEquals(baseSpeed, emptySpeed, "Empty formation should return base speed")
        
        // Test that closer formation gets higher speed than scattered formation
        assertTrue(closeSpeed > scatteredSpeed, "Cohesive formation should be faster than scattered")
    }    @Test
    fun testFormationCombatBonuses() {
        // GREEN: Test formation-specific combat bonuses
        // Referenced in TODO_IntegrateFeatures.md: "Formation-specific combat bonuses"
        
        // Test LINE formation - should provide flanking bonus
        val linePositions = listOf(
            Position(0f, 0f),  // Leader
            Position(2f, 0f),  // Right flank
            Position(-2f, 0f), // Left flank
            Position(4f, 0f)   // Far right
        )
        val lineBonus = FormationSystem.calculateCombatBonus(linePositions, "LINE")
        assertTrue(lineBonus > 0f, "LINE formation should provide combat bonus")
        
        // Test CIRCLE formation - should provide defensive bonus
        val circlePositions = listOf(
            Position(0f, 0f),   // Center
            Position(3f, 0f),   // East
            Position(0f, 3f),   // North
            Position(-3f, 0f),  // West
            Position(0f, -3f)   // South
        )
        val circleBonus = FormationSystem.calculateCombatBonus(circlePositions, "CIRCLE")
        assertTrue(circleBonus > 0f, "CIRCLE formation should provide combat bonus")
        
        // Test WEDGE formation - should provide breakthrough bonus
        val wedgePositions = listOf(
            Position(0f, 0f),   // Point
            Position(-1f, 2f),  // Left wing
            Position(1f, 2f),   // Right wing
            Position(0f, 4f)    // Back
        )
        val wedgeBonus = FormationSystem.calculateCombatBonus(wedgePositions, "WEDGE")
        assertTrue(wedgeBonus > 0f, "WEDGE formation should provide combat bonus")
        
        // Test that different formations provide different bonuses
        assertTrue(lineBonus != circleBonus, "Different formations should have different bonuses")
        assertTrue(wedgeBonus != circleBonus, "Different formations should have different bonuses")
        
        // Test scattered units (no formation) - should provide minimal bonus
        val scatteredPositions = listOf(
            Position(0f, 0f),
            Position(10f, 15f),
            Position(-8f, 3f),
            Position(5f, -12f)
        )
        val scatteredBonus = FormationSystem.calculateCombatBonus(scatteredPositions, "LINE")
        assertTrue(scatteredBonus < lineBonus, "Scattered units should get less bonus than proper formation")
    }
    
    @Test
    fun testFormationPathfindingIntegration() {
        // GREEN: Test that formations consider pathfinding when maintaining shape
        // Referenced in TODO_IntegrateFeatures.md: "Leader's A* path choice considers formation width"
        
        val leader = Position(0f, 0f)
        val destination = Position(10f, 0f)
        val formationWidth = 6f
        
        // Test with no obstacles - should return direct path
        val emptyPath = FormationSystem.findFormationAwarePath(leader, destination, formationWidth, emptyList())
        assertEquals(2, emptyPath.size, "Direct path should have start and end points")
        assertEquals(leader, emptyPath.first(), "Path should start at leader position")
        assertEquals(destination, emptyPath.last(), "Path should end at destination")
        
        // Test with obstacles that block formation
        val obstacles = listOf(
            Position(5f, -1f), // Obstacle that might block formation
            Position(5f, 0f),
            Position(5f, 1f)
        )
        val blockedPath = FormationSystem.findFormationAwarePath(leader, destination, formationWidth, obstacles)
        
        assertTrue(blockedPath.size >= 2, "Path should have at least start and end points")
        assertEquals(leader, blockedPath.first(), "Path should start at leader position")
        assertEquals(destination, blockedPath.last(), "Path should end at destination")
        
        // Path should be different from direct path when obstacles present
        assertTrue(blockedPath.size > 2 || blockedPath != emptyPath, "Blocked path should detour around obstacles")
        
        // Test that formation width is considered - wider formations need more detour
        val wideFormationPath = FormationSystem.findFormationAwarePath(leader, destination, formationWidth * 2, obstacles)
        val narrowFormationPath = FormationSystem.findFormationAwarePath(leader, destination, formationWidth / 2, obstacles)
        
        assertTrue(wideFormationPath.size >= narrowFormationPath.size, "Wider formations may need longer paths")
    }
    
    @Test
    fun testFormationTransitionSmoothness() {
        // GREEN: Test smooth transitions between formation types
        // Referenced in TODO_IntegrateFeatures.md: "smooth interpolation between formation types"
        
        val leader = Position(0f, 0f)
        val spacing = 3f
        val unitCount = 4 // Smaller count for predictable testing
        
        // Generate two different formations
        val linePositions = FormationSystem.calculateFormationPositions(leader, spacing, unitCount, "LINE")
        val circlePositions = FormationSystem.calculateFormationPositions(leader, spacing, unitCount, "CIRCLE")
        
        // Test interpolation at different stages
        val startInterpolation = FormationSystem.interpolateFormations(linePositions, circlePositions, 0.0f)
        val midInterpolation = FormationSystem.interpolateFormations(linePositions, circlePositions, 0.5f)
        val endInterpolation = FormationSystem.interpolateFormations(linePositions, circlePositions, 1.0f)
        
        // At t=0, should match the source formation
        assertEquals(linePositions.size, startInterpolation.size, "Start interpolation should have same size as source")
        for (i in linePositions.indices) {
            assertTrue(
                startInterpolation[i].distanceTo(linePositions[i]) < 0.01f,
                "Start interpolation should match line formation at index $i"
            )
        }
        
        // At t=1, should match the target formation
        assertEquals(circlePositions.size, endInterpolation.size, "End interpolation should have same size as target")
        for (i in circlePositions.indices) {
            assertTrue(
                endInterpolation[i].distanceTo(circlePositions[i]) < 0.01f,
                "End interpolation should match circle formation at index $i"
            )
        }
        
        // At t=0.5, should be somewhere in between
        assertEquals(linePositions.size, midInterpolation.size, "Mid interpolation should have same size")
        for (i in linePositions.indices) {
            val distanceFromLine = midInterpolation[i].distanceTo(linePositions[i])
            val distanceFromCircle = midInterpolation[i].distanceTo(circlePositions[i])
            assertTrue(
                distanceFromLine > 0.01f && distanceFromCircle > 0.01f,
                "Mid interpolation should be different from both source and target at index $i"
            )
        }
        
        // Test edge cases
        val belowRange = FormationSystem.interpolateFormations(linePositions, circlePositions, -0.5f)
        val aboveRange = FormationSystem.interpolateFormations(linePositions, circlePositions, 1.5f)
        
        // Should clamp to valid range
        for (i in linePositions.indices) {
            assertTrue(
                belowRange[i].distanceTo(linePositions[i]) < 0.01f,
                "Below range interpolation should clamp to source"
            )
            assertTrue(
                aboveRange[i].distanceTo(circlePositions[i]) < 0.01f,
                "Above range interpolation should clamp to target"
            )
        }
    }
    
    @Test
    fun testFormationCollisionAvoidance() {
        // GREEN: Test that formation units avoid collisions while maintaining formation
        // This ensures units don't overlap with obstacles when forming up
        
        val leader = Position(0f, 0f)
        val spacing = 2f
        val unitCount = 4
        
        // Test with no obstacles - should behave normally
        val normalPositions = FormationSystem.calculateSlotWithCollisionAvoidance(
            leader, spacing, unitCount, emptyList()
        )
        assertEquals(unitCount, normalPositions.size, "Should return correct number of positions")
        
        // Test with obstacles in the formation area
        val obstacles = listOf(
            Position(1f, 0f),   // Obstacle likely to interfere with line formation
            Position(-1f, 0f)   // Another obstacle on the other side
        )
        
        val avoidedPositions = FormationSystem.calculateSlotWithCollisionAvoidance(
            leader, spacing, unitCount, obstacles
        )
        
        assertEquals(unitCount, avoidedPositions.size, "Should return correct number of safe positions")
        
        // Verify that positions maintain safe distance from obstacles
        val minSafeDistance = spacing * 0.7f
        for (position in avoidedPositions) {
            for (obstacle in obstacles) {
                val distance = position.distanceTo(obstacle)
                assertTrue(
                    distance >= minSafeDistance, 
                    "Position ${position} should be at least ${minSafeDistance} away from obstacle ${obstacle}, but was ${distance}"
                )
            }
        }
        
        // Verify that units still maintain reasonable formation spacing
        val maxDistanceFromLeader = spacing * 3f // Allow some flexibility due to obstacle avoidance
        for (position in avoidedPositions) {
            val distanceFromLeader = position.distanceTo(leader)
            assertTrue(
                distanceFromLeader <= maxDistanceFromLeader,
                "Position ${position} should stay within ${maxDistanceFromLeader} of leader, but was ${distanceFromLeader}"
            )
        }
        
        // Test that collision avoidance actually changes the formation when needed
        val defaultPositions = FormationSystem.calculateFormationPositions(leader, spacing, unitCount, "LINE")
        var positionsChanged = false
        for (i in defaultPositions.indices) {
            if (defaultPositions[i].distanceTo(avoidedPositions[i]) > 0.1f) {
                positionsChanged = true
                break
            }
        }
        assertTrue(positionsChanged, "Formation should be modified to avoid obstacles")
    }
    
    @Test
    fun testAdvancedMovementPrediction() {
        // GREEN: Test advanced movement prediction beyond simple velocity projection
        // Referenced in TODO_IntegrateFeatures.md: "predict further along leader's A* path"
        
        val leader = Position(0f, 0f)
        val leaderVelocity = Vec3(1f, 0f, 0f) // Moving right at 1 unit/second
        
        // Test simple path following
        val straightPath = listOf(
            Position(2f, 0f),
            Position(4f, 0f),
            Position(6f, 0f)
        )
        
        // Predict 2 seconds ahead (should travel 2 units along path)
        val prediction2s = MovementSystem.predictPositionAlongPath(
            leader, leaderVelocity, straightPath, 2f
        )
        assertEquals(2f, prediction2s.x, 0.1f, "Should travel 2 units along straight path")
        assertEquals(0f, prediction2s.y, 0.1f, "Should stay on Y=0 for straight path")
        
        // Test curved path
        val curvedPath = listOf(
            Position(1f, 0f),   // First waypoint
            Position(2f, 1f),   // Turn upward
            Position(3f, 2f)    // Continue upward
        )
        
        // Predict along curved path
        val curvedPrediction = MovementSystem.predictPositionAlongPath(
            leader, leaderVelocity, curvedPath, 1.5f
        )
        
        // Should be somewhere along the path, not just velocity-projected
        assertTrue(curvedPrediction.x > 0f, "Should have moved along path")
        assertTrue(curvedPrediction.y >= 0f, "Should follow upward curve")
        
        // Test with no path - should fall back to velocity projection
        val noPathPrediction = MovementSystem.predictPositionAlongPath(
            leader, leaderVelocity, emptyList(), 2f
        )
        assertEquals(2f, noPathPrediction.x, 0.1f, "No path should use velocity projection")
        assertEquals(0f, noPathPrediction.y, 0.1f, "No path should use velocity projection")
        
        // Test stationary prediction (zero velocity)
        val stationaryPrediction = MovementSystem.predictPositionAlongPath(
            leader, Vec3(0f, 0f, 0f), straightPath, 5f
        )
        assertEquals(leader.x, stationaryPrediction.x, 0.1f, "Stationary should stay at current position")
        assertEquals(leader.y, stationaryPrediction.y, 0.1f, "Stationary should stay at current position")
        
        // Test prediction that extends beyond path end
        val longPrediction = MovementSystem.predictPositionAlongPath(
            leader, leaderVelocity, listOf(Position(1f, 0f)), 10f
        )
        assertEquals(1f, longPrediction.x, 0.1f, "Should stop at path end")
        assertEquals(0f, longPrediction.y, 0.1f, "Should stop at path end")
    }
    
    @Test
    fun testFormationSteeringForces() {
        // GREEN: Test steering-based formation movement
        // Referenced in formation-movement-design.md as key feature
        
        val currentPosition = Position(5f, 5f)
        val targetPosition = Position(2f, 2f)
        val currentVelocity = Vec3(0f, 0f, 0f)
        val maxForce = 10f
        val maxSpeed = 5f
        
        // Calculate steering forces for formation movement
        val steeringForce = MovementSystem.calculateSteeringForce(
            currentPosition, targetPosition, currentVelocity, maxForce
        )
        
        // Steering force should point towards target
        assertTrue(steeringForce.first < 0f, "Steering force should point left (negative X)")
        assertTrue(steeringForce.second < 0f, "Steering force should point up (negative Y)")
        
        // Apply steering to velocity
        val newVelocity = MovementSystem.applySteering(currentVelocity, steeringForce, maxSpeed, 1f)
        
        // New velocity should be influenced by steering force
        assertTrue(newVelocity.first < 0f, "New velocity should move towards target (negative X)")
        assertTrue(newVelocity.second < 0f, "New velocity should move towards target (negative Y)")
        
        // Velocity should respect max speed limit
        val speed = kotlin.math.sqrt(
            newVelocity.first * newVelocity.first + 
            newVelocity.second * newVelocity.second + 
            newVelocity.third * newVelocity.third
        )
        assertTrue(speed <= maxSpeed * 1.1f, "Speed should not exceed max speed limit")
    }
}