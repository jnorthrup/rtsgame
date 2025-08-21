package rtsgame

import kotlinx.coroutines.runBlocking
import rtsgame.core.launchRTSGame

/**
 * JVM entry point for RTS game
 */

fun main(args: Array<String>) = runBlocking {
    launchRTSGame()
}