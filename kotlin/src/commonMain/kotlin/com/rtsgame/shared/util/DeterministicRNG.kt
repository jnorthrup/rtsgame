package com.rtsgame.shared.util

import kotlin.math.*

class DeterministicRNG(seed: Long = System.currentTimeMillis()) {
    var seed: Long = seed
        private set
    private var state: Long = seed
    var originalSeed: Long = seed
        private set
    var callCount: Long = 0
        private set

    private val historyLimit = 1000
    private val history = ArrayList<Map<String, Any?>>(historyLimit)

    // LCG parameters
    private val a = 1664525L
    private val c = 1013904223L
    private val m = 4294967296L

    private fun next(): Double {
        callCount++
        state = (state * a + c) % m
        val result = state.toDouble() / m.toDouble()
        if (history.size < historyLimit) {
            history.add(mapOf("call" to callCount, "seed" to state, "value" to result))
        }
        return result
    }

    fun random(): Double = next()

    fun randomInt(min: Int, max: Int): Int {
        return floor(random() * (max - min + 1)).toInt() + min
    }

    fun randomFloat(min: Double, max: Double): Double = random() * (max - min) + min

    fun randomBool(probability: Double = 0.5): Boolean = random() < probability

    fun <T> randomChoice(array: List<T>): T? {
        if (array.isEmpty()) return null
        return array[randomInt(0, array.size - 1)]
    }

    fun <T> shuffle(list: List<T>): List<T> {
        val shuffled = list.toMutableList()
        for (i in shuffled.size - 1 downTo 1) {
            val j = randomInt(0, i)
            val tmp = shuffled[i]
            shuffled[i] = shuffled[j]
            shuffled[j] = tmp
        }
        return shuffled
    }

    fun randomPosition(minX: Double, maxX: Double, minY: Double, maxY: Double): Pair<Double, Double> {
        return Pair(randomFloat(minX, maxX), randomFloat(minY, maxY))
    }

    fun randomAngle(): Double = randomFloat(0.0, Math.PI * 2)

    fun randomDirection(): Pair<Double, Double> {
        val angle = randomAngle()
        return Pair(kotlin.math.cos(angle), kotlin.math.sin(angle))
    }

    fun reset() {
        state = originalSeed
        callCount = 0
        history.clear()
    }

    fun setSeed(newSeed: Long) {
        seed = newSeed
        originalSeed = newSeed
        state = newSeed
        callCount = 0
        history.clear()
    }

    fun getState(): Map<String, Any> = mapOf(
        "seed" to seed,
        "originalSeed" to originalSeed,
        "state" to state,
        "callCount" to callCount
    )

    fun setState(savedState: Map<String, Any>) {
        seed = (savedState["seed"] as Number).toLong()
        originalSeed = (savedState["originalSeed"] as Number).toLong()
        state = (savedState["state"] as Number).toLong()
        callCount = (savedState["callCount"] as Number).toLong()
        history.clear()
    }

    fun noise2D(x: Double, y: Double, scale: Double = 1.0): Double {
        val tempState = state
        val tempCallCount = callCount
        val coordSeed = (floor(x * 73856093).toLong() xor floor(y * 19349663).toLong())
        state = (originalSeed + coordSeed) % m
        callCount = 0
        val noise = random() * scale
        state = tempState
        callCount = tempCallCount
        return noise
    }

    fun getDebugInfo(): Map<String, Any?> = mapOf(
        "originalSeed" to originalSeed,
        "currentSeed" to seed,
        "currentState" to state,
        "callCount" to callCount,
        "historyLength" to history.size,
        "recentCalls" to history.takeLast(5)
    )

    fun randomPointInCircle(centerX: Double, centerY: Double, radius: Double): Pair<Double, Double> {
        val angle = random() * Math.PI * 2
        val r = radius * kotlin.math.sqrt(random())
        return Pair(centerX + r * kotlin.math.cos(angle), centerY + r * kotlin.math.sin(angle))
    }

    // Additional geometry helpers omitted for brevity
}

val gameRNG = DeterministicRNG()
