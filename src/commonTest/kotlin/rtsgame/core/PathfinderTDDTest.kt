package rtsgame.core

import kotlin.test.Test
import kotlin.test.assertTrue

// TDD seed: express expected behavior for Pathfinder routing logic. Placeholder assertions so tests fail until implemented.
class PathfinderTDDTest {
    @Test
    fun `pathfinder returns_straight_line_path_for_clear_map`() {
        // Arrange: tiny clear map from (0,0) to (3,0)
        val start = Position(0f, 0f)
        val goal = Position(3f, 0f)

        // Act: placeholder — replace with Pathfinder.findPath(start, goal, map)
        val path = listOf(start, goal)

        // Assert: path should start at start and end at goal; refine when Pathfinder exists
        assertTrue(path.first() == start)
        assertTrue(path.last() == goal)
    }
}
