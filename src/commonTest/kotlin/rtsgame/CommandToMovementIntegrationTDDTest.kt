package rtsgame

import kotlin.test.*
import rtsgame.core.*

/**
 * TDD tests driving the missing integration: CommandSystem → FormationSystem → MovementSystem
 * This bridges the gap between command creation and actual unit movement execution
 */
class CommandToMovementIntegrationTDDTest {
    
    @Test
    fun testFormationCommandExecutionTriggersUnitMovement() {
        // RED: Test that executing formation commands actually moves units
        // This drives the need for CommandSystem to integrate with MovementSystem
        
        val world = createTestWorld()
        val unitIds = listOf(1, 2, 3)
        
        // Position units at starting locations
        addUnitToWorld(world, unitIds[0], Position(0f, 0f))   // Leader
        addUnitToWorld(world, unitIds[1], Position(5f, 5f))   // Follower 1
        addUnitToWorld(world, unitIds[2], Position(-3f, 2f))  // Follower 2
        
        // Create formation command
        val command = CommandSystem.createFormationMoveCommand(
            unitIds, Position(10f, 0f), "LINE", 3f
        )
        
        try {
            // Execute command - this should set up unit movement toward formation slots
            CommandSystem.executeFormationCommand(world, command)
            
            // Get initial positions
            val initialLeaderPos = getUnitPosition(world, unitIds[0])
            val initialFollower1Pos = getUnitPosition(world, unitIds[1])
            val initialFollower2Pos = getUnitPosition(world, unitIds[2])
            
            // Update movement system - units should start moving
            CommandSystem.updateFormationMovement(world, 1f/60f) // One frame
            
            // Get new positions
            val newLeaderPos = getUnitPosition(world, unitIds[0])
            val newFollower1Pos = getUnitPosition(world, unitIds[1])
            val newFollower2Pos = getUnitPosition(world, unitIds[2])
            
            // Units should have moved from their initial positions
            assertFalse(positionsEqual(initialLeaderPos, newLeaderPos),
                "Leader should move when formation command is executed")
            assertFalse(positionsEqual(initialFollower1Pos, newFollower1Pos),
                "Follower 1 should move when formation command is executed")
            assertFalse(positionsEqual(initialFollower2Pos, newFollower2Pos),
                "Follower 2 should move when formation command is executed")
                
            // Success! CommandSystem → MovementSystem integration is working
        } catch (e: Exception) {
            fail("CommandSystem → MovementSystem integration should be implemented: ${e.message}")
        }
    }
    
    @Test
    fun testFormationCommandsSyncWithMovementSystem() {
        // RED: Test that CommandSystem properly uses MovementSystem.stepPosition
        
        val world = createTestWorld()
        val unitIds = listOf(1, 2)
        
        try {
            // Set up units with known positions and speeds
            addUnitToWorld(world, unitIds[0], Position(0f, 0f))
            addUnitToWorld(world, unitIds[1], Position(2f, 0f))
            setUnitSpeed(world, unitIds[0], 10f) // Fast leader
            setUnitSpeed(world, unitIds[1], 5f)  // Slower follower
            
            val command = CommandSystem.createFormationMoveCommand(
                unitIds, Position(20f, 0f), "LINE", 4f
            )
            
            CommandSystem.executeFormationCommand(world, command)
            
            // Simulate multiple movement steps
            repeat(3) {
                CommandSystem.updateFormationMovement(world, 0.1f) // 0.1 seconds per step
            }
            
            val leaderPos = getUnitPosition(world, unitIds[0])
            val followerPos = getUnitPosition(world, unitIds[1])
            
            // Calculate distances traveled from starting positions
            val leaderDistanceTraveled = leaderPos.x - 0f  // Leader started at x=0
            val followerDistanceTraveled = followerPos.x - 2f  // Follower started at x=2
            

            
            // Leader should have moved a greater distance due to higher speed
            assertTrue(leaderDistanceTraveled > followerDistanceTraveled,
                "Faster leader should travel further distance (leader: $leaderDistanceTraveled, follower: $followerDistanceTraveled)")
            
            // Both should have moved in the positive X direction toward target
            assertTrue(leaderPos.x > 0f, "Leader should move toward target")
            assertTrue(followerPos.x > 2f, "Follower should move from starting position")
            
            // Success! CommandSystem MovementSystem sync is working
        } catch (e: Exception) {
            fail("CommandSystem MovementSystem sync should be implemented: ${e.message}")
        }
    }
    
