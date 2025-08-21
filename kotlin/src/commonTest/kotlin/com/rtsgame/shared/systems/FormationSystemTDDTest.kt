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

        // Act: placeholder — replace with FormationSystem.calculateSlot(...) call
        val actual = Position(0f, 0f) // TODO: implement formation slot calculation

        // Assert (seed)
        assertEquals(expected.x, actual.x, "slot x should match expected for single unit")
        assertEquals(expected.y, actual.y, "slot y should match expected for single unit")
    }
}
