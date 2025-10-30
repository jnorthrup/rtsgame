package rtsgame.core

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class CommandSystemQueueLifecycleTDDTest {

    @Test
    fun `queued commands activate when unit is idle`() {
        CommandSystem.resetForTests()
        val world = object {}
        val unitId = 101

        val first = CommandSystem.Command(
            id = "queue_test_first",
            type = "test",
            unitIds = listOf(unitId),
            parameters = emptyMap()
        )

        CommandSystem.queueCommand(unitId, first)

        assertFalse(CommandSystem.isCommandActive(first.id), "command should not be active before updates run")

        CommandSystem.updateCommands(world, 1f / 60f)

        assertTrue(CommandSystem.isCommandActive(first.id), "queued command should become active when updated")

        CommandSystem.cancelCommand(first.id)
    }

    @Test
    fun `queued commands process in FIFO order`() {
        CommandSystem.resetForTests()
        val world = object {}
        val unitId = 202

        val first = CommandSystem.Command(
            id = "queue_test_first_fifo",
            type = "test",
            unitIds = listOf(unitId),
            parameters = emptyMap()
        )
        val second = CommandSystem.Command(
            id = "queue_test_second_fifo",
            type = "test",
            unitIds = listOf(unitId),
            parameters = emptyMap()
        )

        CommandSystem.queueCommand(unitId, first)
        CommandSystem.queueCommand(unitId, second)

        CommandSystem.updateCommands(world, 1f / 60f)
        assertTrue(CommandSystem.isCommandActive(first.id), "first queued command should become active after update")
        assertFalse(CommandSystem.isCommandActive(second.id), "second command should remain queued while first is active")

        CommandSystem.cancelCommand(first.id)

        CommandSystem.updateCommands(world, 1f / 60f)
        assertTrue(CommandSystem.isCommandActive(second.id), "second command should activate after first completes")

        CommandSystem.cancelCommand(second.id)
    }

    @Test
    fun `higher priority command preempts active command`() {
        CommandSystem.resetForTests()
        val world = object {}
        val unitId = 303

        val lowPriority = CommandSystem.Command(
            id = "queue_test_low_priority",
            type = "test",
            unitIds = listOf(unitId),
            parameters = emptyMap()
        )
        val highPriority = CommandSystem.Command(
            id = "queue_test_high_priority",
            type = "test",
            unitIds = listOf(unitId),
            parameters = emptyMap()
        )

        CommandSystem.executeCommandWithPriority(world, lowPriority, priority = 1)
        assertTrue(CommandSystem.isCommandActive(lowPriority.id), "low priority command should become active initially")

        CommandSystem.executeCommandWithPriority(world, highPriority, priority = 5)

        assertFalse(CommandSystem.isCommandActive(lowPriority.id), "low priority command should be preempted by higher priority command")
        assertTrue(CommandSystem.isCommandActive(highPriority.id), "high priority command should become active")
    }

    @Test
    fun `multi unit command waits until all participants are idle`() {
        CommandSystem.resetForTests()
        val world = object {}
        val unitA = 401
        val unitB = 402

        val activeB = CommandSystem.Command(
            id = "queue_test_active_b",
            type = "test",
            unitIds = listOf(unitB),
            parameters = emptyMap()
        )
        CommandSystem.executeCommand(world, activeB)
        assertTrue(CommandSystem.isCommandActive(activeB.id), "sanity check: unit B command should be active")

        val multi = CommandSystem.Command(
            id = "queue_test_multi_idle",
            type = "test",
            unitIds = listOf(unitA, unitB),
            parameters = emptyMap()
        )

        CommandSystem.queueCommand(unitA, multi)
        CommandSystem.queueCommand(unitB, multi)

        CommandSystem.updateCommands(world, 1f / 60f)
        assertFalse(CommandSystem.isCommandActive(multi.id), "multi-unit command should not activate while unit B is busy")

        CommandSystem.cancelCommand(activeB.id)
        CommandSystem.updateCommands(world, 1f / 60f)

        assertTrue(CommandSystem.isCommandActive(multi.id), "multi-unit command should activate once all units are idle")
    }

    @Test
    fun `high priority multi unit command preempts lower priority blockers`() {
        CommandSystem.resetForTests()
        val world = object {}
        val unitA = 501
        val unitB = 502

        val lowPriority = CommandSystem.Command(
            id = "queue_test_low_priority_multi",
            type = "test",
            unitIds = listOf(unitA),
            parameters = emptyMap()
        )
        CommandSystem.executeCommandWithPriority(world, lowPriority, priority = 1)
        assertTrue(CommandSystem.isCommandActive(lowPriority.id), "low priority command should start active")

        val highPriority = CommandSystem.Command(
            id = "queue_test_high_priority_multi",
            type = "test",
            unitIds = listOf(unitA, unitB),
            parameters = emptyMap()
        )

        CommandSystem.queueCommand(unitA, highPriority, priority = 5)
        CommandSystem.queueCommand(unitB, highPriority, priority = 5)

        CommandSystem.updateCommands(world, 1f / 60f)

        assertFalse(CommandSystem.isCommandActive(lowPriority.id), "high priority command should preempt lower priority blocker")
        assertTrue(CommandSystem.isCommandActive(highPriority.id), "high priority multi-unit command should become active")
    }

    @Test
    fun `equal priority commands preserve arrival ordering`() {
        CommandSystem.resetForTests()
        val world = object {}
        val unitA = 601
        val unitB = 602

        val older = CommandSystem.Command(
            id = "queue_test_equal_priority_omega",
            type = "test",
            unitIds = listOf(unitA, unitB),
            parameters = emptyMap()
        )
        val younger = CommandSystem.Command(
            id = "queue_test_equal_priority_alpha",
            type = "test",
            unitIds = listOf(unitA, unitB),
            parameters = emptyMap()
        )

        // Enqueue omega first so it is older despite having a lexicographically larger id.
        CommandSystem.queueCommand(unitA, older, priority = 7)
        CommandSystem.queueCommand(unitB, older, priority = 7)
        CommandSystem.queueCommand(unitA, younger, priority = 7)
        CommandSystem.queueCommand(unitB, younger, priority = 7)

        CommandSystem.updateCommands(world, 1f / 60f)

        assertTrue(CommandSystem.isCommandActive(older.id), "older equal-priority command should activate first")
        assertFalse(CommandSystem.isCommandActive(younger.id), "younger equal-priority command should remain queued")

        CommandSystem.cancelCommand(older.id)
        CommandSystem.updateCommands(world, 1f / 60f)

        assertTrue(CommandSystem.isCommandActive(younger.id), "queued younger command should activate after older completes")
    }

    @Test
    fun `aged low priority command eventually activates despite new high priority arrivals`() {
        CommandSystem.resetForTests()
        val world = object {}
        val unitId = 701

        val enduring = CommandSystem.Command(
            id = "queue_test_starvation_enduring",
            type = "test",
            unitIds = listOf(unitId),
            parameters = emptyMap()
        )
        CommandSystem.queueCommand(unitId, enduring, priority = 1)

        var triggeredCycle: Int? = null
        for (cycle in 0 until 10) {
            val high = CommandSystem.Command(
                id = "queue_test_starvation_high_$cycle",
                type = "test",
                unitIds = listOf(unitId),
                parameters = emptyMap()
            )
            CommandSystem.queueCommand(unitId, high, priority = 5)

            CommandSystem.updateCommands(world, 1f / 60f)

            if (CommandSystem.isCommandActive(enduring.id)) {
                assertTrue(
                    CommandSystem.isCommandActive(enduring.id),
                    "aged low priority command should eventually activate even when a new high priority command arrives"
                )
                assertFalse(
                    CommandSystem.isCommandActive(high.id),
                    "new high priority command should wait once older command ages sufficiently"
                )
                triggeredCycle = cycle
                CommandSystem.cancelCommand(enduring.id)
                CommandSystem.cancelCommand(high.id)
                break
            } else {
                assertTrue(
                    CommandSystem.isCommandActive(high.id),
                    "new high priority command should win while aging is still building up"
                )
                CommandSystem.cancelCommand(high.id)
            }
        }

        assertNotNull(triggeredCycle, "low priority command should eventually activate within the aging window")
        CommandSystem.cancelCommand(enduring.id)
    }

    @Test
    fun `multi unit low priority command ages past entrenched single unit blocker`() {
        CommandSystem.resetForTests()
        val world = object {}
        val unitA = 801
        val unitB = 802

        val joint = CommandSystem.Command(
            id = "queue_test_starvation_joint",
            type = "test",
            unitIds = listOf(unitA, unitB),
            parameters = emptyMap()
        )

        CommandSystem.queueCommand(unitA, joint, priority = 1)
        CommandSystem.queueCommand(unitB, joint, priority = 1)

        val entrenched = CommandSystem.Command(
            id = "queue_test_starvation_entrenched",
            type = "test",
            unitIds = listOf(unitA),
            parameters = emptyMap()
        )
        CommandSystem.executeCommandWithPriority(world, entrenched, priority = 5)

        var triggered: Int? = null
        for (cycle in 0 until 20) {
            CommandSystem.updateCommands(world, 1f / 60f)

            if (CommandSystem.isCommandActive(joint.id)) {
                triggered = cycle
                assertFalse(
                    CommandSystem.isCommandActive(entrenched.id),
                    "entrenched blocker should be preempted once joint command ages out"
                )
                CommandSystem.cancelCommand(joint.id)
                break
            }

            assertTrue(
                CommandSystem.isCommandActive(entrenched.id),
                "single unit blocker should remain active until joint command gains enough aging"
            )
        }

        assertNotNull(triggered, "joint command should eventually activate once wait ticks accumulate")
        CommandSystem.cancelCommand(entrenched.id)
        CommandSystem.cancelCommand(joint.id)
    }
}
