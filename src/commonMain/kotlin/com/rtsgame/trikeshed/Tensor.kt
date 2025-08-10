package com.rtsgame.trikeshed

/**
 * Creates a Tensor with given shape and data.
 */
fun <T> tensorOf(shape: List<Int>, data: List<T>): Tensor<T> {
    val stride = calculateStride(shape)
    return Tensor(data, shape, stride)
}

/**
 * Creates a Tensor with given shape and initialization function.
 */
fun <T> tensorOf(shape: List<Int>, init: (List<Int>) -> T): Tensor<T> {
    val totalSize = shape.fold(1) { acc, dim -> acc * dim }
    val stride = calculateStride(shape)
    val data = (0 until totalSize).map { flatIndex ->
        val coordinates = flatIndexToCoordinates(flatIndex, shape, stride)
        init(coordinates)
    }
    return Tensor(data, shape, stride)
}

/**
 * Calculates stride for tensor indexing.
 */
private fun calculateStride(shape: List<Int>): List<Int> {
    if (shape.isEmpty()) return emptyList()
    
    val stride = MutableList(shape.size) { 1 }
    for (i in shape.size - 2 downTo 0) {
        stride[i] = stride[i + 1] * shape[i + 1]
    }
    return stride
}

/**
 * Converts flat index to multi-dimensional coordinates.
 */
private fun flatIndexToCoordinates(flatIndex: Int, shape: List<Int>, stride: List<Int>): List<Int> {
    val coordinates = MutableList(shape.size) { 0 }
    var remaining = flatIndex
    
    for (i in coordinates.indices) {
        coordinates[i] = remaining / stride[i]
        remaining %= stride[i]
    }
    
    return coordinates
}

/**
 * Converts multi-dimensional coordinates to flat index.
 */
private fun coordinatesToFlatIndex(coordinates: List<Int>, stride: List<Int>): Int {
    return coordinates.zip(stride) { coord, str -> coord * str }.sum()
}

/**
 * Gets value from tensor at specified coordinates.
 */
operator fun <T> Tensor<T>.get(vararg coordinates: Int): T {
    return get(coordinates.toList())
}

/**
 * Gets value from tensor at specified coordinates.
 */
operator fun <T> Tensor<T>.get(coordinates: List<Int>): T {
    if (coordinates.size != shape.size) {
        throw IllegalArgumentException("Coordinate dimensions ${coordinates.size} don't match tensor dimensions ${shape.size}")
    }
    
    // Check bounds
    coordinates.zip(shape) { coord, dim ->
        if (coord < 0 || coord >= dim) {
            throw IndexOutOfBoundsException("Coordinate $coord out of bounds for dimension $dim")
        }
    }
    
    val flatIndex = coordinatesToFlatIndex(coordinates, stride)
    return data[flatIndex]
}

/**
 * Gets the rank (number of dimensions) of the tensor.
 */
val <T> Tensor<T>.rank: Int get() = shape.size

/**
 * Gets the total number of elements in the tensor.
 */
val <T> Tensor<T>.size: Int get() = data.size

/**
 * Checks if tensor is empty.
 */
fun <T> Tensor<T>.isEmpty(): Boolean = data.isEmpty()

/**
 * Maps each element of the tensor.
 */
fun <T, R> Tensor<T>.map(transform: (T) -> R): Tensor<R> = 
    Tensor(data.map(transform), shape, stride)

/**
 * Maps each element with its coordinates.
 */
fun <T, R> Tensor<T>.mapIndexed(transform: (List<Int>, T) -> R): Tensor<R> {
    val newData = data.mapIndexed { flatIndex, value ->
        val coordinates = flatIndexToCoordinates(flatIndex, shape, stride)
        transform(coordinates, value)
    }
    return Tensor(newData, shape, stride)
}

/**
 * Folds the tensor into a single value.
 */
fun <T, R> Tensor<T>.fold(initial: R, operation: (R, T) -> R): R = 
    data.fold(initial, operation)

/**
 * Creates a slice of the tensor along specified dimension.
 */
fun <T> Tensor<T>.slice(dimension: Int, index: Int): Tensor<T> {
    if (dimension < 0 || dimension >= shape.size) {
        throw IllegalArgumentException("Dimension $dimension out of bounds")
    }
    if (index < 0 || index >= shape[dimension]) {
        throw IndexOutOfBoundsException("Index $index out of bounds for dimension $dimension")
    }
    
    val newShape = shape.toMutableList().apply { removeAt(dimension) }
    val newData = mutableListOf<T>()
    
    // Generate all coordinate combinations for the slice
    generateSliceCoordinates(shape, dimension, index) { coordinates ->
        newData.add(get(coordinates))
    }
    
    return tensorOf(newShape, newData)
}

private fun generateSliceCoordinates(
    originalShape: List<Int>,
    sliceDimension: Int,
    sliceIndex: Int,
    callback: (List<Int>) -> Unit
) {
    val coordinates = MutableList(originalShape.size) { 0 }
    coordinates[sliceDimension] = sliceIndex
    
    fun generateRec(dimension: Int) {
        if (dimension == originalShape.size) {
            callback(coordinates.toList())
            return
        }
        if (dimension == sliceDimension) {
            generateRec(dimension + 1)
            return
        }
        
        for (i in 0 until originalShape[dimension]) {
            coordinates[dimension] = i
            generateRec(dimension + 1)
        }
    }
    
    generateRec(0)
}