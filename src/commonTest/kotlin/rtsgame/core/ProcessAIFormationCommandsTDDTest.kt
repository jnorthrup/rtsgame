package rtsgame.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class ProcessAIFormationCommandsTDDTest {

    @Test
    fun `processAIFormationCommands creates single formation for multiple moves`() {
        val world: World = mutableMapOf()

        // Create three Move commands targeting same position (Vec3 expected)
        val moves = listOf(
            Cmd.Move(id = 1, pos = Vec3(5f, 5f, 0f)),
            Cmd.Move(id = 2, pos = Vec3(5f, 5f, 0f)),
            Cmd.Move(id = 3, pos = Vec3(5f, 5f, 0f))
        )

        val result = CommandSystem.processAIFormationCommands(moves, world)
        assertNotNull(result, "expected a formation result")
        // We expect a single formation command that includes all three unit ids
        assertEquals(1, result.commandsCreated.size, "should create exactly one formation command")
        val cmd = result.commandsCreated.first()
        assertEquals(3, cmd.unitIds.size, "formation command should include all units")
        assertEquals(listOf(1,2,3), cmd.unitIds, "unitIds should match input order")
    }

    @Test
    fun `processBatchAICommands groups co-located move commands into one formation`() {
        val world: World = emptyMap()
        val commands = listOf(
            Cmd.Move(id = 10, pos = Vec3(20f, 20f, 0f)),
            Cmd.Move(id = 11, pos = Vec3(20f, 20f, 0f)),
            Cmd.Move(id = 12, pos = Vec3(20f, 20f, 0f))
        )

        val batchResult = CommandSystem.processBatchAICommands(commands, world)

        assertNotNull(batchResult, "expected batch processing result")
        assertTrue(batchResult.hasMovementCommands, "movement flag should be raised")

        val formationCommands = batchResult.processedCommands.filter { it.type == "formation_move" }
        assertEquals(1, formationCommands.size, "should create a single formation command for grouped moves")

        val formation = formationCommands.first()
        assertEquals(listOf(10, 11, 12), formation.unitIds, "formation should include all move command unit ids in order")
    }
}
