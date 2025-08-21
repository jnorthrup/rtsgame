package rtsgame.core

import kotlin.test.*

class DeltaCodecTest {
    @Test fun computeApplyDeltaRoundtrip() {
        val old: World = mapOf(
            0 to entityOf("hp" to HP(10f to 10f)),
            1 to entityOf("pos" to Pos(Vec3(0f, 0f, 0f)))
        )
        val nw: World = mapOf(
            0 to entityOf("hp" to HP(9f to 10f)),
            2 to entityOf("pos" to Pos(Vec3(1f, 1f, 1f)))
        )
        val engine = DenseNetworkEngine(1)
        val delta = engine.computeDelta(old, nw)
        val applied = engine.applyDelta(old, delta)
        assertEquals(nw, applied)
    }
}
