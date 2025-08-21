package com.rtsgame.shared.systems

import com.rtsgame.shared.config.FormationConfig
import com.rtsgame.shared.entity.Unit
import com.rtsgame.shared.map.Position
import kotlin.math.PI
import kotlin.test.Test
import kotlin.test.assertEquals

class FormationSystemExpandedTest {
    private fun baseConfig() = FormationConfig(
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

    private fun exampleUnit(angle: Float) = Unit(
        id = "u",
        position = Position(0f, 0f),
        health = 100f,
        maxHealth = 100f,
        speed = 1f,
        team = 1,
        type = com.rtsgame.shared.entity.UnitType.SOLDIER,
        attackProperties = com.rtsgame.shared.systems.AttackProperties(damage = 10f, range = 5f, attackSpeed = 1f),
        defenseProperties = com.rtsgame.shared.systems.DefenseProperties(armor = 5f, armorType = com.rtsgame.shared.systems.ArmorType.LIGHT),
        formationAngle = angle
    )

    private fun exampleLeader() = Unit(
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

    @Test
    fun testCalculateIdealFormationSlot_angle0() {
        val config = baseConfig()
        val system = FormationSystem(config)
        val leader = exampleLeader()
        val follower = exampleUnit(0f)

        val ideal = system.calculateIdealFormationSlot(follower, leader.position)
        assertEquals(leader.position.x + 5f, ideal.x)
        assertEquals(leader.position.y + 0f, ideal.y)
    }

    @Test
    fun testCalculateIdealFormationSlot_angle90() {
        val config = baseConfig()
        val system = FormationSystem(config)
        val leader = exampleLeader()
        val follower = exampleUnit((PI / 2).toFloat())

        val ideal = system.calculateIdealFormationSlot(follower, leader.position)
        assertEquals(leader.position.x + 0f, ideal.x)
        assertEquals(leader.position.y + 5f, ideal.y)
    }

    @Test
    fun testPredictLeaderPosition() {
        val config = baseConfig()
        val system = FormationSystem(config)
        val leader = exampleLeader().copy(velocity = Position(2f, 0f))

        val predicted = system.predictLeaderPosition(leader)
        // predictionTimeSeconds = 0.5 -> x moves by 1.0
        assertEquals(leader.position.x + 1f, predicted.x)
        assertEquals(leader.position.y + 0f, predicted.y)
    }
}
