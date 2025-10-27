package com.rtsgame.shared.pathfinding

import com.rtsgame.shared.map.GameMap
import com.rtsgame.shared.map.Position
import com.rtsgame.shared.map.Tile
import com.rtsgame.shared.map.TileType
import kotlin.test.Test
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class PathfinderWeightedTerrainTDDTest {

    private fun makeGrid(width: Int, height: Int, heightMap: (x: Int, y: Int) -> Float, walkable: (x: Int, y: Int) -> Boolean): List<List<Tile>> {
        return List(height) { y ->
            List(width) { x ->
                Tile(type = TileType.GRASS, height = heightMap(x, y), isWalkable = walkable(x, y))
            }
        }
    }

    @Test
    fun avoids_high_cost_row_even_if_shorter() {
        // 5x3 grid. Start at (0,1) left center, end at (4,1) right center.
        // Middle row (y=1) has high height cost in the center columns; A* should choose route that goes around via y=0 or y=2.
        val width = 5
        val height = 3
        val heightMap = { x: Int, y: Int -> if (y == 1 && x in 1..3) 5f else 0f }
        val grid = makeGrid(width, height, heightMap) { _, _ -> true }
        val gm = GameMap(width, height, grid)

        val pf = Pathfinder(gm)
        val start = Position(0f, 1f)
        val end = Position(4f, 1f)

        val path = pf.findPath(start, end)
        assertNotNull(path, "expected a path that navigates around high-cost center")
        // ensure the path includes some tile not on the high-cost middle band (y != 1) to confirm it went around
        assertTrue(path.any { p -> p.y.toInt() != 1 }, "path should go around high-cost middle band")
    }
}
