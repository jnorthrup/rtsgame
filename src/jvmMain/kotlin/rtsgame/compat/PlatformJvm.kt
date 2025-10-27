package rtsgame.compat

actual fun currentTimeMillis(): Long = java.lang.System.currentTimeMillis()

actual fun formatFloat(value: Float, precision: Int): String = String.format("%.${precision}f", value)

// JVM platform inline marker
actual annotation class PlatformInline()