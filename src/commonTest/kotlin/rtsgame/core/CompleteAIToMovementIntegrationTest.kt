package rtsgame.core

import kotlinx.coroutines.test.runTest
import rtsgame.Position
import trikeshed.lib.Join
import kotlin.test.Test
import kotlin.test.assertNotNull
import kotlin.test.assertTrue
import kotlin.test.assertEquals

/**
 * End-to-End Integration Validation: DenseAI → CommandSystem → DensePathfinder → MovementSystem
 * 
 * This test validates the complete TDD integration chain built through gap analysis:
 * 1. AI tactical decisions (DenseAI.Cmd)
 * 2. Command conversion (CommandSystem AI integration)
 * 3. Pathfinding integration (DensePathfinder A*)
 * 4. Movement execution (MovementSystem path following)
 */
class CompleteAIToMovementIntegrationTest {

    @Test
    fun `AI tactical decision should result in intelligent pathfinding movement`() = runTest {
        // Arrange: AI tactical scenario with obstacles
        val aiUnitPosition = Position(10f, 10f)
        val aiTargetPosition = Position(90f, 90f)
        
        // Create obstacle field that blocks direct path
        val obstacles = (40..60).flatMap { x ->
            (40..60).map { y ->
                Join(x, y)
            }
        }.toSet()
        val gridMap = createGridMap(100, 100, obstacles)
        
        // STEP 1: AI generates tactical move command
        val aiTacticalCommand = Cmd.Move(id = 1, pos = Vec3(aiTargetPosition.x, aiTargetPosition.y, 0f))
        
        // STEP 2: CommandSystem converts AI command
        val world = emptyMap<Int, Map<String, Any>>()
        val commandConversion = CommandSystem.convertAICommand(aiTacticalCommand, world)
        
        // STEP 3: CommandSystem generates A* path for movement
        val intelligentPath = CommandSystem.generatePathForMovement(
            aiUnitPosition, 
            aiTargetPosition, 
            gridMap
        )
        
        // STEP 4: MovementSystem uses generated path for movement prediction
        val futurePosition = intelligentPath?.let { path ->
            MovementSystem.predictPositionAlongPath(
                current = rtsgame.core.Position(aiUnitPosition.x, aiUnitPosition.y),
                velocity = Vec3(5f, 5f, 0f),
                path = path.map { rtsgame.core.Position(it.x, it.y) },
                predictionTime = 10f
            )
        }
        
        // VALIDATE: Complete integration chain
        assertNotNull(commandConversion, "AI command should convert successfully")
        assertEquals("move", commandConversion.commandType, "Should recognize as move command")
        
        assertNotNull(intelligentPath, "Should generate intelligent path")
        assertTrue(intelligentPath.isNotEmpty(), "Path should contain waypoints")
        
        // Verify path avoids obstacles
        val pathAvoidanceCheck = intelligentPath.none { pos ->
            val gridX = (pos.x / 10).toInt() * 10
            val gridY = (pos.y / 10).toInt() * 10
            obstacles.contains(Join(gridX, gridY))
        }
        assertTrue(pathAvoidanceCheck, "AI-generated path should avoid obstacles")
        
        assertNotNull(futurePosition, "MovementSystem should predict future position")
        
        // Verify the path deviates from straight line (indicating pathfinding worked)
        val directDistance = calculateDistance(aiUnitPosition, aiTargetPosition)
        val pathDistance = calculatePathDistance(intelligentPath)
        assertTrue(pathDistance > directDistance, "Pathfinding route should be longer than direct route due to obstacles")
    }

