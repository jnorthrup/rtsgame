package com.rtsgame.shared.replay

import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json

private const val INDEX_KEY = "battle_journal_index"

actual object BattleStorage {
    private val json = Json { prettyPrint = false }

    actual fun saveBattle(id: String, jsonStr: String): Boolean {
        try {
            if (kotlin.js.typeOf(kotlin.js.globalThis.asDynamic().localStorage) == "undefined") {
                // headless: no localStorage
                console.log("📹 Battle Journal: localStorage not available in headless environment, skipping save")
                return false
            }
            kotlin.js.globalThis.asDynamic().localStorage.setItem(id, jsonStr)
            // update index
            val idxRaw = kotlin.js.globalThis.asDynamic().localStorage.getItem(INDEX_KEY) as String?
            val idx = if (idxRaw == null) mutableListOf<String>() else json.decodeFromString(ListSerializer(String.serializer()), idxRaw).toMutableList()
            if (!idx.contains(id)) idx.add(id)
            kotlin.js.globalThis.asDynamic().localStorage.setItem(INDEX_KEY, json.encodeToString(ListSerializer(String.serializer()), idx))
            return true
        } catch (e: Throwable) {
            console.error("📹 Battle Journal: Failed to save battle:", e)
            return false
        }
    }

    actual fun loadBattle(id: String): String? {
        return try {
            if (kotlin.js.typeOf(kotlin.js.globalThis.asDynamic().localStorage) == "undefined") return null
            kotlin.js.globalThis.asDynamic().localStorage.getItem(id) as String?
        } catch (e: Throwable) {
            console.error("📹 Battle Journal: Failed to load battle $id:", e)
            null
        }
    }

    actual fun listBattles(): List<String> {
        return try {
            if (kotlin.js.typeOf(kotlin.js.globalThis.asDynamic().localStorage) == "undefined") return emptyList()
            val raw = kotlin.js.globalThis.asDynamic().localStorage.getItem(INDEX_KEY) as String?
            if (raw == null) return emptyList()
            json.decodeFromString(ListSerializer(String.serializer()), raw)
        } catch (e: Throwable) {
            console.error("📹 Battle Journal: Failed to read index:", e)
            emptyList()
        }
    }
}
