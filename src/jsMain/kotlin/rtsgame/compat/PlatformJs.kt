package rtsgame.compat

import kotlin.js.Date

actual fun currentTimeMillis(): Long = Date.now().toLong()

actual fun formatFloat(value: Float, precision: Int): String = (value.asDynamic().toFixed(precision) as String)

actual annotation class PlatformInline()