    @Test
    fun `AI formation command should result in coordinated pathfinding`() = runTest {
        // Arrange: AI formation tactical scenario
        val aiUnits = listOf(
            Position(0f, 0f),   // Leader
            Position(10f, 0f),  // Unit 2
            Position(20f, 0f)   // Unit 3
        )
        val formationTargets = listOf(
            Position(80f, 80f),
            Position(90f, 80f),
            Position(100f, 80f)
        )
        
        // Create scattered obstacles
        val obstacles = setOf(
            Join(40, 40), Join(41, 40), Join(42, 40),
            Join(60, 60), Join(61, 60), Join(62, 60)
        )
        val gridMap = createGridMap(120, 120, obstacles)
        
        // STEP 1: AI generates formation commands
        val aiFormationCommands = listOf(
            Cmd.Move(1, Vec3(formationTargets[0].x, formationTargets[0].y, 0f)),
            Cmd.Move(2, Vec3(formationTargets[1].x, formationTargets[1].y, 0f)),
            Cmd.Move(3, Vec3(formationTargets[2].x, formationTargets[2].y, 0f))
        )
        
        // STEP 2: CommandSystem processes AI formation commands
        val world = emptyMap<Int, Map<String, Any>>()
        val formationResult = CommandSystem.processAIFormationCommands(aiFormationCommands, world)
        
        // STEP 3: CommandSystem generates coordinated pathfinding
        val coordinatedPaths = CommandSystem.generateFormationPaths(
            aiUnits,
            formationTargets,
            gridMap
        )
        
        // VALIDATE: Formation integration
        assertNotNull(formationResult, "AI formation commands should be processed")
        assertEquals(3, formationResult.involvedUnits.size, "Should process all formation units")
        
        assertNotNull(coordinatedPaths, "Should generate coordinated paths")
        assertEquals(3, coordinatedPaths.size, "Should have path for each unit")
        
        // Verify each path is valid and avoids obstacles
        coordinatedPaths.forEachIndexed { index, path ->
            assertTrue(path.isNotEmpty(), "Unit $index should have valid path")
            assertEquals(aiUnits[index], path.first(), "Path should start at unit position")
            assertEquals(formationTargets[index], path.last(), "Path should end at target")
        }
    }

    @Test
    fun `Complete AI-to-Movement pipeline should handle dynamic obstacles`() = runTest {
        // Arrange: Dynamic scenario with changing obstacles
        val aiPosition = Position(0f, 50f)
        val targetPosition = Position(100f, 50f)
        
        // Initial obstacles
        val initialObstacles = setOf(Join(30, 50), Join(31, 50), Join(32, 50))
        val initialGridMap = createGridMap(120, 120, initialObstacles)
        
        // STEP 1: AI generates move command
        val aiCommand = Cmd.Move(1, Vec3(targetPosition.x, targetPosition.y, 0f))
        
        // STEP 2: Generate initial path
        val initialPath = CommandSystem.generatePathForMovement(
            aiPosition,
            targetPosition,
            initialGridMap
        )
        
        // STEP 3: Add new obstacles that block current path
        val newObstacles = initialObstacles + setOf(
            Join(70, 50), Join(71, 50), Join(72, 50)
        )
        val updatedGridMap = createGridMap(120, 120, newObstacles)
        
        // STEP 4: Recalculate path with new obstacles
        val recalculatedPath = CommandSystem.recalculatePathWithObstacles(
            initialPath ?: emptyList(),
            updatedGridMap
        )
        
        // VALIDATE: Dynamic pathfinding
        assertNotNull(initialPath, "Should generate initial path")
        assertNotNull(recalculatedPath, "Should recalculate path with new obstacles")
        
        // Paths should be different due to new obstacles
        val pathsAreDifferent = initialPath != recalculatedPath
        assertTrue(pathsAreDifferent, "Recalculated path should adapt to new obstacles")
        
        // Both paths should avoid their respective obstacle sets
        val initialPathValid = initialPath.none { pos ->
            initialObstacles.contains(Join((pos.x / 10).toInt() * 10, (pos.y / 10).toInt() * 10))
        }
        val recalculatedPathValid = recalculatedPath.none { pos ->
            newObstacles.contains(Join((pos.x / 10).toInt() * 10, (pos.y / 10).toInt() * 10))  
        }
        
        assertTrue(initialPathValid, "Initial path should avoid initial obstacles")
        assertTrue(recalculatedPathValid, "Recalculated path should avoid all obstacles")
    }

    // Helper functions
    private fun calculateDistance(pos1: Position, pos2: Position): Float {
        val dx = pos1.x - pos2.x
        val dy = pos1.y - pos2.y
        return kotlin.math.sqrt(dx * dx + dy * dy)
    }
    
    private fun calculatePathDistance(path: List<Position>): Float {
        if (path.size < 2) return 0f
        
        var totalDistance = 0f
        for (i in 0 until path.size - 1) {
            totalDistance += calculateDistance(path[i], path[i + 1])
        }
        return totalDistance
    }
}