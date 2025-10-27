package rtsgame

import kotlin.test.Test
import kotlin.test.assertEquals

class GameEngineTickDurationTest {
    @Test
    fun simulateTick_respects_tickDuration() {
        val engine = GameEngine()

        // Configure large tick duration so movement per tick is noticeable
        engine.tickDuration = 0.5f // 0.5 seconds per tick

        val initialState = engine.tick()
        val nextState = engine.simulateTick(initialState)

        // Our initial world entity 0 had vel.x = 60f in createInitialWorld (i.e. 60 units/sec)
        // Movement during one simulated tick should be vel.x * tickDuration = 60 * 0.5 = 30
        val initialX = initialState.entities.play.first().position.component1().value
        val nextX = nextState.entities.play.first().position.component1().value

        val moved = nextX - initialX

        assertEquals(30f, moved, 0.001f, "Entity should move vel * tickDuration units in one simulateTick")
    }
}
