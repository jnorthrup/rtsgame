package rtsgame

/**
 * Minimal NetworkPhysics helper used by tests/systems to merge state updates deterministically.
 * This is intentionally small and pure so it can be expanded later.
 */
object NetworkPhysics {
    /** Generic merge for maps with any value type; last-writer-wins semantics. */
    fun <T> merge(a: Map<String, T>, b: Map<String, T>): Map<String, T> {
        val result = a.toMutableMap()
        for ((k, v) in b) result[k] = v
        return result
    }
}
