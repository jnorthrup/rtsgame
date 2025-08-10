package com.rtsgame.trikeshed

/**
 * Returns the size of the Series.
 */
fun <T> size(series: Series<T>): Int = series.a

/**
 * Operator to access an element of the Series by its index.
 */
operator fun <T> Series<T>.get(i: Int): T {
    if (i < 0 || i >= size(this)) {
        throw IndexOutOfBoundsException("Index $i out of bounds for Series of size ${size(this)}")
    }
    return this.b(i)
}

/**
 * Extension function to get series value by index.
 */
fun <T> getSeriesValue(series: Series<T>, i: Int): T = series[i]

/**
 * An empty Series instance.
 */
val EmptySeries: Series<Nothing> = join(0) { _: Int ->
    error("Cannot access elements of an empty series.")
}

/**
 * Factory function to create an empty Series.
 */
fun <T> emptySeries(): Series<T> = EmptySeries as Series<T>

/**
 * Creates a Series from a collection.
 */
fun <T> Collection<T>.toSeries(): Series<T> = 
    join(this.size) { index -> this.elementAt(index) }

/**
 * Creates a Series from an array.
 */
fun <T> Array<T>.toSeries(): Series<T> = 
    join(this.size) { index -> this[index] }

/**
 * Creates a Series from a list.
 */
fun <T> List<T>.toSeries(): Series<T> = 
    join(this.size) { index -> this[index] }

/**
 * Creates a Series with a specific size and generator function.
 */
fun <T> seriesOf(size: Int, generator: (Int) -> T): Series<T> = 
    join(size, generator)

/**
 * Creates a Series from vararg elements.
 */
fun <T> seriesOf(vararg elements: T): Series<T> = 
    elements.toList().toSeries()

/**
 * Maps each element of the Series to a new value.
 */
fun <T, R> Series<T>.map(transform: (T) -> R): Series<R> = 
    join(size(this)) { index -> transform(this[index]) }

/**
 * Filters the Series based on a predicate.
 */
fun <T> Series<T>.filter(predicate: (T) -> Boolean): List<T> {
    val result = mutableListOf<T>()
    for (i in 0 until size(this)) {
        val element = this[i]
        if (predicate(element)) {
            result.add(element)
        }
    }
    return result
}

/**
 * Folds the Series from left to right.
 */
fun <T, R> Series<T>.fold(initial: R, operation: (R, T) -> R): R {
    var accumulator = initial
    for (i in 0 until size(this)) {
        accumulator = operation(accumulator, this[i])
    }
    return accumulator
}

/**
 * Converts the Series to a List.
 */
fun <T> Series<T>.toList(): List<T> {
    val result = mutableListOf<T>()
    for (i in 0 until size(this)) {
        result.add(this[i])
    }
    return result
}

/**
 * Extension function to check if Series is empty.
 */
fun <T> Series<T>.isEmpty(): Boolean = size(this) == 0

/**
 * Extension function to check if Series is not empty.
 */
fun <T> Series<T>.isNotEmpty(): Boolean = size(this) > 0

/**
 * Takes the first n elements of the Series.
 */
fun <T> Series<T>.take(n: Int): Series<T> {
    val actualSize = minOf(n, size(this))
    return join(actualSize) { index -> this[index] }
}

/**
 * Drops the first n elements of the Series.
 */
fun <T> Series<T>.drop(n: Int): Series<T> {
    val actualStart = minOf(n, size(this))
    val newSize = maxOf(0, size(this) - actualStart)
    return join(newSize) { index -> this[index + actualStart] }
}