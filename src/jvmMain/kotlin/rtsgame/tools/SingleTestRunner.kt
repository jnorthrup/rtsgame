package rtsgame.tools

import rtsgame.core.*

fun main() {
    val start = Position(0f, 0f)
    val goal = Position(3f, 0f)
    val path = Pathfinder.findPath(start, goal)
    println("Path start: ${path.first()}, end: ${path.last()}")
    if (path.first() == start && path.last() == goal) {
        println("Pathfinder TDD: PASS")
        kotlin.system.exitProcess(0)
    } else {
        println("Pathfinder TDD: FAIL")
        kotlin.system.exitProcess(2)
    }
}
