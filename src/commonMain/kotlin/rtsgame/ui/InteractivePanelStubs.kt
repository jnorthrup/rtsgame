package rtsgame.ui

import borg.trikeshed.lib.*
import rtsgame.core.*

// Minimal GameTick and CameraState used by tests
data class GameTick(val value: Long)
data class CameraState(val x: Float = 0f, val y: Float = 0f, val zoom: Float = 1f)

// Interaction result
data class Interaction(val buttonClicked: ButtonId?, val mouseState: MouseState = MouseState(0f,0f,false,false))
data class MouseState(val x: Float, val y: Float, val leftDown: Boolean, val rightDown: Boolean)

// Minimal InteractiveWebGPUPanel fulfilling the API used by tests
class InteractiveWebGPUPanel {
    private var running = false
    private var gameState: Pair<rtsgame.GameState?, PanelState?> = Pair(null, null)

    init {
        // Initialize with small default world/state
    val entities = rtsgame.Indexed.fromList(emptyList<rtsgame.GameEntity>())
    val gs = rtsgame.GameState(entities, rtsgame.GameTick(0))
    val buttons: List<borg.trikeshed.lib.ButtonState> = listOf(
            ButtonState(ButtonId("start_stop"), "START"),
            ButtonState(ButtonId("add_unit"), "ADD UNIT"),
            ButtonState(ButtonId("reset"), "RESET"),
            ButtonState(ButtonId("zoom_in"), "+"),
            ButtonState(ButtonId("zoom_out"), "-")
        )
    val panel = PanelState(PanelId("main"), Vector3D(0.0,0.0,0.0), Vector3D(800.0,600.0,0.0), borg.trikeshed.lib.Indexed.fromList(buttons), true)
        gameState = Pair(gs, panel)
    }

    fun getCurrentState(): Pair<rtsgame.GameState, PanelState> = Pair(gameState.first ?: rtsgame.GameState(rtsgame.Indexed.fromList(listOf()), rtsgame.GameTick(0)), gameState.second!!)

    fun handleMouseInput(x: Float, y: Float, left: Boolean): Interaction {
        // Very small hit testing: map x positions to buttons by fixed centers
        val clicked = when {
            x in 50f..100f -> ButtonId("start_stop")
            x in 225f..275f -> ButtonId("add_unit")
            x in 370f..410f -> ButtonId("reset")
            x in 500f..530f -> ButtonId("zoom_in")
            x in 540f..570f -> ButtonId("zoom_out")
            else -> null
        }

        // Toggle start/stop
    if (clicked?.value == "start_stop") {
            running = !running
            val buttons = gameState.second?.buttons?.play?.map { b ->
                if (b.id.value == "start_stop") b.copy(label = if (running) "STOP" else "START") else b
            } ?: listOf()
            val panel = gameState.second?.copy(buttons = Indexed.of(buttons.size) { i -> buttons[i] })
            gameState = Pair(gameState.first, panel)
        }

        // Add unit
    if (clicked?.value == "add_unit") {
            val gs = gameState.first ?: rtsgame.GameState(rtsgame.Indexed.fromList(listOf()), rtsgame.GameTick(0))
            val newId = "unit_${gs.entities.play.size + 1}"
            val e = rtsgame.GameEntity(rtsgame.EntityId(newId), rtsgame.Position(100f,200f), rtsgame.Health(100f), rtsgame.PlayerId(1))
            val newEntities = gs.entities.play + e
            gameState = Pair(rtsgame.GameState(rtsgame.Indexed.fromList(newEntities), rtsgame.GameTick(gs.tick.value)), gameState.second)
        }

        // Reset
        if (clicked?.id == "reset") {
            val gs = rtsgame.GameState(rtsgame.Indexed.fromList(listOf()), rtsgame.GameTick(0))
            val buttons = gameState.second?.buttons?.play?.map { b -> if (b.id.value == "start_stop") b.copy(label = "START") else b } ?: listOf()
            val panel = gameState.second?.copy(buttons = borg.trikeshed.lib.Indexed.fromList(buttons))
            gameState = Pair(gs, panel)
            running = false
        }

        return Interaction(clicked, MouseState(x,y,left,false))
    }

    fun tick(): rtsgame.GameState {
    val gs = gameState.first ?: rtsgame.GameState(rtsgame.Indexed.fromList(listOf()), rtsgame.GameTick(0))
    val newTick = if (running) rtsgame.GameTick(gs.tick.value + 1) else gs.tick
    val newState = rtsgame.GameState(gs.entities, newTick)
        gameState = Pair(newState, gameState.second)
        return newState
    }
}
