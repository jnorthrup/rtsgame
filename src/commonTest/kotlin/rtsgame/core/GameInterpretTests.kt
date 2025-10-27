package rtsgame.core

import kotlin.test.Test
import kotlin.test.assertTrue
// no coroutine test helpers here to keep tests multiplatform-safe

// TDD seed for Game.interpret: adapt to DenseCore.Cmd and World
class GameInterpretTests {
    @Test
    fun interpret_move_and_spawn_commands() {
        // Use the object Game.interpret which returns an Effect
        val world: World = mapOf(
            0 to entityOf("pos" to Pos(Triple(0f,0f,0f)))
        )

        val moveCmd = Cmd.Move(0, Triple(10f, 10f, 0f))
        val spawnCmd = Cmd.Spawn("soldier", 1, Triple(0f, 0f, 0f))

        // Verify interpreter produces suspend Effect functions
        val effect = Game.interpret(moveCmd)
        val effect2 = Game.interpret(spawnCmd)

        assertTrue(effect is Function<*>)
        assertTrue(effect2 is Function<*>)
    }
}
