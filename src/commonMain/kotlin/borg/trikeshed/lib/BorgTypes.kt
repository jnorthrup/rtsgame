package borg.trikeshed.lib

import rtsgame.core.TimeUtils

/**
 * Borg TrikeShed compatibility types
 * μ-Chain: Axiomatic Aliasing for cross-module integration
 */

// μ-Chain: Functional Extension - Platform-compatible time
fun borgCurrentTimeMillis(): Long = TimeUtils.currentTimeMillis()

// μ-Chain: Core Instantiation - UI component types
data class ButtonId(val value: String) {
    val id: String get() = value
}

data class PanelId(val value: String) {
    val id: String get() = value
}

data class Vector3D(val x: Double, val y: Double, val z: Double)

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
    val buttons: trikeshed.lib.Indexed<ButtonState>,
    val visible: Boolean
)
