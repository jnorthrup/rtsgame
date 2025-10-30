package rtsgame.core

import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

/**
 * Ensures Game.interpret attack commands route through CombatSystem for resolution.
 */
class GameCombatIntegrationTDDTest {

    @Test
    fun `attack command should ignore friendly fire`() = runTest {
        val world = mapOf(
            1 to attacker(team = 1, position = Triple(0f, 0f, 0f)),
            2 to target(team = 1, hp = 90f, position = Triple(2f, 0f, 0f))
        )

        val effect = Game.interpret(Cmd.Attack(from = 1, to = 2))
        val (updatedWorld, _) = effect(world)

        val targetHp = updatedWorld[2]?.get<HP>("hp")
        assertNotNull(targetHp, "Friendly fire should keep HP component intact")
    assertEquals(90f, targetHp.value.first, 0.01f, "Friendly fire should not apply damage")
    }

    @Test
    fun `attack command should respect range limitations`() = runTest {
        val world = mapOf(
            10 to attacker(team = 1, position = Triple(0f, 0f, 0f)),
            20 to target(team = 2, hp = 120f, position = Triple(500f, 0f, 0f))
        )

        val effect = Game.interpret(Cmd.Attack(from = 10, to = 20))
        val (updatedWorld, _) = effect(world)

        val targetHp = updatedWorld[20]?.get<HP>("hp")
        assertNotNull(targetHp, "Target should keep HP component when attack fails")
        assertEquals(120f, targetHp.value.first, 0.01f, "Out of range attack should not deal damage")
    }

    @Test
    fun `attack command should remove hp component on lethal damage`() = runTest {
        val world = mapOf(
            100 to attacker(team = 1, dmg = 150f, position = Triple(0f, 0f, 0f)),
            200 to target(team = 2, hp = 100f, position = Triple(1f, 0f, 0f))
        )

        val effect = Game.interpret(Cmd.Attack(from = 100, to = 200))
        val (updatedWorld, _) = effect(world)

        val remainingHp = updatedWorld[200]?.get<HP>("hp")
        assertNull(remainingHp, "Lethal damage should remove HP component from target")
    }

    private fun attacker(team: Int, dmg: Float = 25f, range: Float = 50f, position: Triple<Float, Float, Float>): Entity =
        entityOf(
            "team" to Team(team),
            "hp" to HP(100f to 100f),
            "dmg" to Dmg(dmg),
            "range" to Range(range),
            "pos" to Pos(position)
        )

    private fun target(team: Int, hp: Float, position: Triple<Float, Float, Float>): Entity =
        entityOf(
            "team" to Team(team),
            "hp" to HP(hp to hp),
            "pos" to Pos(position)
        )
}
