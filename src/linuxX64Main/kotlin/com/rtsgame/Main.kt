package com.rtsgame

import com.rtsgame.core.*
import com.rtsgame.trikeshed.*

/**
 * Native platform main entry point for the RTS Game.
 * 
 * This demonstrates that the same game logic runs on native platforms
 * with minimal platform-specific code.
 */
fun main() {
    println("🎮 RTS Game - Kotlin/Native Edition")
    println("====================================")
    println()
    
    // Demonstrate TrikeShed working on native
    demonstrateNativeTrikeShed()
    
    // Run simplified simulation (no coroutines for native simplicity)
    runNativeSimulation()
}

/**
 * Demonstrates TrikeShed data structures working on native platform.
 */
private fun demonstrateNativeTrikeShed() {
    println("🔧 TrikeShed on Kotlin/Native")
    println("-----------------------------")
    
    // Join demonstration with battlefield coordinates
    val battlefieldCorner = Position(0.0, 0.0) j Position(1000.0, 1000.0)
    println("Battlefield: ${battlefieldCorner.a} to ${battlefieldCorner.b}")
    
    // Series of unit types
    val unitTypeSeries = UnitType.values().toList().toSeries()
    println("Available unit types:")
    for (i in 0 until size(unitTypeSeries)) {
        val unitType = unitTypeSeries[i]
        println("  ${i + 1}. ${unitType.displayName} (Cost: ${unitType.cost})")
    }
    
    println()
}

/**
 * Runs a simplified game simulation suitable for native platform.
 */
private fun runNativeSimulation() {
    println("🚀 Native RTS Simulation")
    println("------------------------")
    
    val gameEngine = GameEngine()
    var gameState = gameEngine.createInitialGameState()
    
    // Display initial state
    displayNativeGameState(gameState)
    
    // Run simulation for a few turns
    repeat(5) { turn ->
        println("\n⏰ Processing turn ${turn + 1}...")
        
        // Add some simple commands
        when (turn) {
            1 -> {
                println("📍 Blue scout moves forward")
                gameState = gameEngine.moveUnit(gameState, unitId = 3, Position(200.0, 150.0))
            }
            2 -> {
                println("⚔️ Blue commander prepares for battle")
                gameState = gameEngine.attackPosition(gameState, unitId = 1, Position(900.0, 900.0))
            }
            3 -> {
                println("🛡️ Red warrior advances")
                gameState = gameEngine.moveUnit(gameState, unitId = 6, Position(800.0, 850.0))
            }
        }
        
        // Process game tick
        gameState = gameEngine.processTick(gameState)
        
        // Display results
        displayNativeGameState(gameState)
    }
    
    println("\n✅ Native simulation complete!")
    
    // Show final statistics using TrikeShed patterns
    val playerSummary = gameState.players.map { player ->
        val units = gameState.getUnitsForPlayer(player.id).filter { it.isAlive }
        player.name j units.size
    }
    
    println("\n📊 Final Summary:")
    playerSummary.forEach { (name, unitCount) ->
        println("  $name: $unitCount units remaining")
    }
}

/**
 * Display game state optimized for native platform (simplified output).
 */
private fun displayNativeGameState(state: GameState) {
    println("\n📋 Game Status - Turn ${state.turnNumber}")
    
    state.players.forEach { player ->
        val units = state.getUnitsForPlayer(player.id).filter { it.isAlive }
        val totalPower = units.sumOf { it.type.attackPower }
        
        println("${player.color.displayName}:")
        println("  Units: ${units.size}, Combat Power: $totalPower")
        println("  Resources: M:${player.resources.mass} E:${player.resources.energy} C:${player.resources.computronium}")
        
        // Show active units with positions
        units.forEach { unit ->
            val pos = unit.position
            val action = when (unit.action) {
                UnitAction.IDLE -> "Idle"
                UnitAction.MOVE -> "Moving"
                UnitAction.ATTACK -> "Fighting"
                else -> unit.action.name
            }
            println("    ${unit.type.displayName}: (${pos.x.toInt()},${pos.y.toInt()}) - $action")
        }
    }
}