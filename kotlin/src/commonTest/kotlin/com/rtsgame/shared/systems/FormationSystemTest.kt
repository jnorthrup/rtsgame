package com.rtsgame.shared.systems

import com.rtsgame.shared.config.FormationConfig
import com.rtsgame.shared.entity.Unit
import com.rtsgame.shared.map.Position
import kotlin.test.Test
import kotlin.test.assertEquals

class FormationSystemTest {
    @Test
    fun testCalculateIdealFormationSlot() {
        val config = FormationConfig(
            predictionTimeSeconds = 0.5f,
            arrivalRadiusFactor = 1f,
            defaultMaxForce = 10f,
            defaultMaxTurnRateRadiansPerFrame = 0.1f,
            minFormationSlotDistance = 5f,
            maxFollowerSeparationDistanceFactor = 2f,
            steeringWeights = com.rtsgame.shared.config.SteeringWeights(separation = 1f, terrainAvoidance = 1f),
            steeringFeelerLengthFactor = 2f,
            neighborRadiusFactor = 1f,
            commandRanges = com.rtsgame.shared.config.CommandRanges(strategic = 100f, formationMinDistance = 20f, formationMaxDistance = 200f)
        )

        val system = FormationSystem(config)
        val leader = Unit(
            id = "leader",
            position = Position(10f, 10f),
            health = 100f,
            maxHealth = 100f,
            speed = 1f,
            team = 1,
            type = com.rtsgame.shared.entity.UnitType.SOLDIER,
            attackProperties = com.rtsgame.shared.systems.AttackProperties(damage = 10f, range = 5f, attackSpeed = 1f),
            defenseProperties = com.rtsgame.shared.systems.DefenseProperties(armor = 5f, armorType = com.rtsgame.shared.systems.ArmorType.LIGHT)
        )

        val follower = Unit(
            id = "follower",
            position = Position(12f, 12f),
            health = 100f,
            maxHealth = 100f,
            speed = 1f,
            team = 1,
            type = com.rtsgame.shared.entity.UnitType.SOLDIER,
            attackProperties = com.rtsgame.shared.systems.AttackProperties(damage = 10f, range = 5f, attackSpeed = 1f),
            defenseProperties = com.rtsgame.shared.systems.DefenseProperties(armor = 5f, armorType = com.rtsgame.shared.systems.ArmorType.LIGHT),
            formationAngle = 0f
        )

        val ideal = system.calculateIdealFormationSlot(follower, leader.position)
        // with angle 0 and distance minFormationSlotDistance=5, expect x += 5
        assertEquals(leader.position.x + 5f, ideal.x)
        assertEquals(leader.position.y + 0f, ideal.y)
    }
}
