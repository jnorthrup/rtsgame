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
}
