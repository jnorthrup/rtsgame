package rtsgame.core

actual object PlatformTime {
    actual fun nanoTime(): Long = java.lang.System.nanoTime()
    actual fun currentTimeMillis(): Long = java.lang.System.currentTimeMillis()
}