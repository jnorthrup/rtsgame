package rtsgame.core

// Minimal Position type used by core tests/TDD seeds.
data class Position(
    val x: Float,
    val y: Float
) {
    fun distanceTo(other: Position): Float {
        val dx = x - other.x
        val dy = y - other.y
        return kotlin.math.sqrt(dx * dx + dy * dy)
    }

    fun directionTo(other: Position): Position {
        val dx = other.x - x
        val dy = other.y - y
        val len = distanceTo(other)
        val eps = 1e-6f
        return if (len > eps) Position(dx / len, dy / len) else Position(0f, 0f)
    }
}
