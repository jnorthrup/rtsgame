package com.rtsgame.shared.systems

import kotlin.test.Test
import kotlin.test.assertEquals
import com.rtsgame.shared.map.Position

class FormationSystemRowsTDDTest {
    @Test
    fun testTwoRowFormationForSixUnits() {
        val leader = Position(0f, 0f)
        val spacing = 2f
        val unitCount = 6

        // Expected: two rows of 3 units each. Top row y=+spacing/2, bottom row y=-spacing/2.
        val rowSize = (unitCount + 1) / 2 // ceil
        val expected = mutableListOf<Position>()
        // top row indices 0..rowSize-1
        for (i in 0 until rowSize) {
            val centerOffset = (rowSize - 1).toFloat() / 2f
            val x = leader.x + (i.toFloat() - centerOffset) * spacing
            val y = leader.y + spacing / 2f
            expected.add(Position(x, y))
        }
        // bottom row indices
        for (i in 0 until unitCount - rowSize) {
            val centerOffset = (rowSize - 1).toFloat() / 2f
            val x = leader.x + (i.toFloat() - centerOffset) * spacing
            val y = leader.y - spacing / 2f
            expected.add(Position(x, y))
        }

        val actual = (0 until unitCount).map { idx -> FormationSystem.calculateSlot(leader, spacing, idx, unitCount) }

        for (i in 0 until unitCount) {
            assertEquals(expected[i].x, actual[i].x, 0.0001f, "slot $i x mismatch")
            assertEquals(expected[i].y, actual[i].y, 0.0001f, "slot $i y mismatch")
        }
    }
}
