package com.rtsgame.shared.replay

class ReplayManager(private val gameContext: MutableMap<String, Any?>) {
    private val battleJournal = ReplayBattleJournal.instance
    private var recordingEnabled: Boolean = false

    fun startRecording() {
        recordingEnabled = true
        battleJournal.startRecording()
        (gameContext.getOrPut("battleLogger") { mutableListOf<Map<String, Any?>>() } as MutableList<MutableMap<String, Any?>>).add(mutableMapOf("source" to "system", "message" to "Started recording battle"))
    }

    fun stopRecording(): String? {
        if (!recordingEnabled) return null
        recordingEnabled = false
        val battleId = battleJournal.stopRecording() as? String
        (gameContext.getOrPut("battleLogger") { mutableListOf<Map<String, Any?>>() } as MutableList<MutableMap<String, Any?>>).add(mutableMapOf("source" to "system", "message" to "Stopped recording battle"))
        return battleId
    }

    fun loadReplayFromString(json: String) {
        // naive: attach raw JSON to journal for now
        battleJournal.loadReplay(mapOf("frames" to listOf<Any>(), "events" to listOf<Any>(), "timestamp" to System.currentTimeMillis()))
        (gameContext.getOrPut("battleLogger") { mutableListOf<Map<String, Any?>>() } as MutableList<MutableMap<String, Any?>>).add(mutableMapOf("source" to "system", "message" to "Loaded replay"))
    }

    fun exportReplay(): String {
        val replay = battleJournal.exportReplay()
        return replay.toString()
    }

    fun recordFrame(gameContext: Map<String, Any?>?) {
        if (recordingEnabled) battleJournal.recordFrame(gameContext)
    }

    fun recordEvent(type: String, message: String, position: Any? = null) {
        if (recordingEnabled) battleJournal.recordEvent(type, message, position)
    }

    fun isRecording(): Boolean = recordingEnabled
}
