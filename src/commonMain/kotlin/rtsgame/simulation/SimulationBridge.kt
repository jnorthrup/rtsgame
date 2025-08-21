package rtsgame.simulation

import rtsgame.core.*

// Minimal Simulation shim used by tests. This is intentionally small and focused
// to satisfy the existing TDD tests. It can be expanded later.
interface Simulation {
    fun getCurrentTick(): Long
    fun update(dt: Float)
    fun reset()
    fun getEntityCount(): Int
}

class SimpleSimulation : Simulation {
    private var tick: Long = 0
    private var entities: Int = 0

    override fun getCurrentTick(): Long = tick
    override fun update(dt: Float) {
        // Advance tick by 1 per frame (rough approximation for tests)
        tick += 1
    }
    override fun reset() { tick = 0 }
    override fun getEntityCount(): Int = entities
}

// Minimal request type used by tests
data class RTSRequest(val type: String, val payload: Map<String, Any?> = emptyMap())

class RTSRequestFactory {
    fun createMoveRequest(id: Int, x: Float, y: Float): RTSRequest =
        RTSRequest("move", mapOf("id" to id, "x" to x, "y" to y))
}

// Factory helper expected by tests
fun createRTSSimulation(): Pair<Simulation, RTSRequestFactory> = Pair(SimpleSimulation(), RTSRequestFactory())
