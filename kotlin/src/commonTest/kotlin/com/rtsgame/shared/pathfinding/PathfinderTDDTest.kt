package com.rtsgame.shared.pathfinding

import com.rtsgame.shared.map.GameMap
import com.rtsgame.shared.map.Position
import com.rtsgame.shared.map.Tile
import com.rtsgame.shared.map.TileType
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class PathfinderTDDTest {

    private fun makeGrid(width: Int, height: Int, walkable: (x: Int, y: Int) -> Boolean): List<List<Tile>> {
        return List(height) { y ->
            List(width) { x ->
                Tile(type = TileType.GRASS, isWalkable = walkable(x, y))
            }
        }
    }

    @Test
    fun straightLine_path_on_empty_map() {
        val width = 5
        val height = 1
        val grid = makeGrid(width, height) { _, _ -> true }
        val gm = GameMap(width, height, grid)

        val pf = Pathfinder(gm)
        val start = Position(0f, 0f)
        val end = Position((width - 1).toFloat(), 0f)

        val path = pf.findPath(start, end)
        assertNotNull(path, "expected a path on an empty map")
        assertEquals(width, path.size, "path should step across each tile in the row")
        // check centers are at .5, 1.5, ...
        assertEquals(0.5f, path.first().x)
    }

    @Test
    fun obstacle_avoidance_skirts_blocked_tile() {
        val width = 3
        val height = 3
        // center tile blocked
        val grid = makeGrid(width, height) { x, y -> !(x == 1 && y == 1) }
        val gm = GameMap(width, height, grid)

        val pf = Pathfinder(gm)
        val start = Position(0f, 0f)
        val end = Position(2f, 2f)

        val path = pf.findPath(start, end)
        assertNotNull(path, "expected path around blocked center")
        // ensure none of the path tiles use the blocked center
        assertTrue(path.none { pos -> pos.x.toInt() == 1 && pos.y.toInt() == 1 }, "path must avoid blocked tile")
    }
}
