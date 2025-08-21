package rtsgame.webgpu

import borg.trikeshed.lib.Vector3D

data class CameraState(
    val position: Vector3D,
    val target: Vector3D,
    val fov: Float,
    val aspect: Float
)

// Placeholder renderer type referenced by tests
class CommonWebGPUSpaceGraph
