package rtsgame.core

import trikeshed.lib.*
import kotlin.math.abs
import kotlin.math.sqrt

/**
 * Dense A* pathfinding using TrikeShed functional composition
 * μ-Chain: Performance Purity + Algebraic Transformation
 */

// μ-Chain: Core Instantiation - pathfinding types using Join
data class PathNode(
    val pos: Join<Int, Int>,  // (x, y) grid coordinates
    val cost: Join<Float, Float>,  // (g-cost, h-cost) for f = g + h
    val parent: PathNode? = null
) {
    val f: Float get() = cost.l + cost.r
    val x: Int get() = pos.l
    val y: Int get() = pos.r
}

// μ-Chain: Axiomatic Aliasing - grid map as functional structure
typealias GridMap = (Int, Int) -> Boolean  // (x, y) -> isWalkable

object DensePathfinder {
    // μ-Chain: Functional Extension - A* implementation
    fun findPath(
        start: Position,
        goal: Position,
        gridMap: GridMap,
        tileSize: Float = 32f
    ): Indexed<Position>? {
        val startGrid = (start.x / tileSize).toInt() j (start.y / tileSize).toInt()
        val goalGrid = (goal.x / tileSize).toInt() j (goal.y / tileSize).toInt()

        // Early exit checks
        if (!gridMap(startGrid.l, startGrid.r) || !gridMap(goalGrid.l, goalGrid.r)) {
            return null
        }

        // μ-Chain: Metaseries Composition - functional A* with immutable structures
        val startNode = PathNode(startGrid, 0f j heuristic(startGrid, goalGrid))

        return astar(
            start = startNode,
            goal = goalGrid,
            gridMap = gridMap,
            openSet = setOf(startNode),
            closedSet = emptySet(),
            tileSize = tileSize
        )
    }

    // μ-Chain: Algebraic Transformation - tail-recursive A*
    private tailrec fun astar(
        start: PathNode,
        goal: Join<Int, Int>,
        gridMap: GridMap,
        openSet: Set<PathNode>,
        closedSet: Set<PathNode>,
        tileSize: Float
    ): Indexed<Position>? {
        if (openSet.isEmpty()) return null

        // μ-Chain: Functional Extension - find minimum f-cost node
        val current = openSet.minByOrNull { it.f } ?: return null

        // Goal reached - reconstruct path
        if (current.x == goal.l && current.y == goal.r) {
            return reconstructPath(current, tileSize)
        }

        val newOpenSet = openSet - current
        val newClosedSet = closedSet + current

        // μ-Chain: Metaseries Composition - process neighbors functionally
        val neighbors = getNeighbors(current.x, current.y)
            .filter { join -> gridMap(join.l, join.r) }
            .filterNot { join ->
                newClosedSet.any { it.x == join.l && it.y == join.r }
            }
            .map { join ->
                val nx = join.l
                val ny = join.r
                val tentativeG = current.cost.l + distance(current.x, current.y, nx, ny)
                val h = heuristic(nx j ny, goal)

                PathNode(
                    pos = nx j ny,
                    cost = tentativeG j h,
                    parent = current
                )
            }

        // μ-Chain: Algebraic Transformation - merge new nodes into open set
        val updatedOpenSet = neighbors.fold(newOpenSet) { acc, neighbor ->
            val existing = acc.find { it.x == neighbor.x && it.y == neighbor.y }
            if (existing == null || neighbor.cost.l < existing.cost.l) {
                acc - (existing ?: neighbor) + neighbor
            } else acc
        }

        return astar(start, goal, gridMap, updatedOpenSet, newClosedSet, tileSize)
    }

    // μ-Chain: Functional Extension - path reconstruction
    private fun reconstructPath(node: PathNode, tileSize: Float): Indexed<Position> {
        val path = generateSequence(node) { it.parent }
            .map { Position(it.x * tileSize, it.y * tileSize) }
            .toList()
            .reversed()

        return Indexed.fromList(path)
    }

    // μ-Chain: Functional Extension - neighbor generation
    private fun getNeighbors(x: Int, y: Int): List<Join<Int, Int>> = listOf(
        (x - 1) j y,
        (x + 1) j y,
        x j (y - 1),
        x j (y + 1),
        // Diagonals
        (x - 1) j (y - 1),
        (x - 1) j (y + 1),
        (x + 1) j (y - 1),
        (x + 1) j (y + 1)
    )

    // μ-Chain: Performance Purity - distance calculation without allocations
    private inline fun distance(x1: Int, y1: Int, x2: Int, y2: Int): Float {
        val dx = (x1 - x2).toFloat()
        val dy = (y1 - y2).toFloat()
        return sqrt(dx * dx + dy * dy)
    }

    private inline fun heuristic(from: Join<Int, Int>, to: Join<Int, Int>): Float =
        distance(from.l, from.r, to.l, to.r)
}

// μ-Chain: Functional Extension - simple grid map factory
fun createGridMap(width: Int, height: Int, obstacles: Set<Join<Int, Int>> = emptySet()): GridMap =
    { x: Int, y: Int ->
        x in 0 until width && y in 0 until height && (x j y) !in obstacles
    }
