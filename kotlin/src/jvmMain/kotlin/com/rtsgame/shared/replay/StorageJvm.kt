package com.rtsgame.shared.replay

import java.io.File

/** JVM implementation: store replays under ~/.rtsgame/replays/ as files named by id. */
actual object BattleStorage {
    private val baseDir: File by lazy {
        val home = System.getProperty("user.home") ?: "."
        val dir = File(home, ".rtsgame/replays")
        if (!dir.exists()) dir.mkdirs()
        dir
    }

    actual fun saveBattle(id: String, json: String): Boolean {
        return try {
            val file = File(baseDir, id)
            file.writeText(json, Charsets.UTF_8)
            true
        } catch (t: Throwable) {
            false
        }
    }

    actual fun loadBattle(id: String): String? {
        return try {
            val file = File(baseDir, id)
            if (!file.exists()) return null
            file.readText(Charsets.UTF_8)
        } catch (t: Throwable) {
            null
        }
    }

    actual fun listBattles(): List<String> {
        return try {
            baseDir.list()?.toList() ?: emptyList()
        } catch (t: Throwable) {
            emptyList()
        }
    }
}
