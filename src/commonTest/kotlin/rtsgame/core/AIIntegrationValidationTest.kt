package rtsgame.core

import rtsgame.Position
import kotlin.test.Test
import kotlin.test.assertNotNull
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Quick validation test for AI→CommandSystem integration
 */
class AIIntegrationValidationTest {

    @Test
    fun `AI Move command conversion should work`() {
        // Create AI Move command
        val aiMoveCommand = Cmd.Move(id = 1, pos = Vec3(100f, 50f, 0f))
        val world = emptyMap<Int, Map<String, Any>>()
        
        // Convert using our new integration method
        val result = CommandSystem.convertAICommand(aiMoveCommand, world)
        
        // Verify conversion worked
        assertNotNull(result)
        assertEquals(1, result.unitId)
        assertEquals(Position(100f, 50f), result.targetPosition)
        assertEquals("move", result.commandType)
        assertTrue(result.isSuccessful)
    }

    @Test
    fun `AI Attack command conversion should work`() {
        // Create AI Attack command
        val aiAttackCommand = Cmd.Attack(from = 2, to = 3)
        val world = emptyMap<Int, Map<String, Any>>()
        
        // Convert using our new integration method
        val result = CommandSystem.convertAICommand(aiAttackCommand, world)
        
        // Verify conversion worked
        assertNotNull(result)
        assertEquals(2, result.unitId)
        assertEquals(3, result.targetUnitId)
        assertEquals("attack", result.commandType)
        assertTrue(result.isSuccessful)
    }

    @Test
    fun `AI batch processing should work`() {
        // Create multiple AI commands
        val aiCommands = listOf(
            Cmd.Move(1, Vec3(50f, 0f, 0f)),
            Cmd.Attack(2, 3),
            Cmd.Build("barracks", Vec3(200f, 200f, 0f))
        )
        val world = emptyMap<Int, Map<String, Any>>()
        
        // Process batch using our new integration method
        val result = CommandSystem.processBatchAICommands(aiCommands, world)
        
        // Verify batch processing worked
        assertNotNull(result)
        assertEquals(3, result.processedCommands.size)
        assertTrue(result.hasMovementCommands)
        assertTrue(result.hasCombatCommands)
    }
}