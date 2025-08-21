package com.rtsgame.shared.map

import kotlin.test.Test
import kotlin.test.assertEquals

class PositionTest {
    @Test
    fun testDistanceAndDirection() {
        val a = Position(0f, 0f)
        val b = Position(3f, 4f)

        // distance 3-4-5 triangle
        assertEquals(5f, a.distanceTo(b))

        val dir = a.directionTo(b)
        // direction should be normalized (3/5, 4/5)
        assertEquals(3f / 5f, dir.x)
        assertEquals(4f / 5f, dir.y)
    }

    @Test
    fun testDirectionToSamePoint() {
        val a = Position(1f, 1f)
        val dir = a.directionTo(a)
        assertEquals(0f, dir.x)
        assertEquals(0f, dir.y)
    }
}
