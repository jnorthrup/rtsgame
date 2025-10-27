package rtsgame

import kotlin.test.Test
import kotlin.test.assertTrue
import kotlin.test.assertEquals
import kotlin.test.fail

/**
 * Simple TDD test to establish basic formation movement functionality
 * Starting with intentionally failing tests (RED phase)
 */
class FormationMovementSimpleTDDTest {
    
    @Test
    fun testBasicFormationSystemExists() {
        // RED: This test should fail first if FormationSystem doesn't have required methods
        try {
            val result = rtsgame.core.FormationSystem.calculateSlot(
                rtsgame.core.Position(0f, 0f), 
                2f, 
                0, 
                1
            )
            // GREEN: Should pass once implementation exists
            assertEquals(rtsgame.core.Position(0f, 0f), result)
        } catch (e: Exception) {
            fail("FormationSystem.calculateSlot method missing or broken: ${e.message}")
        }
    }
    
    @Test
    fun testBasicMovementSystemExists() {
        // RED: This test should fail first if MovementSystem doesn't have required methods
        try {
            val current = rtsgame.core.Vec3(0f, 0f, 0f)
            val target = rtsgame.core.Vec3(1f, 0f, 0f)
            val result = rtsgame.core.MovementSystem.stepPosition(current, target, 1f, 1f)
            
            // GREEN: Should pass once implementation exists
            assertEquals(rtsgame.core.Vec3(1f, 0f, 0f), result)
        } catch (e: Exception) {
            fail("MovementSystem.stepPosition method missing or broken: ${e.message}")
        }
    }
    
    @Test
    fun testFormationMovementIntegration_SingleStep() {
        // RED: Start with simplest possible failing test
        val leader = rtsgame.core.Position(0f, 0f)
        val follower = rtsgame.core.Position(5f, 5f)
        val spacing = 2f
        
        // Calculate where follower should be
        val targetSlot = rtsgame.core.FormationSystem.calculateSlot(leader, spacing, 1, 2)
        
        // Simulate one movement step
        val currentVec = rtsgame.core.Vec3(follower.x, follower.y, 0f)
        val targetVec = rtsgame.core.Vec3(targetSlot.x, targetSlot.y, 0f)
        val newVec = rtsgame.core.MovementSystem.stepPosition(currentVec, targetVec, 1f, 1f)
        
        val newPosition = rtsgame.core.Position(newVec.first, newVec.second)
        
        // At minimum, follower should have moved toward the target
        val initialDistance = follower.distanceTo(targetSlot)
        val newDistance = newPosition.distanceTo(targetSlot)
        
        assertTrue(newDistance <= initialDistance, 
            "Follower should move closer to target. Initial: $initialDistance, New: $newDistance")
    }
}