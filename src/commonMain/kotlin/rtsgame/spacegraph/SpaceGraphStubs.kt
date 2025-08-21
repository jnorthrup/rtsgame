package rtsgame.spacegraph

import borg.trikeshed.lib.Vector3D
import rtsgame.core.*

// Minimal stubs for spacegraph and webgpu-related types used in tests
class Matrix4(val data: FloatArray = FloatArray(16)) {
    companion object {
        fun identity(): Matrix4 = Matrix4(FloatArray(16) { i -> if (i % 5 == 0) 1f else 0f })
    }
}

// Simple id wrappers with integer values for type safety
data class BufferId(val value: Int = 0)
data class PipelineId(val value: Int = 0)
data class TextureId(val value: Int = 0)

data class RenderMetadata(val entityCount: Int, val tick: rtsgame.GameTick)

// Node and Edge types used by tests
data class Node<T>(val id: rtsgame.EntityId, val data: T)
data class NodeData(val entityType: EntityType)
data class Edge(val from: rtsgame.EntityId, val to: rtsgame.EntityId, val data: EdgeData)
data class EdgeData(val connectionType: ConnectionType)

data class RenderResult<N, E>(val nodes: rtsgame.Indexed<N>, val edges: rtsgame.Indexed<E>, val metadata: RenderMetadata)

class RTSSpaceGraphRenderer {
    fun renderGameState(state: rtsgame.GameState): RenderResult<Node<NodeData>, Edge> {
        val nodesList = state.entities.play.map { e ->
            val t = when {
                e.id.value.contains("commander") -> EntityType.COMMANDER
                e.id.value.contains("scout") -> EntityType.SCOUT
                e.id.value.contains("building") -> EntityType.BUILDING
                e.id.value.contains("unit") -> EntityType.UNIT
                else -> EntityType.UNIT
            }
            Node(e.id, NodeData(t))
        }

        // Build simple edges between same-player close entities
        val edgesList = mutableListOf<Edge>()
        for (i in 0 until state.entities.play.size) {
            for (j in i + 1 until state.entities.play.size) {
                val a = state.entities.play[i]
                val b = state.entities.play[j]
                if (a.playerId.value == b.playerId.value) {
                    val dx = a.position.x - b.position.x
                    val dy = a.position.y - b.position.y
                    val dist2 = dx * dx + dy * dy
                    if (dist2 < 10000f) { // within 100 units
                        edgesList.add(Edge(a.id, b.id, EdgeData(ConnectionType.ALLY)))
                    }
                }
            }
        }

        val nodes = rtsgame.Indexed.fromList(nodesList)
        val edges = rtsgame.Indexed.fromList(edgesList)
        val meta = RenderMetadata(state.entities.play.size, state.tick)
        return RenderResult(nodes, edges, meta)
    }
}

class CommonWebGPUSpaceGraph

enum class ConnectionType { ALLY, ENEMY }

// Simple EntityType placeholder matching tests
enum class EntityType { COMMANDER, UNIT, SCOUT, BUILDING }
