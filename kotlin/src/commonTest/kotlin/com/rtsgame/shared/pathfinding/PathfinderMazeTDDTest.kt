package com.rtsgame.shared.pathfinding

import com.rtsgame.shared.map.GameMap
import com.rtsgame.shared.map.Position
import com.rtsgame.shared.map.Tile
import com.rtsgame.shared.map.TileType
import kotlin.test.Test
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class PathfinderMazeTDDTest {

    private fun makeGrid(width: Int, height: Int, walkable: (x: Int, y: Int) -> Boolean): List<List<Tile>> {
        return List(height) { y ->
            List(width) { x ->
                Tile(type = TileType.GRASS, isWalkable = walkable(x, y))
            }
        }
    }

    @Test
    fun finds_path_through_corridor_maze() {
        // 7x5 grid with a winding corridor
        val width = 7
        val height = 5
        val walls = setOf(
            // block most tiles except a winding corridor
            // row 0
            Pair(1,0), Pair(2,0), Pair(3,0), Pair(4,0), Pair(5,0),
            // row 1
            Pair(0,1), Pair(2,1), Pair(4,1), Pair(6,1),
            // row 2
            Pair(0,2), Pair(2,2), Pair(4,2), Pair(6,2),
            // row 3
            Pair(0,3), Pair(2,3), Pair(4,3), Pair(6,3),
            // row 4
            Pair(1,4), Pair(2,4), Pair(3,4), Pair(4,4), Pair(5,4)
        )

        val grid = makeGrid(width, height) { x, y -> !walls.contains(Pair(x,y)) }
        val gm = GameMap(width, height, grid)

        val pf = Pathfinder(gm)
        val start = Position(0f, 0f)
        val end = Position(6f, 4f)

        val path = pf.findPath(start, end)
        assertNotNull(path, "expected a path through the corridor maze")
        // ensure no blocked tiles visited
        assertTrue(path.all { pos -> gm.isWalkable(pos) }, "path must only visit walkable tiles")
    }
}
