package rtsgame.compat

expect fun currentTimeMillis(): Long
expect fun formatFloat(value: Float, precision: Int): String

expect annotation class PlatformInline()
