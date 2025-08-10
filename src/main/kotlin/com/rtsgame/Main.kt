package com.rtsgame

import com.rtsgame.core.*
import com.rtsgame.trikeshed.*
import kotlinx.coroutines.*
import kotlin.time.Duration.Companion.seconds

/**
 * Main entry point for the RTS Game Kotlin Multiplatform demonstration.
 * 
 * This demonstrates the game running with:
 * - TrikeShed functional data structures (Join, Series, Tensor)
 * - Immutable game state management
 * - Real-time simulation with deterministic updates
 * - Resource management and unit control
 */
fun main() = runBlocking {
    println("🎮 RTS Game - Kotlin Multiplatform Edition")
    println("==========================================")
    println()
    
    // Demonstrate TrikeShed data structures
    demonstrateTrikeShed()
    
    // Initialize and run the game simulation
    runGameSimulation()
}

/**
 * Demonstrates the core TrikeShed data structures that power the game.
 */
private fun demonstrateTrikeShed() {
    println("🔧 TrikeShed Architecture Demonstration")
    println("---------------------------------------")
    
    // Join demonstration
    val gameSize = 1000.0 j 1000.0 // width j height using infix notation
    println("World Size (Join): ${gameSize.a} x ${gameSize.b}")
    
    // Series demonstration
    val unitSeries = seriesOf(5) { index -> 
        "Unit-${index + 1}"
    }
    println("Unit Series: ${unitSeries.toList()}")
    
    // Tensor demonstration - 3x3 battlefield grid
    val battlefieldTensor = tensorOf(listOf(3, 3)) { coords ->
        "Sector(${coords[0]},${coords[1]})"
    }
    println("Battlefield Tensor [1,1]: ${battlefieldTensor[1, 1]}")
    
    println()
}

/**
 * Runs the main game simulation demonstrating RTS mechanics.
 */
private suspend fun runGameSimulation() {
    println("🚀 Starting RTS Game Simulation")
    println("-------------------------------")
    
    val gameEngine = GameEngine()
    var gameState = gameEngine.createInitialGameState()
    
    // Display initial state
    displayGameState(gameState)
    
    // Run simulation for several turns
    repeat(10) { turn ->
        delay(1.seconds)
        
        // Add some dynamic gameplay
        gameState = when (turn) {
            2 -> {
                println("⚡ Blue team creates a new Scout!")
                gameEngine.createUnit(
                    gameState, 
                    playerId = 1, 
                    UnitType.SCOUT, 
                    Position(160.0, 100.0)
                ) ?: gameState
            }
            4 -> {
                println("⚔️ Blue Commander attacks Red base!")
                gameEngine.attackPosition(gameState, unitId = 1, Position(900.0, 900.0))
            }
            6 -> {
                println("🏃 Red units move to defend!")
                val state1 = gameEngine.moveUnit(gameState, unitId = 4, Position(850.0, 850.0))
                gameEngine.moveUnit(state1, unitId = 6, Position(830.0, 870.0))
            }
            else -> gameState
        }
        
        // Process game tick
        gameState = gameEngine.processTick(gameState)
        
        // Display current state
        displayGameState(gameState)
        
        // Check for end conditions
        val blueUnits = gameState.getUnitsForPlayer(1).filter { it.isAlive }
        val redUnits = gameState.getUnitsForPlayer(2).filter { it.isAlive }
        
        if (blueUnits.isEmpty() || redUnits.isEmpty()) {
            val winner = if (blueUnits.isNotEmpty()) "Blue" else "Red"
            println("🏆 Game Over! $winner team wins!")
            return@repeat
        }
    }
    
    println("\n✅ Game Simulation Complete")
    displayFinalStatistics(gameState)
}

/**
 * Displays the current game state in a readable format.
 */
private fun displayGameState(state: GameState) {
    println("\n📊 Turn ${state.turnNumber} (Time: ${state.gameTime})")
    println("=" * 50)
    
    // Display player resources
    state.players.forEach { player ->
        val units = state.getUnitsForPlayer(player.id)
        val aliveUnits = units.filter { it.isAlive }
        val totalHealth = aliveUnits.sumOf { it.health }
        
        println("${player.color.displayName} (${player.name}):")
        println("  Resources: Mass=${player.resources.mass}, Energy=${player.resources.energy}, Computronium=${player.resources.computronium}")
        println("  Units: ${aliveUnits.size} alive (Total Health: $totalHealth)")
        
        // Show unit details
        aliveUnits.forEach { unit ->
            val status = when (unit.action) {
                UnitAction.IDLE -> "Idle"
                UnitAction.MOVE -> "Moving to ${unit.target}"
                UnitAction.ATTACK -> "Attacking ${unit.target}"
                else -> unit.action.name
            }
            println("    ${unit.type.displayName} #${unit.id}: ${unit.health}/${unit.type.maxHealth} HP, $status")
        }
        println()
    }
}

/**
 * Displays final game statistics using TrikeShed data patterns.
 */
private fun displayFinalStatistics(state: GameState) {
    println("📈 Final Statistics")
    println("==================")
    
    // Create a series of player statistics
    val playerStats = state.players.map { player ->
        val units = state.getUnitsForPlayer(player.id)
        val aliveUnits = units.filter { it.isAlive }
        
        player.name j Join(
            aliveUnits.size,
            units.sumOf { it.health }
        )
    }.toSeries()
    
    // Display using Series operations
    for (i in 0 until size(playerStats)) {
        val (playerName, stats) = playerStats[i]
        val (unitCount, totalHealth) = stats
        println("$playerName: $unitCount units, $totalHealth total health")
    }
    
    // Calculate battle efficiency using tensor-like operations
    val totalUnits = state.units.size
    val aliveUnits = state.units.count { it.isAlive }
    val battleIntensity = (totalUnits - aliveUnits).toDouble() / totalUnits
    
    println("\nBattle Intensity: ${(battleIntensity * 100).toInt()}%")
    println("Game Duration: ${state.turnNumber} turns")
}

/**
 * Utility function for string repetition (like Python's * operator)
 */
private operator fun String.times(count: Int): String = repeat(count)