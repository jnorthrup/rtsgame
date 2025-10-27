package rtsgame

import rtsgame.core.Vec3
import kotlin.math.sqrt

object Vec3Utils {
    fun add(a: Vec3, b: Vec3): Vec3 = Vec3(a.first + b.first, a.second + b.second, a.third + b.third)

    fun distance(a: Vec3, b: Vec3): Float {
        val dx = a.first - b.first
        val dy = a.second - b.second
        val dz = a.third - b.third
        return sqrt(dx * dx + dy * dy + dz * dz)
    }
}
