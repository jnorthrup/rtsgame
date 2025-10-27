package rtsgame.core

/**
 * Minimal combat orchestration used by CommandSystem attack integration tests.
 * Applies damage, enforces basic rules, and returns a structured combat result.
 */
object CombatSystem {

	data class CombatResult(
		val updatedWorld: World,
		val didHit: Boolean,
		val damageApplied: Float,
		val targetDestroyed: Boolean,
		val reason: String = ""
	)

	fun performAttack(
		world: World,
		attackerId: EntityId,
		targetId: EntityId
	): CombatResult {
		val attacker = world[attackerId]
			?: return CombatResult(world, didHit = false, damageApplied = 0f, targetDestroyed = false, reason = "attacker_missing")
		val target = world[targetId]
			?: return CombatResult(world, didHit = false, damageApplied = 0f, targetDestroyed = false, reason = "target_missing")

		val attackerTeam = attacker.get<Team>("team")?.id
		val targetTeam = target.get<Team>("team")?.id
		if (attackerTeam != null && targetTeam != null && attackerTeam == targetTeam) {
			return CombatResult(world, didHit = false, damageApplied = 0f, targetDestroyed = false, reason = "friendly_fire")
		}

		val attackerPos = attacker.get<Pos>("pos")?.vec
		val targetPos = target.get<Pos>("pos")?.vec
		val range = attacker.get<Range>("range")?.value ?: Float.POSITIVE_INFINITY
		if (attackerPos != null && targetPos != null) {
			val distance = attackerPos.dist(targetPos)
			if (distance > range) {
				return CombatResult(world, didHit = false, damageApplied = 0f, targetDestroyed = false, reason = "out_of_range")
			}
		}

		val damage = attacker.get<Dmg>("dmg")?.value ?: 0f
		if (damage <= 0f) {
			return CombatResult(world, didHit = false, damageApplied = 0f, targetDestroyed = false, reason = "no_damage")
		}

		val hp = target.get<HP>("hp")
			?: return CombatResult(world, didHit = false, damageApplied = 0f, targetDestroyed = false, reason = "no_hp")

		val newHp = hp.value.first - damage
		val updatedWorld = if (newHp <= 0f) {
			world.update(targetId) { entity -> entity - "hp" }
		} else {
			world.update(targetId) { entity ->
				entity.plusEntry("hp" to HP(newHp to hp.value.second))
			}
		}

		return CombatResult(
			updatedWorld = updatedWorld,
			didHit = true,
			damageApplied = damage,
			targetDestroyed = newHp <= 0f
		)
	}
}
