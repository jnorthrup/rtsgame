package rtsgame

import kotlin.test.Test
import kotlin.test.assertTrue
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import rtsgame.core.Position
import rtsgame.core.FormationSystem
import rtsgame.core.MovementSystem
import rtsgame.core.Vec3

/**
 * Advanced TDD tests to drive more sophisticated formation movement features.
 * These tests should expose gaps in the current implementation.
 */
class FormationMovementAdvancedTDDTest {
    
    @Test
    fun testFormationWithDifferentSpeeds() {
        // RED: Test that units with different speeds can maintain formation
        val leader = Position(0f, 0f)
        val follower = Position(10f, 10f) // Far from leader
        val spacing = 2f
        
        val targetSlot = FormationSystem.calculateSlot(leader, spacing, 1, 2)
        
        // Test different movement speeds
        val speeds = listOf(0.5f, 1f, 2f, 5f)
        val dt = 1f
        
        for (speed in speeds) {
            val currentVec = Vec3(follower.x, follower.y, 0f)
            val targetVec = Vec3(targetSlot.x, targetSlot.y, 0f)
            val newVec = MovementSystem.stepPosition(currentVec, targetVec, speed, dt)
            
            val initialDistance = follower.distanceTo(targetSlot)
            val newDistance = Position(newVec.first, newVec.second).distanceTo(targetSlot)
            
            // Should always move closer, regardless of speed
            assertTrue(newDistance <= initialDistance, 
                "Speed $speed: Should move closer. Initial: $initialDistance, New: $newDistance")
        }
    }
    
    @Test
    fun testFormationMaintainsShape() {
        // RED: Test that formation maintains relative positions as it moves
        val leaderStart = Position(0f, 0f)
        val spacing = 3f
        val unitCount = 4
        
        // Calculate initial formation slots
        val initialSlots = (0 until unitCount).map { idx -> 
            FormationSystem.calculateSlot(leaderStart, spacing, idx, unitCount) 
        }
        
        // Move leader to new position
        val leaderEnd = Position(10f, 5f)
        val finalSlots = (0 until unitCount).map { idx -> 
            FormationSystem.calculateSlot(leaderEnd, spacing, idx, unitCount) 
        }
        
        // Check that relative distances between units are preserved
        for (i in 0 until unitCount) {
            for (j in (i + 1) until unitCount) {
                val initialDistance = initialSlots[i].distanceTo(initialSlots[j])
                val finalDistance = finalSlots[i].distanceTo(finalSlots[j])
                
                assertEquals(initialDistance, finalDistance, 0.1f,
                    "Distance between units $i and $j should be preserved. " +
                    "Initial: $initialDistance, Final: $finalDistance")
            }
        }
    }
    
    @Test
    fun testLargeFormationDistribution() {
        // RED: Test formation behavior with larger groups (stress test)
        val leader = Position(0f, 0f)
        val spacing = 2f
        val unitCounts = listOf(1, 2, 4, 8, 12, 20)
        
        for (unitCount in unitCounts) {
            val slots = (0 until unitCount).map { idx -> 
                FormationSystem.calculateSlot(leader, spacing, idx, unitCount) 
            }
            
            // Check that no two units occupy the same slot
            for (i in 0 until slots.size) {
                for (j in (i + 1) until slots.size) {
                    val distance = slots[i].distanceTo(slots[j])
                    assertTrue(distance > 0.5f, 
                        "Units $i and $j too close in formation of $unitCount units. Distance: $distance")
                }
            }
            
            // Check that formation is reasonably compact (no unit too far from leader)
            val maxDistance = slots.maxOfOrNull { it.distanceTo(leader) } ?: 0f
            val expectedMaxDistance = spacing * (unitCount / 4f + 1f) // Rough estimate
            assertTrue(maxDistance < expectedMaxDistance * 2f,
                "Formation of $unitCount units too spread out. Max distance: $maxDistance")
        }
    }
    
    @Test
    fun testMovementSystemEdgeCases() {
        // RED: Test edge cases in movement system
        val target = Vec3(1f, 1f, 0f)
        
        // Test zero speed
        val zeroSpeedResult = MovementSystem.stepPosition(Vec3(0f, 0f, 0f), target, 0f, 1f)
        assertEquals(Vec3(0f, 0f, 0f), zeroSpeedResult, "Zero speed should not move")
        
        // Test zero time
        val zeroTimeResult = MovementSystem.stepPosition(Vec3(0f, 0f, 0f), target, 1f, 0f)
        assertEquals(Vec3(0f, 0f, 0f), zeroTimeResult, "Zero time should not move")
        
        // Test already at target
        val atTargetResult = MovementSystem.stepPosition(target, target, 1f, 1f)
        assertEquals(target, atTargetResult, "Should stay at target when already there")
        
        // Test overshoot (high speed)
        val overshootResult = MovementSystem.stepPosition(Vec3(0f, 0f, 0f), Vec3(1f, 0f, 0f), 10f, 1f)
        assertEquals(Vec3(1f, 0f, 0f), overshootResult, "Should stop at target, not overshoot")
    }
    
    @Test
    fun testFormationAdaptability() {
        // RED: Test that formation adapts to different spacing requirements
        val leader = Position(0f, 0f)
        val unitCount = 6
        val spacings = listOf(1f, 3f, 5f, 10f)
        
        for (spacing in spacings) {
            val slots = (0 until unitCount).map { idx -> 
                FormationSystem.calculateSlot(leader, spacing, idx, unitCount) 
            }
            
            // Check that actual spacing approximates requested spacing
            val actualSpacings = mutableListOf<Float>()
            for (i in 1 until slots.size) {
                actualSpacings.add(slots[i].distanceTo(leader))
            }
            
            val avgSpacing = actualSpacings.average().toFloat()
            assertTrue(avgSpacing >= spacing * 0.5f && avgSpacing <= spacing * 2f,
                "Average spacing $avgSpacing should be reasonably close to requested $spacing")
        }
    }
}