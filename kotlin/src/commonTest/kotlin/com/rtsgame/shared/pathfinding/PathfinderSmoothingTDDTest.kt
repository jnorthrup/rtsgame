package com.rtsgame.shared.pathfinding

import com.rtsgame.shared.map.GameMap
import com.rtsgame.shared.map.Position
import com.rtsgame.shared.map.Tile
import com.rtsgame.shared.map.TileType
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class PathfinderSmoothingTDDTest {

    private fun makeGrid(width: Int, height: Int, walkable: (x: Int, y: Int) -> Boolean): List<List<Tile>> {
        return List(height) { y ->
            List(width) { x ->
                Tile(type = TileType.GRASS, isWalkable = walkable(x, y))
            }
        }
    }

    @Test
    fun smoothing_reduces_nodes_on_open_map() {
        val width = 5
        val height = 1
        val grid = makeGrid(width, height) { _, _ -> true }
        val gm = GameMap(width, height, grid)

        val pf = Pathfinder(gm)
        val start = Position(0f, 0f)
        val end = Position((width - 1).toFloat(), 0f)

        val path = pf.findPath(start, end)
        assertNotNull(path)
        // on an open straight row, smoothing should reduce the path to [start, end]
        assertEquals(2, path.size, "smoothing should collapse intermediate nodes on open map")
        assertEquals(0.5f, path.first().x)
        assertEquals((width - 1) + 0.5f, path.last().x)
    }
}
