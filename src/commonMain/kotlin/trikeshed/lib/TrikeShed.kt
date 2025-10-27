package trikeshed.lib

/**
 * TrikeShed core types - Axiom of Core Composition
 */

// Indexed: Functional collection representing (Int) -> T
// μ-Chain: Core Instantiation
class Indexed<T> private constructor(
    private val backing: (Int) -> T,
    val size: Int
) : Iterable<T> {
    // Axiom of Declarative Structure: Indexed is a function
    operator fun invoke(i: Int): T = backing(i)
    operator fun get(i: Int): T = backing(i)

    // Expose for compatibility with tests expecting .play
    val play: List<T> by lazy { List(size) { backing(it) } }

    override fun iterator(): Iterator<T> = (0 until size).asSequence().map(backing).iterator()

    companion object {
        // μ-Chain: Functional Extension
        fun <T> of(size: Int, f: (Int) -> T): Indexed<T> = Indexed(f, size)
        fun <T> fromList(list: List<T>): Indexed<T> = Indexed({ list[it] }, list.size)
    }
}

// μ-Chain: Core Instantiation - Join types
data class Join<A, B>(val l: A, val r: B)
data class Twin<T>(val l: T, val r: T)

// μ-Chain: Operator Application - DSL operators
infix fun <A, B> A.j(that: B): Join<A, B> = Join(this, that)

// μ-Chain: Performance Purity - Binary serialization without String allocation
class BinaryBuffer(
    var data: ByteArray = ByteArray(256),
    var position: Int = 0
) {
    inline fun ensureCapacity(needed: Int) {
        if (position + needed > data.size) {
            data = data.copyOf((data.size * 2).coerceAtLeast(position + needed))
        }
    }

    inline fun writeByte(value: Byte) {
        ensureCapacity(1)
        data[position++] = value
    }

    inline fun readByte(): Byte = data[position++]

    fun writeVarInt(value: Int) {
        var v = value
        while (v and 0x7F.inv() != 0) {
            writeByte(((v and 0x7F) or 0x80).toByte())
            v = v ushr 7
        }
        writeByte(v.toByte())
    }

    fun readVarInt(): Int {
        var value = 0
        var shift = 0
        var b: Byte
        do {
            b = readByte()
            value = value or ((b.toInt() and 0x7F) shl shift)
            shift += 7
        } while (b.toInt() and 0x80 != 0)
        return value
    }

    inline fun writeFloat(value: Float) {
        writeVarInt(value.toBits())
    }

    inline fun readFloat(): Float = Float.fromBits(readVarInt())

    fun writeString(value: String) {
        val bytes = value.encodeToByteArray()
        writeVarInt(bytes.size)
        ensureCapacity(bytes.size)
        bytes.copyInto(data, position)
        position += bytes.size
    }

    fun readString(): String {
        val length = readVarInt()
        val slice = data.sliceArray(position until position + length)
        position += length
        return slice.decodeToString()
    }

    fun toByteArray(): ByteArray = data.copyOf(position)
}

// μ-Chain: Axiomatic Aliasing
typealias Series<T> = Sequence<T>
typealias Cursor<T> = Iterator<T>
