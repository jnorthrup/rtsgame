package com.rtsgame.trikeshed

/**
 * Interface representing a fundamental Join operation, similar to a Pair but with named `a` and `b` components.
 * 
 * This is the core data structure of the TrikeShed architecture, providing immutable
 * access to two related values while maintaining referential transparency.
 */
data class Join<A, B>(
    val a: A,
    val b: B
)

/**
 * Type alias for a Join where both elements are of the same type.
 */
typealias Twin<T> = Join<T, T>

/**
 * Type alias for a Series, which is a Join of a size (number) and an accessor function.
 * This represents a lazily-evaluated sequence of elements indexed by an integer.
 */
typealias Series<T> = Join<Int, (Int) -> T>

/**
 * Tensor representation with shape, stride, and data array for multidimensional data structures.
 */
data class Tensor<T>(
    val data: List<T>,
    val shape: List<Int>,
    val stride: List<Int>
)

/**
 * Range type for integer bounds checking.
 */
data class IntRange(
    val first: Int,
    val last: Int // Inclusive
)

/**
 * Type memento for serialization and network protocols.
 */
data class TypeMemento(
    val networkSize: Int? = null,
    val typeName: String
)

/**
 * IO memento type enumeration for data type identification.
 */
enum class IOMementoType(val typeName: String) {
    IoByte("Byte"),
    IoShort("Short"),
    IoInt("Int"),
    IoFloat("Float"),
    IoDouble("Double"),
    IoLong("Long"),
    IoBoolean("Boolean"),
    IoChar("Char"),
    IoString("String"),
    IoCharSeries("CharSeries"),
    IoBigDecimal("BigDecimal"),
    IoBigInt("BigInt"),
    IoDateTime("DateTime"),
    IoDuration("Duration"),
    IoUUID("UUID"),
    IoBinary("Binary"),
    IoUnknown("Unknown")
}

/**
 * Column metadata for tensor cursors and database-like operations.
 */
typealias ColumnMeta = Join<String, TypeMemento>

/**
 * Core tensor cursor types for data navigation.
 */
typealias CoreTensorCursor<T> = Tensor<T>
typealias CoreTensorRowVec<T> = Tensor<T>
typealias CoreTensorColumnVec<T> = Tensor<T>
typealias CursorMeta = Tensor<ColumnMeta>
typealias CoreTensorCursorWithMeta<T> = Join<CoreTensorCursor<T>, CursorMeta>