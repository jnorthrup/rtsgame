package rtsgame.core

import kotlin.test.Test
import kotlin.test.assertTrue
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlinx.coroutines.test.runTest

// TDD seed for Game.interpret: adapt to DenseCore.Cmd and World
class GameInterpretTests {
    @Test
    fun interpret_move_and_spawn_commands() {
        // Use the object Game.interpret which returns an Effect
        val world: World = mapOf(
            0 to entityOf("pos" to Pos(Triple(0f,0f,0f)))
        )

        val moveCmd = Cmd.Move(0, Triple(10f, 10f, 0f))
        val spawnCmd = Cmd.Spawn("soldier", 1, Triple(0f, 0f, 0f))

        // Verify interpreter produces suspend Effect functions
        val effect = Game.interpret(moveCmd)
        val effect2 = Game.interpret(spawnCmd)

        assertTrue(effect is Function<*>)
        assertTrue(effect2 is Function<*>)
    }

    @Test
    fun interpret_move_command_updates_entity_position_and_velocity() = runTest {
        // Arrange: world with entity that has position
        val world: World = mapOf(
            0 to entityOf("pos" to Pos(Triple(0f, 0f, 0f)))
        )
        val moveCmd = Cmd.Move(0, Triple(10f, 0f, 0f))

        // Act: interpret the command
        val effect = Game.interpret(moveCmd)
        val (newWorld, _) = effect(world)

        // Assert: entity should have target and velocity set
        val updatedEntity = newWorld[0]
        assertNotNull(updatedEntity, "Entity should exist after move command")

        val target = updatedEntity.get<Target>("target")
        assertNotNull(target, "Entity should have target after move command")
        assertEquals(Vec3(10f, 0f, 0f), target.vec, "Target position should be set correctly")

        val vel = updatedEntity.get<Vel>("vel")
        assertNotNull(vel, "Entity should have velocity after move command")
        assertTrue(vel.vec.first > 0f, "Velocity X should be positive for movement toward positive X")
    }

    @Test
    fun interpret_move_command_on_nonexistent_entity() = runTest {
        // Arrange: empty world
        val world: World = emptyMap()
        val moveCmd = Cmd.Move(999, Triple(10f, 0f, 0f))

        // Act: interpret the command
        val effect = Game.interpret(moveCmd)
        val (newWorld, _) = effect(world)

        // Assert: world should remain unchanged
        assertEquals(world, newWorld, "World should be unchanged when moving nonexistent entity")
    }

    @Test
    fun interpret_move_command_on_entity_without_position() = runTest {
        // Arrange: entity without position component
        val world: World = mapOf(
            0 to entityOf("hp" to HP(100f to 100f)) // No pos component
        )
        val moveCmd = Cmd.Move(0, Triple(10f, 0f, 0f))

        // Act: interpret the command
        val effect = Game.interpret(moveCmd)
        val (newWorld, _) = effect(world)

        // Assert: entity should get position set to target (fallback behavior)
        val updatedEntity = newWorld[0]
        assertNotNull(updatedEntity, "Entity should exist after move command")

        val pos = updatedEntity.get<Pos>("pos")
        assertNotNull(pos, "Entity should have position after move command")
        assertEquals(Vec3(10f, 0f, 0f), pos.vec, "Position should be set to target when no existing position")
    }

    @Test
    fun interpret_spawn_command_creates_new_entity() = runTest {
        // Arrange: world with one entity
        val world: World = mapOf(
            0 to entityOf("pos" to Pos(Triple(0f, 0f, 0f)))
        )
        val spawnCmd = Cmd.Spawn("soldier", 1, Triple(5f, 5f, 0f))

        // Act: interpret the command
        val effect = Game.interpret(spawnCmd)
        val (newWorld, _) = effect(world)

        // Assert: new entity should be created
        assertEquals(2, newWorld.size, "World should have two entities after spawn")
        assertNotNull(newWorld[1], "New entity should exist with ID 1")

        val newEntity = newWorld[1]!!
        assertEquals("soldier", newEntity.get<String>("type"), "New entity should have correct type")
        assertEquals(Vec3(5f, 5f, 0f), newEntity.get<Pos>("pos")?.vec, "New entity should have correct position")
        assertEquals(1, newEntity.get<Team>("team")?.id, "New entity should have correct team")
        assertEquals(100f to 100f, newEntity.get<HP>("hp")?.value, "New entity should have full HP")
    }

    @Test
    fun interpret_attack_command_updates_world_via_combat_system() = runTest {
        // Arrange: world with two entities that can attack
        val world: World = mapOf(
            0 to entityOf(
                "pos" to Pos(Triple(0f, 0f, 0f)),
                "hp" to HP(100f to 100f),
                "dmg" to Dmg(20f),
                "range" to Range(50f)
            ),
            1 to entityOf(
                "pos" to Pos(Triple(10f, 0f, 0f)),
                "hp" to HP(100f to 100f)
            )
        )
        val attackCmd = Cmd.Attack(0, 1)

        // Act: interpret the command
        val effect = Game.interpret(attackCmd)
        val (newWorld, _) = effect(world)

        // Assert: combat system should have been called and potentially damaged target
        val targetHp = newWorld[1]?.get<HP>("hp")?.value?.first
        assertNotNull(targetHp, "Target should still have HP after attack")
        // Note: actual damage depends on CombatSystem implementation
        assertTrue(targetHp!! <= 100f, "Target HP should not increase after attack")
    }

    @Test
    fun interpret_build_command_creates_building_entity() = runTest {
        // Arrange: empty world
        val world: World = emptyMap()
        val buildCmd = Cmd.Build("barracks", Triple(20f, 20f, 0f))

        // Act: interpret the command
        val effect = Game.interpret(buildCmd)
        val (newWorld, _) = effect(world)

        // Assert: building should be created
        assertEquals(1, newWorld.size, "World should have one building after build command")
        assertNotNull(newWorld[0], "Building entity should exist")

        val building = newWorld[0]!!
        assertEquals("barracks", building.get<String>("type"), "Building should have correct type")
        assertEquals(Vec3(20f, 20f, 0f), building.get<Pos>("pos")?.vec, "Building should have correct position")
        assertEquals(1000f to 1000f, building.get<HP>("hp")?.value, "Building should have building-level HP")
    }

    @Test
    fun interpret_gather_command_updates_world_via_resource_system() = runTest {
        // Arrange: world with unit and resource
        val world: World = mapOf(
            0 to entityOf("pos" to Pos(Triple(0f, 0f, 0f))), // Unit
            1 to entityOf("resourceType" to "gold", "amount" to 100f) // Resource
        )
        val gatherCmd = Cmd.Gather(0, 1)

        // Act: interpret the command
        val effect = Game.interpret(gatherCmd)
        val (newWorld, _) = effect(world)

        // Assert: resource system should have been called
        // Note: actual behavior depends on ResourceSystem.performGather implementation
        assertNotNull(newWorld[0], "Gatherer unit should still exist")
        assertNotNull(newWorld[1], "Resource should still exist")
    }
}
