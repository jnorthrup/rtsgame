package rtsgame

import kotlin.test.Test
import kotlin.test.assertEquals
import rtsgame.core.Vec3

class NetworkPhysicsGenericMergeTDDTest {
    @Test
    fun merge_generic_maps_last_writer_wins() {
        val a = mapOf("u1" to Vec3(0f, 0f, 0f))
        val b = mapOf("u1" to Vec3(5f, 0f, 0f))

        val merged = NetworkPhysics.merge(a, b)

        assertEquals(Vec3(5f, 0f, 0f), merged["u1"])
    }
}
