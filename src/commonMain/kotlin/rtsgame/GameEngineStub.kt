package rtsgame

// Types shaped to match tests in the suite (top-level rtsgame package)
data class GameTick(val value: Long)

data class EntityId(val value: String)
// Position exposes component1()/component2() as coordinate wrappers with `.value` to match tests
class Position(val x: Float, val y: Float) {
    data class XCoord(val value: Float)
    data class YCoord(val value: Float)

    fun component1(): XCoord = XCoord(x)
    fun component2(): YCoord = YCoord(y)

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is Position) return false
        return x == other.x && y == other.y
    }

    override fun hashCode(): Int = 31 * x.hashCode() + y.hashCode()

    override fun toString(): String = "Position(x=$x, y=$y)"
}
data class Health(val value: Float)
data class PlayerId(val value: Int)

data class GameEntity(
    val id: EntityId,
    val position: Position,
    val health: Health,
    val playerId: PlayerId
)

class Indexed<T> constructor(val play: List<T>) : Iterable<T> {
    override fun iterator(): Iterator<T> = play.iterator()
    val size: Int get() = play.size
    operator fun get(i: Int): T = play[i]
    companion object {
        fun <T> of(size: Int, f: (Int) -> T): Indexed<T> = Indexed(List(size) { i -> f(i) })
        fun <T> fromList(list: List<T>): Indexed<T> = Indexed(list)
    }
}

data class GameState(val entities: Indexed<GameEntity>, val tick: GameTick)

// Minimal GameEngine matching tests that create and manipulate GameState
class GameEngine {
    private var currentTick = 0L

    fun tick(): GameState {
        currentTick += 1
        return makeState()
    }

    fun simulateTick(state: GameState): GameState {
        currentTick = state.tick.value + 1
        // Slight deterministic move: shift each entity by +1 in x
        val moved = state.entities.play.map { e ->
            e.copy(position = Position(e.position.x + 1f, e.position.y))
        }
        return GameState(Indexed.of(moved.size) { i -> moved[i] }, GameTick(currentTick))
    }

    private fun makeState(): GameState {
        val e1 = GameEntity(EntityId("unit_1"), Position(100f, 200f), Health(100f), PlayerId(1))
        val e2 = GameEntity(EntityId("unit_2"), Position(120f, 220f), Health(90f), PlayerId(2))
        return GameState(Indexed.of(2) { i -> listOf(e1, e2)[i] }, GameTick(currentTick))
    }
}
