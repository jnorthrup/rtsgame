package com.rtsgame.shared.map

import kotlin.test.Test
import kotlin.test.assertEquals

class PositionEdgeCasesTest {
    @Test
    fun testOperators() {
        val a = Position(1f, 2f)
        val b = Position(3f, 4f)

        assertEquals(Position(4f, 6f), a + b)
        assertEquals(Position(-2f, -2f), a - b)
        assertEquals(Position(2f, 4f), a * 2f)
        assertEquals(Position(0.5f, 1f), a / 2f)
    }

    @Test
    fun testVerySmallDirectionBecomesZero() {
        val a = Position(0f, 0f)
        val b = Position(1e-7f, -1e-7f)

        val dir = a.directionTo(b)
        assertEquals(0f, dir.x)
        assertEquals(0f, dir.y)
    }

    @Test
    fun testDistanceSymmetry() {
        val a = Position(0f, 0f)
        val b = Position(3f, 4f)

        val d1 = a.distanceTo(b)
        val d2 = b.distanceTo(a)

        assertEquals(d1, d2)
    }
}
