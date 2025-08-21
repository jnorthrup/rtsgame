package rtsgame.compat

actual fun currentTimeMillis(): Long = java.lang.System.currentTimeMillis()

actual fun formatFloat(value: Float, precision: Int): String = "%.*f".format(precision, value)

// JVM platform inline marker
actual annotation class PlatformInline()