package rtsgame.core

import kotlin.test.Test
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class DensePathfinderTDDTest {
    @Test
    fun testFindPathAroundObstacle() {
        // Arrange: 5x5 grid with obstacle blocking direct path
        val gridMap: GridMap = { x, y ->
            when {
                x < 0 || x >= 5 || y < 0 || y >= 5 -> false
                x == 2 && y == 0 -> false // obstacle blocks direct horizontal
                else -> true
            }
        }
        val start = Position(0f, 0f)
        val goal = Position(4f, 0f) // same row, but obstacle at (2,0)
        val tileSize = 1f

        // Act
        val path = DensePathfinder.findPath(start, goal, gridMap, tileSize)

        // Assert
        assertNotNull(path, "Path should be found")
        assertTrue(path.size >= 2, "Path should have at least start and goal")
        // Path returns grid positions
        assertTrue(path.first().x == 0f && path.first().y == 0f, "Path should start at start")
        assertTrue(path.last().x == 4f && path.last().y == 0f, "Path should end at goal")
        // Check no point is on obstacle (approx)
        path.forEach { pos ->
            val gx = (pos.x / tileSize).toInt()
            val gy = (pos.y / tileSize).toInt()
            assertTrue(gridMap(gx, gy), "Path point ($gx,$gy) is on obstacle")
        }
    }
}