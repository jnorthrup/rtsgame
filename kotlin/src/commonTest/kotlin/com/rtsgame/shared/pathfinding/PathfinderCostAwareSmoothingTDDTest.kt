package com.rtsgame.shared.pathfinding

import kotlin.test.Test
import kotlin.test.assertTrue
import com.rtsgame.shared.map.GameMap
import com.rtsgame.shared.map.Tile
import com.rtsgame.shared.map.TileType
import com.rtsgame.shared.map.Position

class PathfinderCostAwareSmoothingTDDTest {
    @Test
    fun smoothingAvoidsHighCostShortcut() {
        // 3x3 map with center tile high cost
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
        // ensure a path exists
        assertTrue(path != null && path.size >= 3, "path should exist around the high tile")

        // If smoothing is cost-aware, it should NOT collapse to a single straight chord
        val smoothed = pf.smoothPath(path!!)
        assertTrue(smoothed.size > 2, "cost-aware smoothing should avoid a direct high-cost shortcut")
    }
}
