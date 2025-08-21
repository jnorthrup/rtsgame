package com.rtsgame.shared.ai

import kotlin.time.Duration
import kotlin.time.ExperimentalTime
import kotlin.time.TimeSource

// Minimal multiplatform BattleJournal mirroring JS API for integration
@OptIn(ExperimentalTime::class)
class BattleJournal {
    var isRecording: Boolean = false
        private set

    private var startMark = TimeSource.Monotonic.markNow()
    private var durationSeconds: Long = 0
    private val events: MutableList<Map<String, Any?>> = mutableListOf()
    private val exceptions: MutableList<Map<String, Any?>> = mutableListOf()

    fun startRecording(seed: Int? = null, durationSeconds: Long = 0, journalAllEvents: Boolean = false) {
        isRecording = true
        this.startMark = TimeSource.Monotonic.markNow()
        this.durationSeconds = durationSeconds
        // store seed/journalAllEvents in metadata if needed
        events.clear()
        exceptions.clear()
    }

    fun stopRecording(): Map<String, Any?>? {
        if (!isRecording) return null
        isRecording = false
        return mapOf(
            "events" to events.toList(),
            "exceptions" to exceptions.toList(),
            "durationSeconds" to durationSeconds
        )
    }

    fun recordEvent(type: String, message: String, gameTime: Long, details: Map<String, Any?> = emptyMap()) {
        try {
            if (!isRecording) return
            // Simple duration check
            val elapsed = startMark.elapsedNow().inWholeSeconds
            if (durationSeconds > 0 && elapsed > durationSeconds) return
            val ev = mapOf(
                "type" to type,
                "message" to message,
                "gameTime" to gameTime,
                "details" to details,
                "timestamp" to TimeSource.Monotonic.markNow().toString()
            )
            events += ev
        } catch (e: Throwable) {
            exceptions += mapOf("error" to (e.message ?: "unknown"))
        }
    }

    fun logException(error: Throwable, context: Map<String, Any?> = emptyMap()) {
        exceptions += mapOf("error" to (error.message ?: ""), "context" to context)
    }

    companion object {
        val instance: BattleJournal = BattleJournal()
    }
}
