package rtsgame.core

// Minimal Pathfinder stub to satisfy TDD seed. Returns straight-line path for clear maps.
object Pathfinder {
    fun findPath(start: Position, goal: Position): List<Position> = listOf(start, goal)
}
