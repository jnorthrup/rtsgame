package com.rtsgame.shared.systems

import com.rtsgame.shared.entity.Building
import com.rtsgame.shared.entity.Entity
import com.rtsgame.shared.entity.GameUnit
import com.rtsgame.shared.game.GameState
import com.rtsgame.shared.map.GameMap
import com.rtsgame.shared.map.Position
import kotlinx.serialization.Serializable
import kotlin.math.max
import kotlin.math.min

// Reuse shared combat types defined in CombatProperties.kt

class CombatSystem(internal val gameMap: GameMap) {
    internal val damageTypeEffectiveness = mapOf(
        DamageType.NORMAL to mapOf(
            ArmorType.LIGHT to 1.0f,
            ArmorType.MEDIUM to 0.75f,
            ArmorType.HEAVY to 0.5f,
            ArmorType.FORTIFIED to 0.25f,
            ArmorType.ENERGY to 0.5f
        ),
        DamageType.PIERCING to mapOf(
            ArmorType.LIGHT to 1.5f,
            ArmorType.MEDIUM to 1.0f,
            ArmorType.HEAVY to 0.75f,
            ArmorType.FORTIFIED to 0.5f,
            ArmorType.ENERGY to 0.25f
        ),
        DamageType.EXPLOSIVE to mapOf(
            ArmorType.LIGHT to 1.5f,
            ArmorType.MEDIUM to 1.25f,
            ArmorType.HEAVY to 1.0f,
            ArmorType.FORTIFIED to 0.75f,
            ArmorType.ENERGY to 1.5f
        ),
        DamageType.ENERGY to mapOf(
            ArmorType.LIGHT to 1.0f,
            ArmorType.MEDIUM to 1.0f,
            ArmorType.HEAVY to 1.0f,
            ArmorType.FORTIFIED to 0.5f,
            ArmorType.ENERGY to 2.0f
        ),
        DamageType.PLASMA to mapOf(
            ArmorType.LIGHT to 1.25f,
            ArmorType.MEDIUM to 1.25f,
            ArmorType.HEAVY to 1.25f,
            ArmorType.FORTIFIED to 1.0f,
            ArmorType.ENERGY to 1.5f
        )
    )

    fun update(state: GameState): GameState {
        var updatedState = state

        // Update combat for all units
        state.entities.values
            .filterIsInstance<GameUnit>()
            .forEach { unit ->
                if (unit.isAttacking) {
                    val target = state.entities[unit.attackTargetId]
                    if (target != null && isInRange(unit, target)) {
                        val damage = calculateDamage(unit, target)
                        val updatedTarget = applyDamage(target, damage)
                        updatedState = updatedState.updateEntity(updatedTarget)
                    } else {
                        // Target is out of range or dead, stop attacking
                        val updatedUnit = unit.copy(isAttacking = false, attackTargetId = null)
                        updatedState = updatedState.updateEntity(updatedUnit)
                    }
                }
            }

        // Update shields and regeneration
        updatedState.entities.values
            .forEach { entity ->
                when (entity) {
                    is GameUnit -> {
                        if (entity.defenseProperties.shield < entity.defenseProperties.shieldRegen) {
                            val updatedEntity = regenerateShield(entity)
                            updatedState = updatedState.updateEntity(updatedEntity)
                        }
                    }
                    is Building -> {
                        if (entity.defenseProperties.shield < entity.defenseProperties.shieldRegen) {
                            val updatedEntity = regenerateShield(entity)
                            updatedState = updatedState.updateEntity(updatedEntity)
                        }
                    }
                }
            }

        return updatedState
    }

    internal fun isInRange(attacker: GameUnit, target: Entity): Boolean {
        val distance = calculateDistance(attacker.position, target.position)
        return distance <= attacker.attackProperties.range
    }

    internal fun calculateDistance(pos1: Position, pos2: Position): Float {
        val dx = pos1.x - pos2.x
        val dy = pos1.y - pos2.y
        return kotlin.math.sqrt(dx * dx + dy * dy)
    }

    internal fun calculateDamage(attacker: GameUnit, target: Entity): Float {
        val baseDamage = attacker.attackProperties.damage
        var targetDefense = attacker.defenseProperties // fallback, will be overwritten
        var armorType = com.rtsgame.shared.systems.ArmorType.LIGHT
        var armor = 0f
        var damageReduction = 0f

        when (target) {
            is GameUnit -> {
                armorType = target.defenseProperties.armorType
                armor = target.defenseProperties.armor
                damageReduction = target.defenseProperties.damageReduction
            }
            is Building -> {
                armorType = target.defenseProperties.armorType
                armor = target.defenseProperties.armor
                damageReduction = target.defenseProperties.damageReduction
            }
            else -> {
                // Unknown entity: default values
                armorType = com.rtsgame.shared.systems.ArmorType.LIGHT
                armor = 0f
                damageReduction = 0f
            }
        }

        val effectiveness = damageTypeEffectiveness[attacker.attackProperties.damageType]?.get(armorType) ?: 1.0f
        val armorReduction = max(0f, armor - attacker.attackProperties.penetration)

        var damage = baseDamage * effectiveness * (1f - armorReduction / (armorReduction + 100f)) * (1f - damageReduction)

        // Apply critical hit
        if (Math.random() < attacker.attackProperties.criticalChance) {
            damage *= attacker.attackProperties.criticalMultiplier
        }

        return damage
    }

    internal fun applyDamage(target: Entity, damage: Float): Entity {
        return when (target) {
            is GameUnit -> {
                val remainingShield = max(0f, target.defenseProperties.shield - damage)
                val remainingDamage = max(0f, damage - target.defenseProperties.shield)
                target.copy(
                    health = max(0f, target.health - remainingDamage),
                    defenseProperties = target.defenseProperties.copy(shield = remainingShield)
                )
            }
            is Building -> {
                val remainingShield = max(0f, target.defenseProperties.shield - damage)
                val remainingDamage = max(0f, damage - target.defenseProperties.shield)
                target.copy(
                    health = max(0f, target.health - remainingDamage),
                    defenseProperties = target.defenseProperties.copy(shield = remainingShield)
                )
            }
            else -> target
        }
    }

    internal fun regenerateShield(entity: Entity): Entity {
        return when (entity) {
            is GameUnit -> {
                val newShield = min(
                    entity.defenseProperties.shieldRegen,
                    entity.defenseProperties.shield + entity.defenseProperties.shieldRegen
                )
                entity.copy(defenseProperties = entity.defenseProperties.copy(shield = newShield))
            }
            is Building -> {
                val newShield = min(
                    entity.defenseProperties.shieldRegen,
                    entity.defenseProperties.shield + entity.defenseProperties.shieldRegen
                )
                entity.copy(defenseProperties = entity.defenseProperties.copy(shield = newShield))
            }
            else -> entity
        }
    }

    fun findTargetsInRange(attacker: GameUnit, state: GameState): List<Entity> {
        return state.entities.values
            .filter { it.team != attacker.team }
            .filter { isInRange(attacker, it) }
            .sortedBy { calculateDistance(attacker.position, it.position) }
    }
} 