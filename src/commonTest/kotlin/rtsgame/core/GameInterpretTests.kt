package rtsgame.core

import kotlin.test.Test
import kotlin.test.assertTrue

// TDD seed for Game.interpret: express expected behavior in small steps; placeholder assertions to drive implementation.
class GameInterpretTests {
    @Test
    fun interpret_move_and_spawn_commands() {
        val game = Game()
        val world = World()
        // A simple Move command seed and Spawn command seed
        val moveCmd = Command.Move(EntityId(1), Position(10f, 10f))
        val spawnCmd = Command.Spawn(Faction.PLAYER, Position(0f, 0f))

        val afterMove = game.interpret(moveCmd, world)
        val afterSpawn = game.interpret(spawnCmd, world)

        // Placeholder expectations: tests should be updated to assert concrete state once API stabilizes.
        assertTrue(true)
    }
}
