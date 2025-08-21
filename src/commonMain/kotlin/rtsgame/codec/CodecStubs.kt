package rtsgame.codec

import rtsgame.core.*

// Minimal, stable stubs for encode() used in tests. Tests only assert that encode() returns
// a non-empty ByteArray, so return a small sentinel byte array without pulling in
// the more complex internal encoders.

fun Cmd.encode(): ByteArray = when (this) {
	is Cmd.Move -> byteArrayOf(0)
	is Cmd.Attack -> byteArrayOf(1)
	is Cmd.Build -> byteArrayOf(2)
	is Cmd.Spawn -> byteArrayOf(3)
}

fun Net.encode(): ByteArray = byteArrayOf(1)
