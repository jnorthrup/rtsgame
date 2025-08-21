package borg.trikeshed.lib

// Minimal stubs to satisfy test imports from borg.trikeshed.lib

// Use a distinct helper name to avoid clashing with rtsgame.compat.currentTimeMillis
fun borgCurrentTimeMillis(): Long = System.currentTimeMillis()

// Placeholder types referenced by tests (ButtonId, ButtonState, PanelId, PanelState, Vector3D)
data class ButtonId(val value: String) {
    val id: String get() = value
}
data class PanelId(val value: String) {
    val id: String get() = value
}
data class ButtonState(
    val id: ButtonId,
    val label: String,
    val enabled: Boolean = true,
    val pressed: Boolean = false,
    val position: Vector3D = Vector3D(0.0, 0.0, 0.0),
    val size: Vector3D = Vector3D(0.0, 0.0, 0.0)
)

data class PanelState(
    val id: PanelId,
    val position: Vector3D,
    val size: Vector3D,
    val buttons: Indexed<ButtonState>,
    val visible: Boolean
)

data class Vector3D(val x: Double, val y: Double, val z: Double)

// Simple Indexed wrapper used by some tests with helper factory
// Reuse the rtsgame.Indexed implementation to ensure cross-module compatibility
typealias Indexed<T> = rtsgame.Indexed<T>

