package rtsgame.webgpu

import borg.trikeshed.lib.Vector3D

/**
 * WebGPU rendering types following TrikeShed axioms
 * μ-Chain: Core Instantiation for graphics pipeline
 */

// μ-Chain: Axiomatic Aliasing - Camera state composition
data class CameraState(
    val position: Vector3D,
    val target: Vector3D,
    val fov: Float,
    val aspect: Float
)

// μ-Chain: Core Instantiation - Renderer interface
// Real implementation will integrate with platform-specific WebGPU
class CommonWebGPUSpaceGraph {
    // Placeholder for actual WebGPU renderer
    // Will be implemented with platform actuals per ADR-001
}
