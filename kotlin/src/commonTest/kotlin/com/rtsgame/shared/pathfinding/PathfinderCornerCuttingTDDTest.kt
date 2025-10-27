package com.rtsgame.shared.pathfinding

import com.rtsgame.shared.map.GameMap
import com.rtsgame.shared.map.Position
import com.rtsgame.shared.map.Tile
import com.rtsgame.shared.map.TileType
import kotlin.test.Test
import kotlin.test.assertNull

class PathfinderCornerCuttingTDDTest {

    private fun makeGrid(width: Int, height: Int, walkable: (x: Int, y: Int) -> Boolean): List<List<Tile>> {
        return List(height) { y ->
            List(width) { x ->
                Tile(type = TileType.GRASS, isWalkable = walkable(x, y))
            }
        }
    }

    @Test
    fun diagonal_cut_through_blocked_corners_disallowed() {
        // 2x2 grid: start at (0,0), end at (1,1). Block (1,0) and (0,1) -> diagonal should be disallowed
        val width = 2
        val height = 2
        val grid = makeGrid(width, height) { x, y -> !(x == 1 && y == 0) && !(x == 0 && y == 1) }
        val gm = GameMap(width, height, grid)

        val pf = Pathfinder(gm)
        val start = Position(0f, 0f)
        val end = Position(1f, 1f)

        val path = pf.findPath(start, end)
        // with corner cutting prevented, there is no path
        assertNull(path, "expected no path when diagonal requires cutting blocked corners")
    }
}
