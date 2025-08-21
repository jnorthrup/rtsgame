package rtsgame.core

import kotlin.test.*

class Vec3Tests {
    @Test fun plusAndTimesAndDist() {
        val a: Vec3 = Triple(1f, 2f, 3f)
        val b: Vec3 = Triple(4f, -1f, 0f)
        val sum = a + b
        assertEquals(5f, sum.first)
        assertEquals(1f, sum.second)
        assertEquals(3f, sum.third)

        val scaled = a * 2f
        assertEquals(2f, scaled.first)
        assertEquals(4f, scaled.second)
        assertEquals(6f, scaled.third)

        val dist = a.dist(b)
        assertTrue(dist > 0f)
    }
}
