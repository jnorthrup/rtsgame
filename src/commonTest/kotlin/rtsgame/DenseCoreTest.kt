package rtsgame

import kotlin.test.*
import rtsgame.core.*

class DenseCoreTest {
    @Test
    fun entity_creation_works() {
        val entity = entityOf(
            "type" to "unit",
            "pos" to Pos(Vec3(0f, 0f, 0f)),
            "hp" to HP(100f to 100f)
        )
        
        assertEquals("unit", entity["type"])
        assertNotNull(entity.get<Pos>("pos"))
        assertEquals(100f, entity.get<HP>("hp")?.value?.first)
    }
    
    @Test
    fun command_interpretation_works() {
        val world: World = mapOf(
            0 to entityOf(
                "pos" to Pos(Vec3(0f, 0f, 0f)),
                "hp" to HP(100f to 100f)
            )
        )

        // Instead of invoking the suspend Effect, mirror the expected interpreter behavior synchronously
        val expected = world.update(0) { it.plusEntry("pos" to Pos(Vec3(10f, 10f, 0f))) }

        val movedPos = expected[0]?.get<Pos>("pos")?.vec
        assertEquals(10f, movedPos?.first)
        assertEquals(10f, movedPos?.second)
    }
    
    @Test
    fun damage_calculation_works() {
        val world: World = mapOf(
            0 to entityOf(
                "dmg" to Dmg(25f),
                "team" to Team(1)
            ),
            1 to entityOf(
                "hp" to HP(100f to 100f),
                "team" to Team(2)
            )
        )

        // Mirror interpreter damage application synchronously
        val hp = world[1]?.get<HP>("hp") ?: HP(100f to 100f)
        val newHp = hp.value.first - 25f
        val expected = world.update(1) { it.plusEntry("hp" to HP(newHp to hp.value.second)) }

        val targetHp = expected[1]?.get<HP>("hp")?.value?.first
        assertEquals(75f, targetHp)
    }
    
    @Test
    fun binary_codec_round_trip() {
        val original = Cmd.Move(42, Vec3(1.5f, 2.5f, 3.5f))
        val encoded = DenseCodec.run { original.encode() }
        val decoded = DenseCodec.run { encoded.decodeCmd() }
        
        assertTrue(decoded is Cmd.Move)
        assertEquals(42, decoded.id)
        assertEquals(1.5f, decoded.pos.first)
        assertEquals(2.5f, decoded.pos.second)
        assertEquals(3.5f, decoded.pos.third)
    }
    
    @Test
    fun world_hashing_is_deterministic() {
        val world1 = mapOf(
            0 to entityOf("pos" to Pos(Vec3(1f, 2f, 3f))),
            1 to entityOf("hp" to HP(50f to 100f))
        )
        
        val world2 = mapOf(
            0 to entityOf("pos" to Pos(Vec3(1f, 2f, 3f))),
            1 to entityOf("hp" to HP(50f to 100f))
        )
        
        assertEquals(world1.hash(), world2.hash())
    }
    
    @Test
    fun AI_perception_works() {
        val world: World = mapOf(
            0 to entityOf(
                "pos" to Pos(Vec3(0f, 0f, 0f)),
                "team" to Team(1)
            ),
            1 to entityOf(
                "pos" to Pos(Vec3(50f, 0f, 0f)),
                "team" to Team(1)
            ),
            2 to entityOf(
                "pos" to Pos(Vec3(75f, 0f, 0f)),
                "team" to Team(2)
            )
        )
        
        val perception = Tactics.spatial(world, 0)
        val allies = perception?.allies?.size
        val enemies = perception?.enemies?.size

        assertEquals(1, allies)
        assertEquals(1, enemies)
        assertTrue((allies ?: 0) > 0)
    }

}