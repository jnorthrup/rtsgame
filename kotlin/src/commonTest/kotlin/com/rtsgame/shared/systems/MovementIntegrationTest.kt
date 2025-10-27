package com.rtsgame.shared.systems

import kotlin.test.Test
import kotlin.test.assertTrue
import com.rtsgame.shared.map.GameMap
import com.rtsgame.shared.map.Tile
import com.rtsgame.shared.map.TileType
import com.rtsgame.shared.map.Position
import com.rtsgame.shared.entity.GameUnit
import com.rtsgame.shared.game.GameState
import com.rtsgame.shared.systems.MovementSystem
import com.rtsgame.shared.systems.AttackProperties
import com.rtsgame.shared.systems.DefenseProperties
import com.rtsgame.shared.entity.UnitType

class MovementIntegrationTest {
    @Test
    fun unitFollowsPathToDestination() {
        // Create a simple 5x1 open map
        val width = 5
        val height = 1
        val row = List(width) { Tile(TileType.GRASS, isWalkable = true) }
        val grid = List(height) { row }
        val gameMap = GameMap(width, height, grid)

        val movementSystem = MovementSystem(gameMap)

        // unit starts at tile 0 center
        val startPos = Position(0.5f, 0.5f)
        val targetPos = Position(4.5f, 0.5f)

        val unit = GameUnit(
            id = "u1",
            position = startPos,
            health = 100f,
            maxHealth = 100f,
            speed = 1f,
            team = 0,
            type = UnitType.WORKER,
            attackProperties = AttackProperties(0f),
            defenseProperties = DefenseProperties()
        )

        var state = GameState().addEntity(unit)

        // Issue move command (moveUnit sets the path)
        state = movementSystem.moveUnit(state, "u1", targetPos)

        // Simulate updates until unit stops moving or we hit a max iteration
        val maxTicks = 20
        var ticks = 0
        while (ticks < maxTicks) {
            val u = state.entities["u1"] as? GameUnit ?: break
            if (u.path.isEmpty()) break
            state = movementSystem.update(state, 1f) // dt = 1s per tick
            ticks++
        }

        val final = state.entities["u1"] as? GameUnit
        assertTrue(final != null, "unit should still exist")
        // Verify unit reached the destination (within 1 tile tolerance)
        val dx = (final!!.position.x - targetPos.x)
        val dy = (final.position.y - targetPos.y)
        val distSq = dx * dx + dy * dy
        assertTrue(distSq < 1.01f, "Unit should be at or very near the destination after updates")
    }
}
