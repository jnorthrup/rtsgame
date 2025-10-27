package rtsgame.spacegraph

import trikeshed.lib.Indexed

/**
 * SpaceGraph rendering types - placeholder for real implementation
 * μ-Chain: Core Instantiation (awaiting full WebGPU integration)
 */

// Placeholder types for tests
data class EntityType(val name: String)
data class Matrix4(val values: FloatArray = FloatArray(16))
data class BufferId(val id: Int)
data class PipelineId(val id: Int)
data class TextureId(val id: Int)
data class ConnectionType(val name: String)

// Placeholder renderer
class RTSSpaceGraphRenderer {
    fun render(entities: Indexed<*>) {}
    fun setCamera(vararg params: Any) {}
}
