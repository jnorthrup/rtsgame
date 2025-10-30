package rtsgame.core

import kotlinx.coroutines.test.runTest
import rtsgame.Position
import rtsgame.compat.currentTimeMillis
import trikeshed.lib.Join
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.assertNotNull

/**
 * TDD Integration Tests: CommandSystem → DensePathfinder
 * 
 * RED PHASE: Tests will FAIL initially because CommandSystem has no pathfinding integration
 * GREEN PHASE: Bridge movement commands to A* pathfinding for obstacle avoidance
 * 
 * Integration Goals:
 * 1. Movement commands → A* pathfinding with obstacle avoidance
 * 2. CommandSystem → DensePathfinder integration for intelligent navigation
 * 3. Generated paths → MovementSystem.predictPositionAlongPath() integration
 * 4. Formation commands → Multi-unit pathfinding coordination
 * 5. Dynamic obstacle handling → Real-time path recalculation
 */
class CommandSystemPathfinderIntegrationTDDTest {

    @Test
    fun `RED - Movement commands should generate A-star paths for obstacle avoidance`() = runTest {
        // Arrange: Create movement command with obstacles
        val startPos = Position(0f, 0f)
        val targetPos = Position(100f, 100f)
        
        // Create obstacle map (blocking path)
        val obstacles = setOf(
            Join(50, 25), Join(50, 26), Join(50, 27), Join(50, 28),
            Join(50, 50), Join(50, 51), Join(50, 52), Join(50, 53),
            Join(50, 75), Join(50, 76), Join(50, 77), Join(50, 78)
        )
        val gridMap = createGridMap(200, 200, obstacles)
        
        // RED EXPECTATION: This will FAIL - no pathfinding integration exists
        val path = CommandSystem.generatePathForMovement(startPos, targetPos, gridMap)
        
        // Verify pathfinding integration
        assertNotNull(path, "Should generate A* path for movement command")
        assertTrue(path.isNotEmpty(), "Path should contain waypoints")
        assertEquals(startPos, path.first(), "Path should start at current position")
        assertEquals(targetPos, path.last(), "Path should end at target position")
        
        // Verify obstacle avoidance
        val pathObstacleCheck = path.any { pos -> 
            obstacles.contains(Join((pos.x / 10).toInt(), (pos.y / 10).toInt())) 
        }
        assertEquals(false, pathObstacleCheck, "Path should avoid obstacles")
    }

    @Test
    fun `RED - Formation movement should coordinate pathfinding for multiple units`() = runTest {
        // Arrange: Formation movement with obstacles
        val unitPositions = listOf(
            Position(0f, 0f),   // Leader
            Position(10f, 0f),  // Follower 1
            Position(20f, 0f)   // Follower 2
        )
        val targetPositions = listOf(
            Position(100f, 100f),
            Position(110f, 100f),
            Position(120f, 100f)
        )
        
        // Create obstacle field
        val obstacles = setOf(
            Join(50, 50), Join(51, 50), Join(52, 50),
            Join(50, 51), Join(51, 51), Join(52, 51)
        )
        val gridMap = createGridMap(200, 200, obstacles)
        
        // RED EXPECTATION: This will FAIL - no formation pathfinding exists
        val formationPaths = CommandSystem.generateFormationPaths(
            unitPositions, targetPositions, gridMap
        )
        
        // Verify coordinated pathfinding
        assertNotNull(formationPaths, "Should generate paths for formation")
        assertEquals(3, formationPaths.size, "Should have paths for all units")
        
        // Verify each path avoids obstacles
        for (path in formationPaths) {
            assertTrue(path.isNotEmpty(), "Each unit should have a path")
            val hasObstacleCollision = path.any { pos ->
                obstacles.contains(Join((pos.x / 10).toInt(), (pos.y / 10).toInt()))
            }
            assertEquals(false, hasObstacleCollision, "Formation paths should avoid obstacles")
        }
    }

