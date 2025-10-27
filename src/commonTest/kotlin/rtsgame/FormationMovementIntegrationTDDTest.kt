package rtsgame

import kotlin.test.Test
import kotlin.test.assertTrue
import rtsgame.core.Position
import rtsgame.core.FormationSystem
import rtsgame.core.MovementSystem
import rtsgame.core.Vec3

class FormationMovementIntegrationTDDTest {
    @Test
    fun testFollowersMoveTowardFormationSlots() {
        // Arrange: leader at (0,0), 3 followers at random positions
        val leaderPos = Position(0f, 0f)
        val followers = listOf(
            Position(5f, 5f),  // follower 0
            Position(-3f, 2f), // follower 1
            Position(1f, -4f)  // follower 2
        )
        val spacing = 2f
        val unitCount = 4 // leader + 3 followers
        val speed = 1f // units per second
        val dt = 1f // 1 second per tick

        // Calculate expected slots
        val slots = (0 until unitCount).map { idx -> FormationSystem.calculateSlot(leaderPos, spacing, idx, unitCount) }
        // slot 0 is leader, slots 1,2,3 for followers

        // Initial positions: leader at slot 0, followers at their positions
        var currentPositions = listOf(leaderPos) + followers

        // Simulate 10 ticks of movement
        repeat(10) {
            val newPositions = mutableListOf<Position>()
            for (i in currentPositions.indices) {
                if (i == 0) {
                    // Leader stays at position
                    newPositions.add(currentPositions[0])
                } else {
                    // Followers move toward their slot
                    val current = currentPositions[i]
                    val target = slots[i]
                    // Convert to Vec3 for stepPosition (z=0)
                    val currentVec = Vec3(current.x, current.y, 0f)
                    val targetVec = Vec3(target.x, target.y, 0f)
                    val newVec = MovementSystem.stepPosition(currentVec, targetVec, speed, dt)
                    newPositions.add(Position(newVec.first, newVec.second))
                }
            }
            currentPositions = newPositions
        }

        // Assert: each follower is close to their slot (within 0.1 units)
        for (i in 1 until currentPositions.size) {
            val pos = currentPositions[i]
            val slot = slots[i]
            val dx = pos.x - slot.x
            val dy = pos.y - slot.y
            val distance = kotlin.math.sqrt(dx * dx + dy * dy)
            assertTrue(distance < 0.1f, "Follower $i not close to slot: pos=$pos, slot=$slot, distance=$distance")
        }
    }
}