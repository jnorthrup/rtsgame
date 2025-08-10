package com.rtsgame.core

import com.rtsgame.trikeshed.Join
import com.rtsgame.trikeshed.j

/**
 * Core game resources used in the RTS simulation.
 */
data class Resources(
    val mass: Int = 0,
    val energy: Int = 0,
    val computronium: Int = 0
) {
    operator fun plus(other: Resources): Resources = 
        Resources(mass + other.mass, energy + other.energy, computronium + other.computronium)
    
    operator fun minus(other: Resources): Resources = 
        Resources(mass - other.mass, energy - other.energy, computronium - other.computronium)
    
    fun canAfford(cost: Resources): Boolean = 
        mass >= cost.mass && energy >= cost.energy && computronium >= cost.computronium
}

/**
 * Game position on the 2D battlefield.
 */
data class Position(val x: Double, val y: Double) {
    fun distanceTo(other: Position): Double = 
        kotlin.math.sqrt((x - other.x) * (x - other.x) + (y - other.y) * (y - other.y))
}

/**
 * Unit types in the RTS game.
 */
enum class UnitType(
    val displayName: String,
    val cost: Resources,
    val maxHealth: Int,
    val attackPower: Int,
    val range: Double,
    val moveSpeed: Double
) {
    SCOUT("Scout", Resources(50, 25, 0), 80, 15, 4.0, 3.0),
    WARRIOR("Warrior", Resources(100, 50, 0), 150, 35, 2.5, 2.0),
    ENGINEER("Engineer", Resources(75, 100, 25), 100, 10, 1.5, 1.5),
    COMMANDER("Commander", Resources(200, 200, 100), 300, 50, 3.0, 2.5)
}

/**
 * Unit state and actions.
 */
enum class UnitAction {
    IDLE, MOVE, ATTACK, BUILD, PATROL, GATHER
}

/**
 * Game unit representation using TrikeShed patterns.
 */
data class Unit(
    val id: Int,
    val type: UnitType,
    val position: Position,
    val health: Int,
    val action: UnitAction = UnitAction.IDLE,
    val target: Position? = null,
    val owner: Player
) {
    val isAlive: Boolean get() = health > 0
    val healthRatio: Double get() = health.toDouble() / type.maxHealth
    
    fun moveTo(newPosition: Position): Unit = copy(
        position = newPosition,
        action = UnitAction.MOVE,
        target = newPosition
    )
    
    fun attack(targetPosition: Position): Unit = copy(
        action = UnitAction.ATTACK,
        target = targetPosition
    )
    
    fun takeDamage(damage: Int): Unit = copy(
        health = maxOf(0, health - damage)
    )
}

/**
 * Player representation.
 */
data class Player(
    val id: Int,
    val name: String,
    val resources: Resources = Resources(),
    val color: PlayerColor = PlayerColor.BLUE
) {
    fun spendResources(cost: Resources): Player = copy(
        resources = resources - cost
    )
    
    fun gainResources(income: Resources): Player = copy(
        resources = resources + income
    )
}

/**
 * Player colors for team identification.
 */
enum class PlayerColor(val displayName: String) {
    BLUE("Blue Team"),
    RED("Red Team"),
    GREEN("Green Team"),
    YELLOW("Yellow Team")
}

/**
 * Game state representation using TrikeShed Join pattern.
 * This demonstrates the core architectural pattern where game state
 * is a Join of world state and simulation parameters.
 */
data class GameState(
    val units: List<Unit> = emptyList(),
    val players: List<Player> = emptyList(),
    val gameTime: Double = 0.0,
    val worldSize: Join<Double, Double> = 1000.0 j 1000.0, // width j height using infix
    val turnNumber: Int = 0
) {
    fun addUnit(unit: Unit): GameState = copy(units = units + unit)
    
    fun removeUnit(unitId: Int): GameState = copy(
        units = units.filterNot { it.id == unitId }
    )
    
    fun updateUnit(unitId: Int, update: (Unit) -> Unit): GameState = copy(
        units = units.map { if (it.id == unitId) update(it) else it }
    )
    
    fun updatePlayer(playerId: Int, update: (Player) -> Player): GameState = copy(
        players = players.map { if (it.id == playerId) update(it) else it }
    )
    
    fun nextTurn(): GameState = copy(
        turnNumber = turnNumber + 1,
        gameTime = gameTime + 1.0
    )
    
    fun getUnitsForPlayer(playerId: Int): List<Unit> = 
        units.filter { it.owner.id == playerId && it.isAlive }
    
    fun getPlayer(playerId: Int): Player? = 
        players.find { it.id == playerId }
}