    @Test
    fun testCommandSystemUsesFormationSystemForTargetCalculation() {
        // RED: Test that CommandSystem uses FormationSystem to calculate where units should go
        
        val world = createTestWorld()
        val unitIds = listOf(1, 2, 3, 4) // 4 units for clear formation slots
        
        try {
            // Position all units at origin
            for (unitId in unitIds) {
                addUnitToWorld(world, unitId, Position(0f, 0f))
            }
            
            val targetPosition = Position(10f, 5f)
            val spacing = 3f
            val command = CommandSystem.createFormationMoveCommand(
                unitIds, targetPosition, "LINE", spacing
            )
            
            CommandSystem.executeFormationCommand(world, command)
            
            // Get the movement targets that should have been set
            val target0 = getUnitMovementTarget(world, unitIds[0])
            val target1 = getUnitMovementTarget(world, unitIds[1])
            val target2 = getUnitMovementTarget(world, unitIds[2])
            val target3 = getUnitMovementTarget(world, unitIds[3])
            
            // Targets should be set (not null) and different from each other
            assertNotNull(target0, "Unit 0 should have movement target")
            assertNotNull(target1, "Unit 1 should have movement target")
            assertNotNull(target2, "Unit 2 should have movement target")
            assertNotNull(target3, "Unit 3 should have movement target")
            
            // Targets should be different (formation slots)
            assertFalse(positionsClose(target0, target1, 0.1f),
                "Units should have different formation targets")
            assertFalse(positionsClose(target1, target2, 0.1f),
                "Units should have different formation targets")
                
            // Success! CommandSystem FormationSystem integration is working
        } catch (e: Exception) {
            fail("CommandSystem FormationSystem integration should be implemented: ${e.message}")
        }
    }
    
    @Test
    fun testActiveFormationCommandsContinueUpdating() {
        // RED: Test that active formation commands persist and continue updating units
        
        val world = createTestWorld()
        val unitIds = listOf(1, 2)
        
        try {
            addUnitToWorld(world, unitIds[0], Position(0f, 0f))
            addUnitToWorld(world, unitIds[1], Position(0f, 2f))
            
            val command = CommandSystem.createFormationMoveCommand(
                unitIds, Position(20f, 0f), "LINE", 5f
            )
            
            CommandSystem.executeFormationCommand(world, command)
            
            // Take snapshot after first update
            CommandSystem.updateFormationMovement(world, 1f/60f)
            val firstPos = getUnitPosition(world, unitIds[0])
            
            // Continue updating - units should keep moving
            repeat(5) {
                CommandSystem.updateFormationMovement(world, 1f/60f)
            }
            val secondPos = getUnitPosition(world, unitIds[0])
            
            // Position should continue changing
            assertFalse(positionsEqual(firstPos, secondPos),
                "Unit should continue moving on subsequent updates")
            
            // Should be moving toward target (positive X direction)
            assertTrue(secondPos.x > firstPos.x,
                "Unit should continue moving toward target")
                
            // Success! Persistent formation command updating is working
        } catch (e: Exception) {
            fail("Persistent formation command updating should be implemented: ${e.message}")
        }
    }
    
    @Test
    fun testCommandSystemHandlesUnitReachingFormationSlot() {
        // RED: Test behavior when units reach their formation slots
        
        val world = createTestWorld()
        val unitIds = listOf(1)
        
        try {
            // Position unit very close to target
            addUnitToWorld(world, unitIds[0], Position(9.9f, 0f))
            setUnitSpeed(world, unitIds[0], 1f)
            
            val command = CommandSystem.createFormationMoveCommand(
                unitIds, Position(10f, 0f), "LINE", 3f
            )
            
            CommandSystem.executeFormationCommand(world, command)
            
            // Update once - unit should reach target
            CommandSystem.updateFormationMovement(world, 1f) // 1 second
            
            val finalPos = getUnitPosition(world, unitIds[0])
            
            // Unit should be at or very close to target
            assertTrue(positionsClose(finalPos, Position(10f, 0f), 0.1f),
                "Unit should reach formation slot target")
            
            // Check if command is marked as complete
            val isCommandActive = CommandSystem.isCommandActive(command.id)
            assertFalse(isCommandActive, 
                "Command should be marked complete when all units reach slots")
                
            // Success! Formation completion handling is working
        } catch (e: Exception) {
            fail("Formation completion handling should be implemented: ${e.message}")
        }
    }
    
    // Helper methods for tests
    private fun createTestWorld(): Any {
        return object {}
    }
    
    private fun addUnitToWorld(world: Any, unitId: Int, position: Position) {
        CommandSystem.addUnit(unitId, position)
    }
    
    private fun getUnitPosition(world: Any, unitId: Int): Position {
        return CommandSystem.getUnitPosition(unitId)
    }
    
    private fun getUnitMovementTarget(world: Any, unitId: Int): Position? {
        return CommandSystem.getUnitMovementTarget(unitId)
    }
    
    private fun setUnitSpeed(world: Any, unitId: Int, speed: Float) {
        CommandSystem.setUnitSpeed(unitId, speed)
    }
    
    private fun positionsEqual(pos1: Position, pos2: Position): Boolean {
        return positionsClose(pos1, pos2, 0.001f)
    }
    
    private fun positionsClose(pos1: Position, pos2: Position, tolerance: Float): Boolean {
        val dx = pos1.x - pos2.x
        val dy = pos1.y - pos2.y
        return (dx * dx + dy * dy) <= (tolerance * tolerance)
    }
}