package com.rtsgame.shared.systems

import kotlin.test.Test
import kotlin.test.assertEquals
import com.rtsgame.shared.map.Position

class FormationSystemMultiUnitTDDTest {
    @Test
    fun testCalculateFormationSlotsThreeUnitsCentered() {
        // Arrange: leader at (5,5), spacing 2, unitCount=3
        val leader = Position(5f, 5f)
        val spacing = 2f
        val unitCount = 3

        // Expect: three units centered on leader: offsets -2, 0, +2
        val expected0 = Position(leader.x - spacing, leader.y)
        val expected1 = Position(leader.x, leader.y)
        val expected2 = Position(leader.x + spacing, leader.y)

        // Act: compute slots for indices 0,1,2
        val actual0 = FormationSystem.calculateSlot(leader, spacing, 0, unitCount)
        val actual1 = FormationSystem.calculateSlot(leader, spacing, 1, unitCount)
        val actual2 = FormationSystem.calculateSlot(leader, spacing, 2, unitCount)

        // Assert: positions should be symmetric and match expected
        assertEquals(expected0.x, actual0.x, 0.0001f, "slot0 x mismatch")
        assertEquals(expected0.y, actual0.y, 0.0001f, "slot0 y mismatch")

        assertEquals(expected1.x, actual1.x, 0.0001f, "slot1 x mismatch")
        assertEquals(expected1.y, actual1.y, 0.0001f, "slot1 y mismatch")

        assertEquals(expected2.x, actual2.x, 0.0001f, "slot2 x mismatch")
        assertEquals(expected2.y, actual2.y, 0.0001f, "slot2 y mismatch")
    }
}
