package rtsgame.core

import kotlin.test.Test
import kotlin.test.assertTrue

// TDD seed: express expected behavior for Pathfinder routing logic. Placeholder assertions so tests fail until implemented.
class PathfinderTDDTest {
    @Test
    fun pathfinder_returns_straight_line_path_for_clear_map() {
        // Arrange: clear map from (0,0) to (3,0)
        val start = Position(0f, 0f)
        val goal = Position(3f, 0f)

        // Act: find path
        val path = Pathfinder.findPath(start, goal)

        // Assert: path should start at start and end at goal
        assertTrue(path.first() == start)
        assertTrue(path.last() == goal)
    }

    @Test
    fun pathfinder_smooths_path_by_removing_unnecessary_waypoints() {
        // Arrange: path with unnecessary waypoint
        val path = listOf(Position(0f, 0f), Position(1f, 0f), Position(2f, 0f), Position(3f, 0f))

        // Act: smooth the path
        val smoothed = Pathfinder.smoothPath(path)

        // Assert: smoothed path should be direct from start to goal
        assertTrue(smoothed.size == 2, "Smoothed path should have only start and goal")
        assertTrue(smoothed.first() == Position(0f, 0f))
        assertTrue(smoothed.last() == Position(3f, 0f))
    }
}
