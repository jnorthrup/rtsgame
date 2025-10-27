package com.rtsgame.shared.pathfinding

import com.rtsgame.shared.map.GameMap
import com.rtsgame.shared.map.Position
import kotlin.math.sqrt

/**
 * A small A* Pathfinder adapted to use the project's GameMap API.
 * This implementation works on tile coordinates (integers) and returns
 * a list of Position values centered in each tile (x+0.5f, y+0.5f).
 */
class Pathfinder(internal val gameMap: GameMap) {
    data class Node(
        val x: Int,
        val y: Int,
        var g: Float = Float.POSITIVE_INFINITY,
        var h: Float = 0f,
        var parent: Node? = null
    ) {
        val f: Float get() = g + h
    }

    fun findPath(start: Position, end: Position): List<Position>? {
        val startX = start.x.toInt()
        val startY = start.y.toInt()
        val endX = end.x.toInt()
        val endY = end.y.toInt()

        if (!gameMap.isWalkable(start)) return null
        if (!gameMap.isWalkable(end)) return null

        // Use a small binary heap for the open set to avoid O(n) min selection
        val openHeap = object {
            private val heap = mutableListOf<Node>()
            private val index = mutableMapOf<Pair<Int, Int>, Int>()

            private fun comparator(a: Node, b: Node): Int {
                val fd = a.f.compareTo(b.f)
                return if (fd != 0) fd else a.h.compareTo(b.h)
            }

            private fun swap(i: Int, j: Int) {
                val ai = heap[i]
                val aj = heap[j]
                heap[i] = aj
                heap[j] = ai
                index[ai.x to ai.y] = j
                index[aj.x to aj.y] = i
            }

            private fun siftUp(i0: Int) {
                var i = i0
                while (i > 0) {
                    val parent = (i - 1) / 2
                    if (comparator(heap[i], heap[parent]) < 0) {
                        swap(i, parent)
                        i = parent
                    } else break
                }
            }

            private fun siftDown(i0: Int) {
                var i = i0
                while (true) {
                    val left = 2 * i + 1
                    val right = 2 * i + 2
                    var smallest = i
                    if (left < heap.size && comparator(heap[left], heap[smallest]) < 0) smallest = left
                    if (right < heap.size && comparator(heap[right], heap[smallest]) < 0) smallest = right
                    if (smallest != i) {
                        swap(i, smallest)
                        i = smallest
                    } else break
                }
            }

            fun add(node: Node) {
                val key = node.x to node.y
                val existingIndex = index[key]
                if (existingIndex != null) {
                    // replace existing node data and re-heapify
                    heap[existingIndex] = node
                    index[key] = existingIndex
                    siftUp(existingIndex)
                    siftDown(existingIndex)
                } else {
                    heap.add(node)
                    index[key] = heap.size - 1
                    siftUp(heap.size - 1)
                }
            }

            fun poll(): Node? {
                if (heap.isEmpty()) return null
                val res = heap[0]
                val last = heap.removeAt(heap.size - 1)
                index.remove(res.x to res.y)
                if (heap.isNotEmpty()) {
                    heap[0] = last
                    index[last.x to last.y] = 0
                    siftDown(0)
                }
                return res
            }

            fun contains(x: Int, y: Int) = index.containsKey(x to y)

            fun find(x: Int, y: Int): Node? = index[x to y]?.let { heap[it] }

            fun isEmpty() = heap.isEmpty()
        }

        val closedSet = mutableSetOf<Pair<Int, Int>>()

        val startNode = Node(startX, startY, g = 0f, h = distance(startX, startY, endX, endY))
        openList.add(startNode)

        while (!openHeap.isEmpty()) {
            // pick node with lowest f (heap)
            val current = openHeap.poll() ?: break
            if (current.x == endX && current.y == endY) {
                val raw = reconstructPath(current)
                return smoothPath(raw)
            }

            closedSet.add(current.x to current.y)

            // neighbors come from GameMap (Positions of neighbor tiles)
            for (nbrPos in gameMap.getNeighbors(current.x, current.y)) {
                val nx = nbrPos.x.toInt()
                val ny = nbrPos.y.toInt()

                // prevent corner-cutting: if moving diagonally, ensure adjacent orthogonal tiles are walkable
                val dx = nx - current.x
                val dy = ny - current.y
                if (dx != 0 && dy != 0) {
                    val orth1Walkable = gameMap.isWalkable(current.x + dx, current.y)
                    val orth2Walkable = gameMap.isWalkable(current.x, current.y + dy)
                    if (!orth1Walkable || !orth2Walkable) continue
                }

                if (closedSet.contains(nx to ny)) continue

                // movement cost: geometric distance scaled by tile penalty (1 + height)
                val moveCost = distance(current.x, current.y, nx, ny) * (1f + (gameMap.getTile(nx, ny)?.height ?: 0f))
                val tentativeG = current.g + moveCost

                val existingOpen = openHeap.find(nx, ny)
                if (existingOpen == null) {
                    val neighbor = Node(nx, ny)
                    neighbor.g = tentativeG
                    neighbor.h = distance(nx, ny, endX, endY)
                    neighbor.parent = current
                    openHeap.add(neighbor)
                } else if (tentativeG < existingOpen.g) {
                    // update and reinsert (heap handles replace)
                    existingOpen.g = tentativeG
                    existingOpen.parent = current
                    openHeap.add(existingOpen)
                }
            }

        }

        return null
    }

