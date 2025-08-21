package com.rtsgame.shared.map

import kotlin.test.Test
import kotlin.test.assertEquals

class PositionExtraTest {
    @Test
    fun testDirectionEpsilon() {
        val a = Position(0f, 0f)
        // very small offset
        val b = Position(1e-7f, -1e-7f)
        val dir = a.directionTo(b)
        // should treat as zero-length and return (0,0)
        assertEquals(0f, dir.x)
        assertEquals(0f, dir.y)
    }

    @Test
    fun testDistanceFloatDelta() {
        val a = Position(0f, 0f)
        val b = Position(3f, 4f)
        val dist = a.distanceTo(b)
        // allow a small delta for floating arithmetic
        val delta = 1e-6f
        assertEquals(5f, dist, delta)
    }
}
