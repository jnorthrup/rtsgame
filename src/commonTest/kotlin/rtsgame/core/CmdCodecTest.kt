package rtsgame.core

import kotlin.test.*

class CmdCodecTest {
    @Test fun moveCmdEncodeProducesBytes() {
        val cmd = Cmd.Move(42, Vec3(1f, 2f, 3f))
        val bytes = DenseCodec.run { cmd.encode() }
        assertTrue(bytes.isNotEmpty())
    }

    @Test fun attackCmdEncodeProducesBytes() {
        val cmd = Cmd.Attack(1, 2)
        val bytes = DenseCodec.run { cmd.encode() }
        assertTrue(bytes.isNotEmpty())
    }
}
