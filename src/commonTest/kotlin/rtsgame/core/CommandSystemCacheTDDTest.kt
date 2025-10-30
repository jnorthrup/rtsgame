package rtsgame.core

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * TDD: ensure path cache invalidation treats near-equal floating coordinates as the same key.
 *
 * This test will populate the cache, then call invalidate using slightly different floats and
 * expect the cache to be cleared (epsilon-based invalidation).
 */
class CommandSystemCacheTDDTest {

    private val openGrid: GridMap = { _, _ -> true }

    @Test
    fun `invalidate path cache removes near-equal keys`() {
        val start = rtsgame.Position(1.0f, 1.0f)
        val target = rtsgame.Position(10.0f, 10.0f)

        // Generate and cache a path
    val path = CommandSystem.generatePathForMovement(start, target, openGrid)
    assertNotNull(path, "expected a path on open grid for caching check")
    // Should have cached the path (implementation uses caching)
    assertTrue(CommandSystem.isPathCached(start, target, openGrid), "path should be cached after generation")

        // Invalidate using slightly different coordinates (within epsilon)
        val startNearby = rtsgame.Position(1.0005f, 1.0005f)
        val targetNearby = rtsgame.Position(10.0005f, 10.0005f)

        CommandSystem.invalidatePathCachePublic(startNearby, targetNearby)

        // Expect cache to be removed by epsilon-based invalidation
        assertFalse(CommandSystem.isPathCached(start, target, openGrid), "path cache should be removed by nearby invalidation")
    }

    @Test
    fun `cache stores independent entries per destination`() {
        val start = rtsgame.Position(0f, 0f)
        val targetA = rtsgame.Position(6f, 6f)
        val targetB = rtsgame.Position(6f, 9f)

        val pathA = CommandSystem.generatePathForMovement(start, targetA, openGrid)
        assertNotNull(pathA, "expected a path for targetA on open grid")
        assertTrue(CommandSystem.isPathCached(start, targetA, openGrid), "cache should store path for targetA")

        val pathB = CommandSystem.generatePathForMovement(start, targetB, openGrid)
        assertNotNull(pathB, "expected a path for targetB on open grid")

        // Both destinations should now be cached independently
        assertTrue(CommandSystem.isPathCached(start, targetA, openGrid), "cache should still contain path for targetA")
        assertTrue(CommandSystem.isPathCached(start, targetB, openGrid), "cache should contain path for targetB")
    }

    @Test
    fun `cache keys include obstacle map identity`() {
        val start = rtsgame.Position(0f, 0f)
        val target = rtsgame.Position(12f, 0f)

        val openField: GridMap = { _, _ -> true }
        val corridorField: GridMap = { x, y ->
            // Block a vertical wall except for the bottom row to keep a valid corridor
            if (x == 6 && y in 1..12) false else true
        }

        val openPath = CommandSystem.generatePathForMovement(start, target, openField)
        assertNotNull(openPath, "expected a path across open field")
        assertTrue(CommandSystem.isPathCached(start, target, openField), "cache should contain entry for open field")
        assertFalse(CommandSystem.isPathCached(start, target, corridorField), "different obstacle map should not reuse open-field cache entry")

        val corridorPath = CommandSystem.generatePathForMovement(start, target, corridorField)
        assertNotNull(corridorPath, "expected a path through corridor field")
        assertTrue(CommandSystem.isPathCached(start, target, corridorField), "cache should store entry keyed by corridor obstacles")
        assertTrue(CommandSystem.isPathCached(start, target, openField), "existing open-field cache entry should remain intact")
    }
}
