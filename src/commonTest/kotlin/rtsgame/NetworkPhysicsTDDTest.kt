package rtsgame

import kotlin.test.Test
import kotlin.test.assertEquals

class NetworkPhysicsTDDTest {
    @Test
    fun merge_state_updates_is_deterministic() {
        // TDD seed: expects a deterministic merge function to exist
        val updateA = mapOf("unit_1" to "pos:1,1")
        val updateB = mapOf("unit_1" to "pos:2,2")

        // Act: placeholder — NetworkPhysics.merge not implemented yet
        val merged = NetworkPhysics.merge(updateA, updateB)

        // Expect deterministic merge behaviour: last-writer-wins for this seed
        assertEquals("pos:2,2", merged["unit_1"])
    }
}
