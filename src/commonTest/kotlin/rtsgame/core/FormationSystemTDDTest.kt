package rtsgame.core

import kotlin.test.Test
import kotlin.test.assertEquals

class FormationSystemTDDTest {
    @Test
    fun testCalculateFormationSlotForSingleUnit() {
        // Arrange: leader at (5,5,0), formation spacing 2, unitCount=1
        val leader = Vec3(5f, 5f, 0f)
        val spacing = 2f
        val unitIndex = 0
        val totalUnits = 1

        // Expect: single unit should be at leader position
        val expected = Vec3(5f, 5f, 0f)

        // Act: calculate slot position
        val actual = FormationSystem.calculateSlot(leader, unitIndex, totalUnits, spacing)

        // Assert
        assertEquals(expected.first, actual.first, "slot x should match expected for single unit")
        assertEquals(expected.second, actual.second, "slot y should match expected for single unit")
        assertEquals(expected.third, actual.third, "slot z should match expected for single unit")
    }

    @Test
    fun testCalculateFormationSlotForMultipleUnits() {
        // Arrange: leader at (0,0,0), spacing 2
        val leader = Vec3(0f, 0f, 0f)
        val spacing = 2f

        // Act & Assert: check first few positions
        // Unit 0 (leader)
        var actual = FormationSystem.calculateSlot(leader, 0, 3, spacing)
        assertEquals(Vec3(0f, 0f, 0f), actual, "leader should be at origin")

        // Unit 1
        actual = FormationSystem.calculateSlot(leader, 1, 3, spacing)
        assertEquals(Vec3(-2f, 0f, 0f), actual, "unit 1 should be left of leader")

        // Unit 2
        actual = FormationSystem.calculateSlot(leader, 2, 3, spacing)
        assertEquals(Vec3(0f, 0f, 0f), actual, "unit 2 should be at leader position (centered)")
    }
}