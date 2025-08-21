package com.rtsgame.shared

import com.rtsgame.shared.ai.BattleJournal
import com.rtsgame.shared.util.gameRNG
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class IntegrationTest {
    @Test
    fun testBattleJournalAndRng() {
        val bj = BattleJournal()
        assertFalse(bj.isRecording)
        bj.startRecording( seed = 123, durationSeconds = 1, journalAllEvents = true)
        assertTrue(bj.isRecording)
        bj.recordEvent("INFO", "kotlin-test", System.currentTimeMillis(), mapOf("ok" to true))
        val rec = bj.stopRecording()
        // stopRecording returns a map when recording was active
        assertNotNull(rec)

        // RNG quick smoke
        val r = gameRNG.random()
        assertTrue(r >= 0.0 && r <= 1.0)
    }
}
