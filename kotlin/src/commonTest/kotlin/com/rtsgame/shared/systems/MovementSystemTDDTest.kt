package com.rtsgame.shared.systems

import kotlin.test.Test
import kotlin.test.assertEquals
import com.rtsgame.shared.map.Position

class MovementSystemTDDTest {
    @Test
    fun testMoveEntitySimpleStep() {
        // Arrange: entity at (0,0) wants to move towards (10,0) with speed 1 and dt=1
        // This is a TDD seed: it intentionally uses placeholders so it will fail until MovementSystem is wired.
        val start = Position(0f, 0f)
        val target = Position(10f, 0f)

        // Expect: after one second at speed 1, entity at (1,0)
        val expected = Position(1f, 0f)

        // Act: placeholder — replace with MovementSystem.step(...) call in implementation
        val actual = Position(0f, 0f) // TODO: implement movement logic and update this test

        // Assert: seed assertion (will fail until movement system implemented)
        assertEquals(expected.x, actual.x, "x position after step should match expected")
        assertEquals(expected.y, actual.y, "y position after step should match expected")
    }
}
