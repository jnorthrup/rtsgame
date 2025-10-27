package com.rtsgame.shared.systems

import kotlin.test.Test
import kotlin.test.assertEquals
import com.rtsgame.shared.map.Position

class FormationSystemTDDTest {
    @Test
    fun testCalculateFormationSlotForSingleUnit() {
        // Arrange: leader at (5,5), formation spacing 2, unitCount=1
        // This test is a TDD seed and will fail until FormationSystem exposes the calculation method.
        val leader = Position(5f, 5f)
        val spacing = 2f
        val unitCount = 1

        // Expect: single unit should be at leader position (or a canonical offset)
        val expected = Position(5f, 5f)

    // Act: call the (test-friendly) helper to compute the slot
    val actual = FormationSystem.calculateSlot(leader, spacing, 0, unitCount)

        // Assert (seed)
        assertEquals(expected.x, actual.x, "slot x should match expected for single unit")
        assertEquals(expected.y, actual.y, "slot y should match expected for single unit")
    }
}
