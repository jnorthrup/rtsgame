package rtsgame.core

import kotlin.test.Test
import kotlin.test.assertNotNull
import rtsgame.simulation.RTSRequestFactory

// TDD seed: basic command system smoke test
class CommandSystemTDDTest {
    @Test
    fun request_factory_creates_move_command() {
        // Arrange: use the simulation RTSRequestFactory shim
        val factory = RTSRequestFactory()

        // Act: placeholder call
        val req = factory.createMoveRequest(1, 10f, 10f)

        // Assert: basic sanity
        assertNotNull(req)
    }
}