    internal fun reconstructPath(endNode: Node): List<Position> {
        val path = mutableListOf<Position>()
        var current: Node? = endNode
        while (current != null) {
            // center within tile
            path.add(0, Position(current.x + 0.5f, current.y + 0.5f))
            current = current.parent
        }
        return path
    }

    /**
     * Simple path smoothing: remove intermediate nodes when there is a clear
     * line-of-sight (no blocked tiles) between farther-apart nodes.
     */
    internal fun smoothPath(path: List<Position>): List<Position> {
        if (path.size <= 2) return path
        val out = mutableListOf<Position>()
        var i = 0
        while (i < path.size) {
            var j = path.size - 1
            // find farthest j such that LOS(i,j) is true and smoothing doesn't increase cost
            while (j > i) {
                if (!hasLineOfSight(path[i], path[j])) {
                    j--
                    continue
                }

                // compare chord cost vs original subpath cost
                val chordCost = costBetween(path[i], path[j])
                var originalCost = 0f
                var k = i
                while (k < j) {
                    val a = path[k]
                    val b = path[k + 1]
                    val dx = b.x - a.x
                    val dy = b.y - a.y
                    val dist = distance(a.x.toInt(), a.y.toInt(), b.x.toInt(), b.y.toInt())
                    // use tile at b for penalty
                    val tile = gameMap.getTile(b.x.toInt(), b.y.toInt())
                    val penalty = 1f + (tile?.height ?: 0f)
                    originalCost += dist * penalty
                    k++
                }

                if (chordCost <= originalCost + 1e-4f) {
                    break
                }

                j--
            }

            out.add(path[i])
            if (j == i) {
                // no progress (shouldn't happen) -> advance by one
                i++
            } else {
                i = j
            }
        }
        // ensure last point present
        if (out.last() != path.last()) out.add(path.last())
        return out
    }

    /**
     * Compute approximate traversal cost along a straight chord between two Positions.
     * Uses Bresenham stepping over tiles and sums segment distances weighted by tile height.
     */
    internal fun costBetween(a: Position, b: Position): Float {
        var cost = 0f
        var x0 = a.x.toInt()
        var y0 = a.y.toInt()
        val x1 = b.x.toInt()
        val y1 = b.y.toInt()

        val dx = kotlin.math.abs(x1 - x0)
        val sx = if (x0 < x1) 1 else -1
        val dy = -kotlin.math.abs(y1 - y0)
        val sy = if (y0 < y1) 1 else -1
        var err = dx + dy

        var prevX = x0
        var prevY = y0
        while (true) {
            val tile = gameMap.getTile(x0, y0)
            val penalty = 1f + (tile?.height ?: 0f)
            // distance from previous tile center to this tile center
            val dist = distance(prevX, prevY, x0, y0)
            cost += dist * penalty
            if (x0 == x1 && y0 == y1) break
            val e2 = 2 * err
            if (e2 >= dy) {
                err += dy
                prevX = x0
                x0 += sx
            }
            if (e2 <= dx) {
                err += dx
                prevY = y0
                y0 += sy
            }
        }
        return cost
    }

    /**
     * Bresenham line-of-sight on tiles between two positions.
     * Returns true only if every tile along the integer line is walkable.
     */
    internal fun hasLineOfSight(a: Position, b: Position): Boolean {
        var x0 = a.x.toInt()
        var y0 = a.y.toInt()
        val x1 = b.x.toInt()
        val y1 = b.y.toInt()

        val dx = kotlin.math.abs(x1 - x0)
        val sx = if (x0 < x1) 1 else -1
        val dy = -kotlin.math.abs(y1 - y0)
        val sy = if (y0 < y1) 1 else -1
        var err = dx + dy

        while (true) {
            if (!gameMap.isWalkable(x0, y0)) return false
            if (x0 == x1 && y0 == y1) break
            val e2 = 2 * err
            if (e2 >= dy) {
                err += dy
                x0 += sx
            }
            if (e2 <= dx) {
                err += dx
                y0 += sy
            }
        }
        return true
    }

    internal fun distance(x1: Int, y1: Int, x2: Int, y2: Int): Float {
        val dx = (x2 - x1).toFloat()
        val dy = (y2 - y1).toFloat()
        return sqrt(dx * dx + dy * dy)
    }
}