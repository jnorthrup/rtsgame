package com.rtsgame.shared.logging

class BattleLogger {
    private val entries = ArrayDeque<Pair<String, String>>()
    var maxEntries: Int = 50

    fun addEntry(type: String, message: String, time: String? = null) {
        val t = time ?: formatTime(System.currentTimeMillis())
        entries.addLast(type to "$t: $message")
        while (entries.size > maxEntries) entries.removeFirst()
    }

    fun getEntries(): List<Pair<String, String>> = entries.toList()

    fun formatTime(timestamp: Long): String {
        val seconds = (timestamp / 1000) % 60
        val minutes = (timestamp / 60000) % 60
        return "%02d:%02d".format(minutes, seconds)
    }
}
