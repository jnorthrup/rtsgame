package rtsgame.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class ResourceSystemTDDTest {

    @Test
    fun `gathering depletes resource until exhausted`() {
        val gathererId = 1
        val resourceId = 2
        val gatherer = entityOf(
            "pos" to Pos(Triple(0f, 0f, 0f)),
            "resources" to 0f
        )
        val resourceInfo = ResourceSystem.ResourceInfo(
            type = "gold",
            amount = 8f,
            maxAmount = 8f,
            gatherRate = 5f
        )
        val resource = entityOf(
            "pos" to Pos(Triple(1f, 0f, 0f)),
            "resource" to resourceInfo
        )

        var world: World = mapOf(
            gathererId to gatherer,
            resourceId to resource
        )

        val firstGather = ResourceSystem.performGather(world, gathererId, resourceId)
        assertTrue(firstGather.success, "first gather should succeed")
        assertEquals(5f, firstGather.resourcesGathered, 1e-3f)
        val resourceAfterFirst = firstGather.updatedWorld[resourceId]?.get<ResourceSystem.ResourceInfo>("resource")
        assertNotNull(resourceAfterFirst, "resource entity should remain after first gather")
        assertEquals(3f, resourceAfterFirst.amount, 1e-3f)
    val gathererAfterFirst = firstGather.updatedWorld[gathererId]?.get<Float>("resources")
    assertNotNull(gathererAfterFirst, "gatherer should accumulate gathered resources")
    assertEquals(5f, gathererAfterFirst, 1e-3f)

        val secondGather = ResourceSystem.performGather(firstGather.updatedWorld, gathererId, resourceId)
        assertTrue(secondGather.success, "second gather should succeed")
        assertEquals(3f, secondGather.resourcesGathered, 1e-3f)
        val resourceAfterSecond = secondGather.updatedWorld[resourceId]?.get<ResourceSystem.ResourceInfo>("resource")
        assertNotNull(resourceAfterSecond, "resource entity should remain after second gather")
        assertEquals(0f, resourceAfterSecond.amount, 1e-3f)
    val gathererAfterSecond = secondGather.updatedWorld[gathererId]?.get<Float>("resources")
    assertNotNull(gathererAfterSecond, "gatherer should keep accumulated resources")
    assertEquals(8f, gathererAfterSecond, 1e-3f)

        val thirdGather = ResourceSystem.performGather(secondGather.updatedWorld, gathererId, resourceId)
        assertFalse(thirdGather.success, "gathering depleted resource should fail")
        assertEquals("resource_depleted", thirdGather.reason)
    val gathererAfterFailure = thirdGather.updatedWorld[gathererId]?.get<Float>("resources")
    assertNotNull(gathererAfterFailure, "gatherer inventory should remain after failed gather")
    assertEquals(8f, gathererAfterFailure, 1e-3f)
    }

    @Test
    fun `gatherer recovers after moving into range`() {
        val gathererId = 10
        val resourceId = 11
        val gathererFar = entityOf(
            "pos" to Pos(Triple(0f, 10f, 0f)),
            "resources" to 0f
        )
        val resourceInfo = ResourceSystem.ResourceInfo(
            type = "crystal",
            amount = 20f,
            maxAmount = 20f,
            gatherRate = 5f
        )
        val resource = entityOf(
            "pos" to Pos(Triple(0f, 0f, 0f)),
            "resource" to resourceInfo
        )

        val world: World = mapOf(
            gathererId to gathererFar,
            resourceId to resource
        )

        val outOfRange = ResourceSystem.performGather(world, gathererId, resourceId)
        assertFalse(outOfRange.success, "gatherer outside range should fail")
        assertEquals("out_of_range", outOfRange.reason)
        val resourceAfterFailure = outOfRange.updatedWorld[resourceId]?.get<ResourceSystem.ResourceInfo>("resource")
        assertNotNull(resourceAfterFailure, "resource should remain untouched when gather fails")
        assertEquals(20f, resourceAfterFailure.amount, 1e-3f)
        val carryAfterFailure = outOfRange.updatedWorld[gathererId]?.get<Float>("resources") ?: 0f
        assertEquals(0f, carryAfterFailure, 1e-3f)

        val gathererNear = entityOf(
            "pos" to Pos(Triple(1.5f, 0f, 0f)),
            "resources" to 0f
        )
        val repositionedWorld = outOfRange.updatedWorld + (gathererId to gathererNear)

        val successfulGather = ResourceSystem.performGather(repositionedWorld, gathererId, resourceId)
        assertTrue(successfulGather.success, "gatherer within range should succeed")
        assertEquals(5f, successfulGather.resourcesGathered, 1e-3f)
        val resourceAfterSuccess = successfulGather.updatedWorld[resourceId]?.get<ResourceSystem.ResourceInfo>("resource")
        assertNotNull(resourceAfterSuccess, "resource should exist after successful gather")
        assertEquals(15f, resourceAfterSuccess.amount, 1e-3f)
    val gathererCarry = successfulGather.updatedWorld[gathererId]?.get<Float>("resources")
    assertNotNull(gathererCarry, "gatherer should now hold gathered resources")
    assertEquals(5f, gathererCarry, 1e-3f)
    }

    @Test
    fun `gathering non-resource target fails without side effects`() {
        val gathererId = 21
        val fakeResourceId = 22

        val gatherer = entityOf(
            "pos" to Pos(Triple(0f, 0f, 0f)),
            "resources" to 0f
        )
        val nonResource = entityOf(
            "pos" to Pos(Triple(1f, 0f, 0f)),
            "type" to "structure"
        )

        val world: World = mapOf(
            gathererId to gatherer,
            fakeResourceId to nonResource
        )

        val result = ResourceSystem.performGather(world, gathererId, fakeResourceId)

        assertFalse(result.success, "gathering a non-resource entity should fail")
        assertEquals("invalid_resource", result.reason)
        val gathererInventory = result.updatedWorld[gathererId]?.get<Float>("resources")
        assertNotNull(gathererInventory, "gatherer inventory component should remain present")
        assertEquals(0f, gathererInventory, 1e-3f, "gatherer inventory should remain unchanged")
        assertEquals(nonResource, result.updatedWorld[fakeResourceId], "non-resource entity should remain unchanged")
    }
}
