package com.rtsgame.shared.replay

/**
 * Common storage abstraction. Platforms provide an actual implementation.
 */
object BattleStorage {
    /** Save a battle JSON payload under the given id. Return true on success. */
    expect fun saveBattle(id: String, json: String): Boolean

    /** Load a battle JSON payload by id, or null if not found. */
    expect fun loadBattle(id: String): String?

    /** List saved battle ids (index). */
    expect fun listBattles(): List<String>
}
