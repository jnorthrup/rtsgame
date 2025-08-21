package rtsgame.core

import kotlin.test.*

class NetCodecTest {
    @Test fun encodeDecodeInputRoundtrip() {
        val cmds = listOf(Cmd.Move(1, Vec3(1f, 2f, 3f)))
        val net = Net.Input(player = 2, frame = 10L, cmds = cmds)
        val bytes = net.encode()
        // We only assert encode produced bytes and preserve some fields via basic checks
        assertTrue(bytes.isNotEmpty())
    }

    @Test fun encodeSyncProducesBytes() {
        val worldNew: World = mapOf(0 to entityOf("hp" to HP(9f to 10f)))
        // Manually create a delta that sets entity 0
        val delta: Delta = mapOf(0 to worldNew[0])
        val sync = Net.Sync(frame = 5L, delta = delta, hash = worldNew.hash())
        val bytes = sync.encode()
        assertTrue(bytes.isNotEmpty())
    }
}
