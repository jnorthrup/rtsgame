package com.rtsgame.shared.replay

class ReplayPlayer(private val gameContext: MutableMap<String, Any?>) {
    private val battleJournal = ReplayBattleJournal.instance
    private var playing: Boolean = false
    private var currentTime: Double = 0.0
    private var playbackSpeed: Double = 1.0
    private var lastFrameTime: Double = 0.0

    fun loadReplay(replay: Map<String, Any?>) {
        battleJournal.loadReplay(replay)
        currentTime = 0.0
        lastFrameTime = 0.0
        updateGameState()
    }

    fun startPlayback() {
        if (playing) return
        playing = true
        lastFrameTime = kotlin.system.getTimeMillis().toDouble()
        (gameContext.getOrPut("battleLogger") { mutableListOf<Map<String, Any?>>() } as MutableList<MutableMap<String, Any?>>).add(mutableMapOf("source" to "system", "message" to "Started replay playback"))
    }

    fun stopPlayback() {
        if (!playing) return
        playing = false
        (gameContext.getOrPut("battleLogger") { mutableListOf<Map<String, Any?>>() } as MutableList<MutableMap<String, Any?>>).add(mutableMapOf("source" to "system", "message" to "Stopped replay playback"))
    }

    fun setPlaybackSpeed(speed: Double) { playbackSpeed = speed }

    fun seekTo(time: Double) {
        currentTime = max(0.0, min(time, (battleJournal.getDuration() as? Number ?: 0).toDouble()))
        updateGameState()
    }

    fun update(deltaTime: Double) {
        if (!playing) return
        currentTime += deltaTime * playbackSpeed
        if (currentTime >= (battleJournal.getDuration() as? Number ?: 0).toDouble()) {
            currentTime = (battleJournal.getDuration() as? Number ?: 0).toDouble()
            stopPlayback()
        }
        updateGameState()
    }

    private fun updateGameState() {
        val frame = battleJournal.getFrameAtTime(currentTime) as? Map<String, Any?> ?: return
        gameContext["gameTime"] = frame["time"]
        gameContext["resources"] = frame["resources"]

        val frameUnits = frame["units"] as? List<Map<String, Any?>> ?: emptyList()
        val existingUnits = gameContext.getOrPut("units") { mutableListOf<MutableMap<String, Any?>>() } as MutableList<MutableMap<String, Any?>>
        val newUnits = frameUnits.map { fu ->
            val id = fu["id"] as? String
            val existing = existingUnits.find { it["id"] == id }
            if (existing != null) {
                existing.putAll(fu)
                existing
            } else {
                val nu = fu.toMutableMap()
                existingUnits.add(nu)
                nu
            }
        }
        gameContext["units"] = existingUnits

        val frameBuildings = frame["buildings"] as? List<Map<String, Any?>> ?: emptyList()
        val existingBuildings = gameContext.getOrPut("buildings") { mutableListOf<MutableMap<String, Any?>>() } as MutableList<MutableMap<String, Any?>>
        val newBuildings = frameBuildings.map { fb ->
            val id = fb["id"] as? String
            val existing = existingBuildings.find { it["id"] == id }
            if (existing != null) {
                existing.putAll(fb)
                existing
            } else {
                val nb = fb.toMutableMap()
                existingBuildings.add(nb)
                nb
            }
        }
        gameContext["buildings"] = existingBuildings

        val events = battleJournal.getEventsAtTime(currentTime)
        events.forEach { ev ->
            val evMap = ev as? Map<String, Any?> ?: return@forEach
            val pos = evMap["position"]
            if (pos != null) {
                (gameContext.getOrPut("battleLogger") { mutableListOf<Map<String, Any?>>() } as MutableList<MutableMap<String, Any?>>).add(mutableMapOf("type" to evMap["type"], "message" to evMap["message"], "position" to pos))
            } else {
                (gameContext.getOrPut("battleLogger") { mutableListOf<Map<String, Any?>>() } as MutableList<MutableMap<String, Any?>>).add(mutableMapOf("type" to evMap["type"], "message" to evMap["message"]))
            }
        }
    }

    fun isPlaying(): Boolean = playing
    fun getCurrentTime(): Double = currentTime
    fun getDuration(): Number = battleJournal.getDuration()
}
