package com.rtsgame.core

import com.rtsgame.trikeshed.Series
import com.rtsgame.trikeshed.j
import kotlin.random.Random

/**
 * Game simulation engine that processes game state updates.
 * This demonstrates the deterministic, immutable update patterns of TrikeShed.
 */
class GameEngine(private val random: Random = Random.Default) {
    
    /**
     * Resource income per turn for different unit types.
     */
    private val resourceIncomeRates = mapOf(
        UnitType.ENGINEER to Resources(mass = 10, energy = 15, computronium = 5),
        UnitType.COMMANDER to Resources(mass = 5, energy = 10, computronium = 8)
    )
    
    /**
     * Processes a single game tick, returning new immutable game state.
     */
    fun processTick(state: GameState): GameState {
        return state
            .processResourceGeneration()
            .processUnitMovement()
            .processCombat()
            .nextTurn()
    }
    
    /**
     * Generate resources based on units that can produce them.
     */
    private fun GameState.processResourceGeneration(): GameState {
        val updatedPlayers = players.map { player ->
            val playerUnits = getUnitsForPlayer(player.id)
            val totalIncome = playerUnits
                .mapNotNull { unit -> resourceIncomeRates[unit.type] }
                .fold(Resources()) { acc, income -> acc + income }
            
            player.gainResources(totalIncome)
        }
        
        return copy(players = updatedPlayers)
    }
    
    /**
     * Process unit movement towards their targets.
     */
    private fun GameState.processUnitMovement(): GameState {
        val updatedUnits = units.map { unit ->
            if (unit.action == UnitAction.MOVE && unit.target != null) {
                moveUnitTowardsTarget(unit)
            } else {
                unit
            }
        }
        
        return copy(units = updatedUnits)
    }
    
    /**
     * Move a unit towards its target position.
     */
    private fun moveUnitTowardsTarget(unit: Unit): Unit {
        val target = unit.target ?: return unit
        val distance = unit.position.distanceTo(target)
        
        if (distance <= unit.type.moveSpeed) {
            // Reached target
            return unit.copy(
                position = target,
                action = UnitAction.IDLE,
                target = null
            )
        } else {
            // Move towards target
            val ratio = unit.type.moveSpeed / distance
            val newX = unit.position.x + (target.x - unit.position.x) * ratio
            val newY = unit.position.y + (target.y - unit.position.y) * ratio
            
            return unit.copy(position = Position(newX, newY))
        }
    }
    
    /**
     * Process combat between units.
     */
    private fun GameState.processCombat(): GameState {
        val combatResults = mutableListOf<Unit>()
        val attackingUnits = units.filter { it.action == UnitAction.ATTACK && it.target != null }
        
        for (attacker in attackingUnits) {
            val target = attacker.target!!
            val nearbyEnemies = units.filter { enemy ->
                enemy.owner.id != attacker.owner.id &&
                enemy.isAlive &&
                enemy.position.distanceTo(target) <= attacker.type.range
            }
            
            if (nearbyEnemies.isNotEmpty()) {
                val targetEnemy = nearbyEnemies.minByOrNull { it.position.distanceTo(target) }
                if (targetEnemy != null) {
                    val damage = calculateDamage(attacker, targetEnemy)
                    val updatedEnemy = targetEnemy.takeDamage(damage)
                    combatResults.add(updatedEnemy)
                }
            }
        }
        
        // Apply combat results
        val updatedUnits = units.map { unit ->
            combatResults.find { it.id == unit.id } ?: unit
        }
        
        return copy(units = updatedUnits)
    }
    
    /**
     * Calculate damage dealt in combat with some randomness.
     */
    private fun calculateDamage(attacker: Unit, defender: Unit): Int {
        val baseDamage = attacker.type.attackPower
        val randomFactor = random.nextDouble(0.8, 1.2) // +/- 20% randomness
        return (baseDamage * randomFactor).toInt()
    }
    
    /**
     * Creates initial game state with two players and some starting units.
     */
    fun createInitialGameState(): GameState {
        val bluePlayer = Player(1, "Blue Commander", Resources(1000, 1000, 100), PlayerColor.BLUE)
        val redPlayer = Player(2, "Red Commander", Resources(1000, 1000, 100), PlayerColor.RED)
        
        val initialUnits = listOf(
            // Blue team starting units
            Unit(1, UnitType.COMMANDER, Position(100.0, 100.0), UnitType.COMMANDER.maxHealth, owner = bluePlayer),
            Unit(2, UnitType.ENGINEER, Position(120.0, 120.0), UnitType.ENGINEER.maxHealth, owner = bluePlayer),
            Unit(3, UnitType.SCOUT, Position(140.0, 100.0), UnitType.SCOUT.maxHealth, owner = bluePlayer),
            
            // Red team starting units
            Unit(4, UnitType.COMMANDER, Position(900.0, 900.0), UnitType.COMMANDER.maxHealth, owner = redPlayer),
            Unit(5, UnitType.ENGINEER, Position(880.0, 880.0), UnitType.ENGINEER.maxHealth, owner = redPlayer),
            Unit(6, UnitType.WARRIOR, Position(860.0, 900.0), UnitType.WARRIOR.maxHealth, owner = redPlayer)
        )
        
        return GameState(
            units = initialUnits,
            players = listOf(bluePlayer, redPlayer),
            gameTime = 0.0,
            turnNumber = 0
        )
    }
    
    /**
     * Creates a command to spawn a new unit for a player.
     */
    fun createUnit(state: GameState, playerId: Int, unitType: UnitType, position: Position): GameState? {
        val player = state.getPlayer(playerId) ?: return null
        
        if (!player.resources.canAfford(unitType.cost)) {
            return null // Cannot afford unit
        }
        
        val nextUnitId = (state.units.maxOfOrNull { it.id } ?: 0) + 1
        val newUnit = Unit(
            id = nextUnitId,
            type = unitType,
            position = position,
            health = unitType.maxHealth,
            owner = player
        )
        
        return state
            .addUnit(newUnit)
            .updatePlayer(playerId) { it.spendResources(unitType.cost) }
    }
    
    /**
     * Command a unit to move to a target position.
     */
    fun moveUnit(state: GameState, unitId: Int, targetPosition: Position): GameState {
        return state.updateUnit(unitId) { unit ->
            unit.moveTo(targetPosition)
        }
    }
    
    /**
     * Command a unit to attack a target position.
     */
    fun attackPosition(state: GameState, unitId: Int, targetPosition: Position): GameState {
        return state.updateUnit(unitId) { unit ->
            unit.attack(targetPosition)
        }
    }
}