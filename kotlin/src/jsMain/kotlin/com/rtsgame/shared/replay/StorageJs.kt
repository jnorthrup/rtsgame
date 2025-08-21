package com.rtsgame.shared.replay

import kotlinx.browser.localStorage

/** JS implementation: use browser localStorage to persist small JSON payloads. */
actual object BattleStorage {
    actual fun saveBattle(id: String, json: String): Boolean {
        return try {
            localStorage.setItem(id, json)
            true
        } catch (t: Throwable) {
            false
        }
    }

    actual fun loadBattle(id: String): String? {
        return try {
            localStorage.getItem(id)
        } catch (t: Throwable) {
            null
        }
    }

    actual fun listBattles(): List<String> {
        return try {
            val out = ArrayList<String>()
            val len = localStorage.length ?: 0
            for (i in 0 until len) {
                val k = localStorage.key(i)
                if (k != null) out.add(k)
            }
            out
        } catch (t: Throwable) {
            emptyList()
        }
    }
}
