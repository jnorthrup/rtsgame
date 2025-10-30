package rtsgame.core

import kotlin.test.*

class EntityTests {
    @Test fun entityOfAndUpdate() {
        val e = entityOf("x" to 1)
        assertEquals(1, e["x"])

        val world: World = mapOf(0 to e)
        val newWorld = world.update(0) { ent -> ent + ("y" to 2) }
        assertEquals(2, newWorld[0]?.get<Int>("y"))

        val unchanged = world.update(1) { ent -> ent }
        assertEquals(world, unchanged)
    }

    @Test fun world_update_with_nonexistent_entity_returns_unchanged_world() {
        val world: World = mapOf(0 to entityOf("x" to 1))
        val updatedWorld = world.update(999) { ent -> ent + ("y" to 2) }

        // World should be unchanged
        assertEquals(world, updatedWorld, "World should be unchanged when updating nonexistent entity")
        assertEquals(1, world.size, "Original world should still have one entity")
        assertNull(updatedWorld[999], "Nonexistent entity should not be created")
    }

    @Test fun world_update_with_empty_world_returns_empty_world() {
        val world: World = emptyMap()
        val updatedWorld = world.update(0) { ent -> ent + ("x" to 1) }

        // World should remain empty
        assertEquals(world, updatedWorld, "Empty world should remain empty when updating nonexistent entity")
        assertTrue(updatedWorld.isEmpty(), "Updated world should still be empty")
    }

    @Test fun world_update_preserves_other_entities() {
        val world: World = mapOf(
            0 to entityOf("x" to 1),
            1 to entityOf("y" to 2),
            2 to entityOf("z" to 3)
        )

        val updatedWorld = world.update(1) { ent -> ent + ("updated" to true) }

        // Other entities should be preserved
        assertEquals(1, updatedWorld[0]?.get<Int>("x"), "Entity 0 should be unchanged")
        assertEquals(3, updatedWorld[2]?.get<Int>("z"), "Entity 2 should be unchanged")

        // Updated entity should have new property
        assertTrue(updatedWorld[1]?.get<Boolean>("updated") == true, "Entity 1 should have updated property")

        // World size should be same
        assertEquals(3, updatedWorld.size, "World should have same number of entities")
    }

    @Test fun world_update_with_null_transform_result() {
        val world: World = mapOf(0 to entityOf("x" to 1))

        // This test verifies that the transform function can return the same entity
        val updatedWorld = world.update(0) { ent -> ent } // Identity transform

        assertNotNull(updatedWorld[0], "Entity should still exist")
        assertEquals(1, updatedWorld[0]?.get<Int>("x"), "Entity data should be preserved")
    }

    @Test fun world_update_multiple_times_on_same_entity() {
        val world: World = mapOf(0 to entityOf("counter" to 0))

        val updatedWorld = world
            .update(0) { ent -> ent + ("counter" to 1) }
            .update(0) { ent -> ent + ("counter" to 2) }
            .update(0) { ent -> ent + ("counter" to 3) }

        assertEquals(3, updatedWorld[0]?.get<Int>("counter"), "Entity should reflect final update")
    }

    @Test fun world_update_with_invalid_entity_id_types() {
        val world: World = mapOf(0 to entityOf("x" to 1))

        // Test with negative ID
        val updatedWorld1 = world.update(-1) { ent -> ent + ("y" to 2) }
        assertEquals(world, updatedWorld1, "World should be unchanged with negative ID")

        // Test with very large ID
        val updatedWorld2 = world.update(Int.MAX_VALUE) { ent -> ent + ("y" to 2) }
        assertEquals(world, updatedWorld2, "World should be unchanged with large ID")
    }

    @Test fun entityOf_with_empty_components() {
        val entity = entityOf()
        assertTrue(entity.isEmpty(), "Entity with no components should be empty")
    }

    @Test fun entityOf_with_duplicate_keys_overwrites() {
        val entity = entityOf(
            "x" to 1,
            "x" to 2,  // Duplicate key
            "y" to 3
        )

        assertEquals(2, entity["x"], "Duplicate key should be overwritten with last value")
        assertEquals(3, entity["y"], "Non-duplicate key should be preserved")
        assertEquals(2, entity.size, "Entity should have correct number of components")
    }
}
