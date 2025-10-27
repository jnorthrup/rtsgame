package rtsgame

import kotlin.test.Test
import kotlin.test.assertTrue
import rtsgame.core.Position
import rtsgame.core.FormationSystem
import kotlin.math.PI
import kotlin.math.abs

class FormationSystemCircleTDDTest {
    @Test
    fun testCircleFormationForEightUnits() {
        val leader = Position(0f, 0f)
        val spacing = 2f
        val unitCount = 8

        // Act: compute slots
        val slots = (0 until unitCount).map { idx -> FormationSystem.calculateSlot(leader, spacing, idx, unitCount) }

        // Expect: units arranged roughly on a circle of radius derived from spacing
        val radius = spacing * (unitCount.toFloat() / 6f)

        // Check each slot is approximately at the expected radius from leader
        slots.forEach { s ->
            val dx = s.x - leader.x
            val dy = s.y - leader.y
            val dist = kotlin.math.sqrt(dx * dx + dy * dy)
            assertTrue(abs(dist - radius) < 0.001f, "slot not at expected radius: $dist vs $radius")
        }

        // Check angular spacing roughly equals 2π / unitCount
        val angles = slots.map { s -> kotlin.math.atan2(s.y - leader.y, s.x - leader.x) }
            .sorted()
        val diffs = (0 until angles.size).map { i ->
            val a1 = angles[i]
            val a2 = angles[(i + 1) % angles.size]
            var d = a2 - a1
            if (d < 0) d += 2f * PI.toFloat()
            d
        }
        val expectedAngular = 2f * PI.toFloat() / unitCount.toFloat()
        diffs.forEach { d -> assertTrue(abs(d - expectedAngular) < 0.001f, "angular spacing off: $d vs $expectedAngular") }
    }
}
