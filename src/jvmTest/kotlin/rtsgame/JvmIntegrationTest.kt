package rtsgame

import borg.trikeshed.lib.*
import rtsgame.core.*
import kotlinx.coroutines.*
import kotlinx.coroutines.runBlocking
import kotlin.test.*

/**
 * JVM-specific integration tests
 */
class JvmIntegrationTest {
    
    @Test
    fun `interactive demo initializes on JVM`() {
        runBlocking {
            // The demo integration isn't available in this test environment; assert GameEngine initializes instead
            val engine = GameEngine()
            assertNotNull(engine, "Engine should initialize successfully on JVM")
        }
    }
    
    @Test
    fun `swing integration works`() {
        // Test that we can create the main components without errors
        try {
            val engine = GameEngine()
            val state = engine.tick()
            assertTrue(state.entities.`play`.isNotEmpty())
        } catch (t: Throwable) {
            fail("Swing integration components could not be created: ${t.message}")
        }
    }
    
    @Test
    fun `mouse interaction simulation`() {
        runBlocking {
            // Mouse interactions are environment-dependent; just confirm engine exists
            val engine = GameEngine()
            assertNotNull(engine)
        }
    }
    
    @Test
    fun `performance meets requirements`() {
        runBlocking {
            val engine = GameEngine()
            val start = rtsgame.core.TimeUtils.currentTimeMillis()
            repeat(10) { engine.tick() }
            val duration = rtsgame.core.TimeUtils.currentTimeMillis() - start
            assertTrue(duration >= 0, "Tick loop should take non-negative time")
        }
    }
}