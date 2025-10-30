package rtsgame.core

import kotlin.test.Test
import kotlin.test.assertEquals

class MovementSystemTDDTest {
    @Test
    fun testStepPositionSimpleStep() {
        // Arrange: entity at (0,0) wants to move towards (10,0) with speed 1 and dt=1
        val start = Vec3(0f, 0f, 0f)
        val target = Vec3(10f, 0f, 0f)

        // Expect: after one second at speed 1, entity at (1,0,0)
        val expected = Vec3(1f, 0f, 0f)

        // Act: use MovementSystem helper to compute a single-step movement
        val actual = MovementSystem.stepPosition(start, target, 1f, 1f)

        // Assert: position after step should match expected
        assertEquals(expected.first, actual.first, "x position after step should match expected")
        assertEquals(expected.second, actual.second, "y position after step should match expected")
        assertEquals(expected.third, actual.third, "z position after step should match expected")
    }

    @Test
    fun testStepPositionAlreadyAtTarget() {
        // Arrange: entity already at target
        val position = Vec3(5f, 5f, 5f)
        val target = Vec3(5f, 5f, 5f)

        // Act: step position
        val actual = MovementSystem.stepPosition(position, target, 1f, 1f)

        // Assert: should return target position
        assertEquals(target.first, actual.first)
        assertEquals(target.second, actual.second)
        assertEquals(target.third, actual.third)
    }

    @Test
    fun testStepPositionOvershootTarget() {
        // Arrange: entity close to target, would overshoot
        val start = Vec3(0f, 0f, 0f)
        val target = Vec3(0.5f, 0f, 0f)

        // Act: step with speed that would overshoot
        val actual = MovementSystem.stepPosition(start, target, 2f, 1f)

        // Assert: should snap to target
        assertEquals(target.first, actual.first)
        assertEquals(target.second, actual.second)
        assertEquals(target.third, actual.third)
    }

    @Test
    fun testStepPositionDiagonalMovement() {
        // Arrange: diagonal movement
        val start = Vec3(0f, 0f, 0f)
        val target = Vec3(3f, 4f, 0f) // 5 units away

        // Act: move at speed 1 for dt=1
        val actual = MovementSystem.stepPosition(start, target, 1f, 1f)

        // Assert: should move 1 unit towards target (0.6, 0.8, 0)
        assertEquals(0.6f, actual.first, 0.001f)
        assertEquals(0.8f, actual.second, 0.001f)
        assertEquals(0f, actual.third, 0.001f)
    }

    @Test
    fun `step position ignores non positive speed`() {
        val current = Vec3(0f, 0f, 0f)
        val target = Vec3(10f, 0f, 0f)

        val resultZero = MovementSystem.stepPosition(current, target, speed = 0f, dt = 1f)
        assertEquals(current, resultZero, "zero speed should leave the unit stationary")

        val resultNegative = MovementSystem.stepPosition(current, target, speed = -5f, dt = 1f)
        assertEquals(current, resultNegative, "negative speed should not move the unit")
    }
}