package com.rtsgame.shared.pathfinding

import kotlin.test.Test
import kotlin.test.assertTrue
import com.rtsgame.shared.map.GameMap
import com.rtsgame.shared.map.Tile
import com.rtsgame.shared.map.TileType
import com.rtsgame.shared.map.Position

class PathfinderSmoothingCostTDDTest {
    @Test
    fun smoothingShouldNotIncreaseCost() {
        // 3x3 with center tile walkable but very high-cost
        val low = Tile(TileType.GRASS, height = 0f, isWalkable = true)
        val high = Tile(TileType.ROCK, height = 10f, isWalkable = true)

        val row0 = listOf(low, low, low)
        val row1 = listOf(low, high, low)
        val row2 = listOf(low, low, low)

        val grid = listOf(row0, row1, row2)
        val map = GameMap(3, 3, grid)

        val pf = Pathfinder(map)

        val start = Position(0.5f, 1.5f)
        val end = Position(2.5f, 1.5f)

        val path = pf.findPath(start, end)
        assertTrue(path != null, "path should exist")

        val original = path!!
        val smoothed = pf.smoothPath(original)

        fun costOfPath(p: List<Position>): Float {
            var cost = 0f
            for (i in 0 until p.size - 1) {
                val a = p[i]
                val b = p[i + 1]
                val dx = b.x - a.x
                val dy = b.y - a.y
                val dist = kotlin.math.sqrt(dx * dx + dy * dy)
                val tile = map.getTile(b.x.toInt(), b.y.toInt())
                val penalty = 1f + (tile?.height ?: 0f)
                cost += dist * penalty
            }
            return cost
        }

        val origCost = costOfPath(original)
        val smoothCost = costOfPath(smoothed)

        // This should hold: smoothing must not increase total cost
        assertTrue(smoothCost <= origCost + 0.0001f, "smoothed cost should not be greater than original (orig=$origCost smooth=$smoothCost)")
    }
}
