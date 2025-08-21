package rtsgame.core

import kotlin.test.*

class WorldHashTest {
    @Test fun hashChangesWhenEntityMutates() {
        val w1: World = mapOf(0 to entityOf("hp" to HP(10f to 10f)))
        val w2: World = mapOf(0 to entityOf("hp" to HP(9f to 10f)))
        assertNotEquals(w1.hash(), w2.hash())
        assertEquals(w1.hash(), w1.hash())
    }
}
