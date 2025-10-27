package com.rtsgame.shared.systems

import kotlin.test.Test
import kotlin.test.assertEquals
import com.rtsgame.shared.map.Position
import com.rtsgame.shared.entity.GameUnit
import com.rtsgame.shared.game.GameState
import com.rtsgame.shared.config.FormationConfig
import com.rtsgame.shared.systems.AttackProperties
import com.rtsgame.shared.systems.DefenseProperties
import com.rtsgame.shared.entity.UnitType

class FormationSystemIntegrationTDDTest {
    @Test
    fun followersReceiveSymmetricSlots() {
        val config = FormationConfig(minFormationSlotDistance = 2f)
        val system = FormationSystem(config)

        val leader = GameUnit(
            id = "L",
            position = Position(10f, 10f),
            health = 100f,
            maxHealth = 100f,
            speed = 1f,
            team = 1,
            type = UnitType.SOLDIER,
            attackProperties = AttackProperties(0f),
            defenseProperties = DefenseProperties()
        )

        val f1 = leader.copy(id = "A", position = Position(9f, 10f), team = 1)
        val f2 = leader.copy(id = "B", position = Position(11f, 10f), team = 1)

        var state = GameState().addEntity(leader).addEntity(f1).addEntity(f2)

        // Update follower A
        val updatedA = system.updateFormation(f1, state)
        // compute expected slot for A
        val followers = listOf(f1, f2).sortedBy { it.id }
        val idxA = followers.indexOfFirst { it.id == f1.id }
        val expectedA = FormationSystem.calculateSlot(system.predictLeaderPosition(leader), config.minFormationSlotDistance, idxA, followers.size)

        assertEquals(expectedA.x, updatedA.idealFormationSlotWorld?.x, 0.0001f)
        assertEquals(expectedA.y, updatedA.idealFormationSlotWorld?.y, 0.0001f)
    }
}
