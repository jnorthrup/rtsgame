package com.rtsgame.shared.systems

import com.rtsgame.shared.entity.Unit
import com.rtsgame.shared.map.Position
import kotlin.test.Test
import kotlin.test.assertTrue

class FormationSeparationTest {
    @Test
    fun separationPushesAwayFromNeighbor() {
        val config = com.rtsgame.shared.config.FormationConfig(
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

        val subject = Unit(
            id = "s",
            position = Position(0f, 0f),
            health = 100f,
            maxHealth = 100f,
            speed = 1f,
            team = 1,
            type = com.rtsgame.shared.entity.UnitType.SOLDIER,
            attackProperties = com.rtsgame.shared.systems.AttackProperties(damage = 10f, range = 5f, attackSpeed = 1f),
            defenseProperties = com.rtsgame.shared.systems.DefenseProperties(armor = 5f, armorType = com.rtsgame.shared.systems.ArmorType.LIGHT)
        )

        val neighbor = subject.copy(position = Position(5f, 0f))

        val force = system.calculateSeparationForce(subject, listOf(neighbor))

        // neighbor is to the right of subject, so separation force.x should be negative (push left)
        assertTrue(force.x < 0f)
    }
}
