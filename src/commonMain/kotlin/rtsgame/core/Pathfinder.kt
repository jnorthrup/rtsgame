package rtsgame.core

import trikeshed.lib.*

/**
 * Pathfinder integration with DensePathfinder
 * μ-Chain: Functional Extension - backward compatibility wrapper
 */
object Pathfinder {
    // Default grid map for testing (100x100 clear grid)
    private val defaultGrid = createGridMap(100, 100)

    fun findPath(start: Position, goal: Position): List<Position> {
        val path = DensePathfinder.findPath(start, goal, defaultGrid, tileSize = 1f)
        return path?.play ?: listOf(start, goal)
    }

    fun smoothPath(path: List<Position>): List<Position> {
        if (path.size <= 2) return path
        val smoothed = mutableListOf(path.first())
        for (i in 1 until path.size - 1) {
            val prev = smoothed.last()
            val curr = path[i]
            val next = path[i + 1]
            // Check if curr is collinear with prev and next
            val dx1 = curr.x - prev.x
            val dy1 = curr.y - prev.y
            val dx2 = next.x - curr.x
            val dy2 = next.y - curr.y
            val cross = dx1 * dy2 - dy1 * dx2
            if (cross != 0f) {
                // Not collinear, keep
                smoothed.add(curr)
            }
        }
        smoothed.add(path.last())
        return smoothed
    }
}
