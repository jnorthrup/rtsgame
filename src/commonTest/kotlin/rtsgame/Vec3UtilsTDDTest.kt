package rtsgame

import kotlin.test.Test
import kotlin.test.assertEquals
import rtsgame.core.Vec3

class Vec3UtilsTDDTest {
    @Test
    fun vec3_add_and_distance() {
        val a = Vec3(1f, 2f, 3f)
        val b = Vec3(0.5f, -1f, 1f)

        val sum = Vec3Utils.add(a, b)
        assertEquals(Vec3(1.5f, 1f, 4f), sum)

        val dist = Vec3Utils.distance(a, b)
        // distance: sqrt((0.5)^2 + (3)^2 + (2)^2) = sqrt(0.25 + 9 + 4) = sqrt(13.25)
        val expected = kotlin.math.sqrt(13.25f)
        assertEquals(expected, dist, 0.0001f)
    }
}