    @Test
    fun `RED - MovementSystem integration should use generated A-star paths`() = runTest {
        // Arrange: Movement command that needs pathfinding
        val startPos = Position(10f, 10f)
        val targetPos = Position(90f, 90f)
        
        // Create maze-like obstacles
        val obstacles = (0..99).map { x ->
            listOf(Join(x, 40), Join(x, 41), Join(x, 42))
        }.flatten().toSet() - setOf(Join(50, 40), Join(50, 41), Join(50, 42)) // Leave a vertical gap
        
        val gridMap = createGridMap(100, 100, obstacles)
        
        // RED EXPECTATION: This will FAIL - no MovementSystem pathfinding integration
        val movementPath = CommandSystem.generatePathForMovement(startPos, targetPos, gridMap)
        println("movementPath=$movementPath")
        val futurePosition = MovementSystem.predictPositionAlongPath(
            current = rtsgame.core.Position(startPos.x, startPos.y),
            velocity = Vec3(5f, 5f, 0f),
            path = movementPath?.map { rtsgame.core.Position(it.x, it.y) } ?: emptyList(),
            predictionTime = 10f
        )
        println("futurePosition=$futurePosition")
        
        // Verify MovementSystem uses pathfinding
        assertNotNull(movementPath, "Should generate path for movement")
        assertTrue(movementPath.isNotEmpty(), "Path should contain waypoints")
        
        // Verify position prediction follows path (not straight line)
        val straightLineTarget = Position(
            startPos.x + 5f * 10f,  // velocity * time
            startPos.y + 5f * 10f
        )
        val pathDistance = calculateDistance(
            Position(futurePosition.x, futurePosition.y), 
            straightLineTarget
        )
        assertTrue(pathDistance > 10f, "Future position should deviate from straight line due to pathfinding")
    }

    @Test
    fun `RED - Dynamic obstacle updates should trigger path recalculation`() = runTest {
        // Arrange: Initial path calculation
        val startPos = Position(0f, 0f)
        val targetPos = Position(100f, 0f)
        
        // Initial obstacles
        val initialObstacles = setOf(Join(40, 0), Join(41, 0), Join(42, 0))
        val initialGridMap = createGridMap(200, 200, initialObstacles)
        
        // RED EXPECTATION: This will FAIL - no dynamic pathfinding exists
        val initialPath = CommandSystem.generatePathForMovement(startPos, targetPos, initialGridMap)
        
        // Add new obstacles that block the current path
        val newObstacles = initialObstacles + setOf(
            Join(43, 0), Join(44, 0), Join(45, 0),
            Join(43, 1), Join(44, 1), Join(45, 1)
        )
        val updatedGridMap = createGridMap(200, 200, newObstacles)
        
        val recalculatedPath = CommandSystem.recalculatePathWithObstacles(
            currentPath = initialPath ?: emptyList(),
            newObstacles = updatedGridMap
        )
        
        // Verify dynamic recalculation
        assertNotNull(initialPath, "Should generate initial path")
        assertNotNull(recalculatedPath, "Should recalculate path with new obstacles")
        
        // Paths should be different due to new obstacles
        val pathsDifferent = initialPath != recalculatedPath
        assertTrue(pathsDifferent, "Recalculated path should differ from initial path")
    }

    @Test
    fun `RED - CommandSystem should cache pathfinding results for performance`() = runTest {
        // Arrange: Same pathfinding request multiple times
        val startPos = Position(0f, 0f)
        val targetPos = Position(50f, 50f)
        val gridMap = createGridMap(100, 100, emptySet())
        
        // RED EXPECTATION: This will FAIL - no pathfinding caching exists
        val firstPathTime = measurePathfindingTime {
            CommandSystem.generatePathForMovement(startPos, targetPos, gridMap)
        }
        
        val secondPathTime = measurePathfindingTime {
            CommandSystem.generatePathForMovement(startPos, targetPos, gridMap)
        }
        
        // Verify caching improves performance
        assertTrue(secondPathTime < firstPathTime / 2, "Cached pathfinding should be significantly faster")
        
        // Verify cache invalidation works
        val newObstacles = setOf(Join(25, 25))
        val newGridMap = createGridMap(100, 100, newObstacles)
        
        val thirdPathTime = measurePathfindingTime {
            CommandSystem.generatePathForMovement(startPos, targetPos, newGridMap)
        }
        
        // Cache should be invalidated, so time should increase again
        assertTrue(thirdPathTime > secondPathTime, "Cache invalidation should increase pathfinding time")
    }

    // Test helper functions
    private fun calculateDistance(pos1: Position, pos2: Position): Float {
        val dx = pos1.x - pos2.x
        val dy = pos1.y - pos2.y
        return kotlin.math.sqrt(dx * dx + dy * dy)
    }
    
    private suspend fun measurePathfindingTime(pathfindingOperation: suspend () -> List<Position>?): Long {
        val startTime = currentTimeMillis()
        pathfindingOperation()
        val endTime = currentTimeMillis()
        return endTime - startTime
    }
}