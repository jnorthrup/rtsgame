package rtsgame.core

import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * TDD Integration Tests: CommandSystem → CombatSystem
 *
 * RED PHASE: Tests will fail until CommandSystem bridges attack commands into CombatSystem
 * GREEN PHASE: Implement CombatSystem attack resolution and CommandSystem wiring
 */
class CommandSystemCombatIntegrationTDDTest {

    @Test
    fun `RED - Attack command should reduce target HP via CombatSystem`() = runTest {
        val world = createWorld(
            attackerId = 1,
            attacker = createUnit(team = 1, hp = 100f, dmg = 25f, range = 50f, position = Position(0f, 0f)),
            targetId = 2,
            target = createUnit(team = 2, hp = 100f, dmg = 10f, range = 30f, position = Position(10f, 0f))
        )

        val command = CommandSystem.Command(
            id = "attack_test_1",
            type = "attack",
            unitIds = listOf(1),
            parameters = mapOf("target" to 2)
        )

        // RED: CommandSystem.executeAttackCommand does not exist yet
        val combatResult = CommandSystem.executeAttackCommand(world, command)

        assertTrue(combatResult.didHit, "Attack should register as a hit")
        assertEquals(25f, combatResult.damageApplied, 0.01f, "Damage applied should match attacker damage")
    val updatedHp = combatResult.updatedWorld[2]?.get<HP>("hp")?.value?.first ?: 0f
    assertEquals(75f, updatedHp, 0.01f, "Target HP should be reduced by attack damage")
        assertFalse(combatResult.targetDestroyed, "Target should survive when HP remains")
    }

    @Test
    fun `RED - Attack command should eliminate target when damage exceeds HP`() = runTest {
        val world = createWorld(
            attackerId = 5,
            attacker = createUnit(team = 1, hp = 100f, dmg = 120f, range = 60f, position = Position(0f, 0f)),
            targetId = 6,
            target = createUnit(team = 2, hp = 80f, dmg = 10f, range = 30f, position = Position(5f, 0f))
        )

        val command = CommandSystem.Command(
            id = "attack_test_2",
            type = "attack",
            unitIds = listOf(5),
            parameters = mapOf("target" to 6)
        )

        val combatResult = CommandSystem.executeAttackCommand(world, command)

        assertTrue(combatResult.didHit, "Attack should register as a hit")
        assertTrue(combatResult.targetDestroyed, "Target should be flagged as destroyed")
        assertNull(combatResult.updatedWorld[6]?.get<HP>("hp"), "Destroyed target should have HP component removed")
    }

    @Test
    fun `RED - Attack command should respect faction and avoid friendly fire`() = runTest {
        val world = createWorld(
            attackerId = 10,
            attacker = createUnit(team = 1, hp = 100f, dmg = 40f, range = 50f, position = Position(0f, 0f)),
            targetId = 11,
            target = createUnit(team = 1, hp = 90f, dmg = 10f, range = 30f, position = Position(5f, 0f))
        )

        val command = CommandSystem.Command(
            id = "attack_test_3",
            type = "attack",
            unitIds = listOf(10),
            parameters = mapOf("target" to 11)
        )

        val combatResult = CommandSystem.executeAttackCommand(world, command)

        assertFalse(combatResult.didHit, "Friendly units should not attack each other")
    val hpAfter = combatResult.updatedWorld[11]?.get<HP>("hp")?.value?.first ?: 0f
    assertEquals(90f, hpAfter, 0.01f, "Friendly fire should not change HP")
        assertEquals("friendly_fire", combatResult.reason)
    }

    @Test
    fun `RED - Attack command should fail when target is out of range`() = runTest {
        val world = createWorld(
            attackerId = 20,
            attacker = createUnit(team = 1, hp = 100f, dmg = 35f, range = 30f, position = Position(0f, 0f)),
            targetId = 21,
            target = createUnit(team = 2, hp = 90f, dmg = 10f, range = 30f, position = Position(100f, 0f))
        )

        val command = CommandSystem.Command(
            id = "attack_test_4",
            type = "attack",
            unitIds = listOf(20),
            parameters = mapOf("target" to 21)
        )

        val combatResult = CommandSystem.executeAttackCommand(world, command)

        assertFalse(combatResult.didHit, "Attack should miss when target is out of range")
    val hpAfter = combatResult.updatedWorld[21]?.get<HP>("hp")?.value?.first ?: 0f
    assertEquals(90f, hpAfter, 0.01f, "HP should remain unchanged when out of range")
        assertEquals("out_of_range", combatResult.reason)
    }

    @Test
    fun `RED - Attack command should report zero damage when attacker lacks weapon`() = runTest {
        val world = createWorld(
            attackerId = 30,
            attacker = createUnit(team = 1, hp = 100f, dmg = 0f, range = 50f, position = Position(0f, 0f)),
            targetId = 31,
            target = createUnit(team = 2, hp = 90f, dmg = 10f, range = 30f, position = Position(10f, 0f))
        )

        val command = CommandSystem.Command(
            id = "attack_test_5",
            type = "attack",
            unitIds = listOf(30),
            parameters = mapOf("target" to 31)
        )

        val combatResult = CommandSystem.executeAttackCommand(world, command)

        assertFalse(combatResult.didHit, "Attack without damage should not hit")
        assertEquals(0f, combatResult.damageApplied, 0.01f, "Damage applied should be zero when attacker has no weapon")
    val hpAfter = combatResult.updatedWorld[31]?.get<HP>("hp")?.value?.first ?: 0f
    assertEquals(90f, hpAfter, 0.01f, "Target HP should remain unchanged")
        assertEquals("no_damage", combatResult.reason)
    }

    // Helpers
    private fun createWorld(
        attackerId: Int,
        attacker: Entity,
        targetId: Int,
        target: Entity
    ): World = mapOf(attackerId to attacker, targetId to target)

    private fun createUnit(
        team: Int,
        hp: Float,
        dmg: Float,
        range: Float,
        position: Position
    ): Entity = mapOf(
        "team" to Team(team),
        "hp" to HP(hp to hp),
        "dmg" to Dmg(dmg),
        "range" to Range(range),
        "pos" to Pos(vec(position.x, position.y))
    )

    private fun vec(x: Float, y: Float): Vec3 = Triple(x, y, 0f)
}
