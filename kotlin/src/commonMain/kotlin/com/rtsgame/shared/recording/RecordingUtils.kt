package com.rtsgame.shared.recording

import com.rtsgame.shared.ai.BattleJournal
import com.rtsgame.shared.util.gameRNG

object SimulationConfig {
    // Modes: "FULL" or "AI_ONLY"
    var JOURNALING_MODE: String = "AI_ONLY"
    var GAME_SEED: Long? = null
    var JOURNALING_TIMEOUT_SECONDS: Long = 10
    var SIMULATION_DURATION_SECONDS: Long = 10
    var LOG_SIMULATION_EVENTS: Boolean = true
    var LOG_EXCEPTIONS: Boolean = true
}

fun generateRandomSeed(): Int {
    // Use deterministic RNG's current state to produce a reproducible integer
    return (gameRNG.random() * 1_000_000.0).toInt()
}

fun initializeRecordingSystem() {
    if (SimulationConfig.JOURNALING_MODE == "FULL") {
        // full simulation journaling
        val seed = SimulationConfig.GAME_SEED ?: generateRandomSeed().toLong()
        BattleJournal.instance.startRecording(seed.toInt(), SimulationConfig.JOURNALING_TIMEOUT_SECONDS, true)
    } else {
        val seed = SimulationConfig.GAME_SEED ?: generateRandomSeed().toLong()
        BattleJournal.instance.startRecording(seed.toInt(), SimulationConfig.SIMULATION_DURATION_SECONDS, false)
    }
}

fun startRandomSeedRecording(gameContext: MutableMap<String, Any?>, durationSeconds: Long = SimulationConfig.SIMULATION_DURATION_SECONDS): Int {
    val randomSeed = generateRandomSeed()
    val configDuration = durationSeconds
    BattleJournal.instance.startRecording(randomSeed, configDuration, SimulationConfig.JOURNALING_MODE == "FULL")
    gameContext["GAME_SEED"] = randomSeed
    gameContext["RECORD_AI_DECISIONS"] = true
    gameContext["RECORD_AI_DECISIONS_DURATION_SECONDS"] = durationSeconds
    return randomSeed
}

fun startRecordingWithSeed(gameContext: MutableMap<String, Any?>, seed: Int, durationSeconds: Long = 10): Int {
    gameContext["GAME_SEED"] = seed
    gameContext["RECORD_AI_DECISIONS"] = true
    gameContext["RECORD_AI_DECISIONS_DURATION_SECONDS"] = durationSeconds
    BattleJournal.instance.startRecording(seed, durationSeconds, SimulationConfig.JOURNALING_MODE == "FULL")
    return seed
}

fun getCurrentRecording(gameContext: MutableMap<String, Any?>): Any? {
    return try {
        val recording = BattleJournal.instance.stopRecording()
        if (recording == null) {
            gameContext["RECORD_AI_DECISIONS"] = true
            val seed = generateRandomSeed()
            gameContext["GAME_SEED"] = seed
            BattleJournal.instance.startRecording(seed, SimulationConfig.SIMULATION_DURATION_SECONDS, SimulationConfig.JOURNALING_MODE == "FULL")
        }
        recording
    } catch (e: Throwable) {
        if (SimulationConfig.LOG_EXCEPTIONS) {
            // simple logging to console (platform-specific log can be wired later)
            println("Error getting recording: ${e.message}")
        }
        null
    }
}

fun logSimulationEvent(eventType: String, message: String, details: Map<String, Any?> = emptyMap()) {
    if (SimulationConfig.LOG_SIMULATION_EVENTS) {
        println("[${kotlin.js.Date().toString()}] [$eventType] $message $details")
    }
    try {
        BattleJournal.instance.recordEvent(eventType, message, kotlin.system.getTimeMillis(), details)
    } catch (e: Throwable) {
        if (SimulationConfig.LOG_EXCEPTIONS) println("Error logging simulation event: ${e.message}")
    }
}

fun logErrorEvent(error: Throwable, context: Map<String, Any?> = emptyMap()) {
    if (SimulationConfig.LOG_EXCEPTIONS) {
        println("Simulation Error: ${error.message} $context")
    }
    try {
        BattleJournal.instance.logException(error, context)
    } catch (e: Throwable) {
        if (SimulationConfig.LOG_EXCEPTIONS) println("Error logging error event: ${e.message}")
    }
}
