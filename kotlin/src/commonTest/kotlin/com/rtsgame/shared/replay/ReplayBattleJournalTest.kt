package com.rtsgame.shared.replay

import kotlin.test.Test
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class ReplayBattleJournalTest {
    @Test
    fun testStartStopRecordingProducesIdAndStores() {
        val jb = ReplayBattleJournal.instance
        jb.startRecording(mapOf("map" to "test"))
        // simulate a few frames
        jb.recordFrame(mapOf("gameState" to mapOf("gameTime" to 1)))
        jb.recordEvent("UNIT_SPAWN", "spawned unit")
        val id = jb.stopRecording()
        assertNotNull(id, "stopRecording should return an id")
        // ensure BattleStorage index contains the id on platforms that support it (JVM/JS)
        val idx = jb.getBattleIndex()
        assertTrue(idx.any { it["id"] == id }, "Saved battle id should appear in index when storage available")
    }

    @Test
    fun testAnalyzeBattleResourceBoomDetection_FailingSeed() {
        val jb = ReplayBattleJournal()
        // create a fake battle with stateSnapshots that should trigger RESOURCE_BOOM
        val snap = mapOf("time" to 100, "teamStats" to mapOf("blue" to mapOf("resources" to mapOf("totalValue" to 8000)), "red" to mapOf("resources" to mapOf("totalValue" to 1000))))
        jb.currentBattle = mutableMapOf("stateSnapshots" to mutableListOf(snap), "events" to mutableListOf<Any>(), "playerActions" to mutableListOf<Any?>())
        jb.analyzeBattle()
        val analysis = (jb.currentBattle!!["analysis"] as? MutableMap<String, Any?>)
        // this is a gap-analysis driven test: it's expected to find RESOURCE_BOOM in keyMoments
        val keyMoments = (analysis?.get("keyMoments") as? List<Map<String, Any?>>) ?: emptyList()
        // Intentionally assert existence; if implementation misses this, test will fail (red)
        assertTrue(keyMoments.any { it["type"] == "RESOURCE_BOOM" }, "Analysis should detect RESOURCE_BOOM")
    }
}
