package rtsgame

import trikeshed.lib.*
import rtsgame.core.*
import rtsgame.core.Target

/**
 * Game model types following TrikeShed axioms
 * μ-Chain: Axiomatic Aliasing for domain semantics
 */

// μ-Chain: Core Instantiation - Value types
data class GameTick(val value: Long)
data class EntityId(val value: String)
data class Health(val value: Float)
data class PlayerId(val value: Int)

// μ-Chain: Core Instantiation - Position as Join composition
class Position(val x: Float, val y: Float) {
    // Coordinate wrapper types for test compatibility
    data class XCoord(val value: Float)
    data class YCoord(val value: Float)

    fun component1(): XCoord = XCoord(x)
    fun component2(): YCoord = YCoord(y)

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is Position) return false
        return x == other.x && y == other.y
    }

    override fun hashCode(): Int = 31 * x.hashCode() + y.hashCode()
    override fun toString(): String = "Position(x=$x, y=$y)"
}

// μ-Chain: Axiomatic Aliasing - Entity composition
data class GameEntity(
    val id: EntityId,
    val position: Position,
    val health: Health,
    val playerId: PlayerId
)

// μ-Chain: Axiomatic Aliasing - State composition
data class GameState(
    val entities: Indexed<GameEntity>,
    val tick: GameTick
)

/**
 * Real GameEngine integrating with DenseCore
 * μ-Chain: Functional Extension + Algebraic Transformation
 */
class GameEngine {
    private var currentTick = 0L
    private var world: World = createInitialWorld()
    // Duration in seconds per tick; configurable for tests and different simulation rates
    var tickDuration: Float = 1f / 60f

    // μ-Chain: Functional Extension
    fun tick(): GameState {
        currentTick += 1
        return worldToGameState(world, currentTick)
    }

    // μ-Chain: Algebraic Transformation
    fun simulateTick(state: GameState): GameState {
        currentTick = state.tick.value + 1

        // Use the engine's persistent world for simulation (contains movement state)
        // world = gameStateToWorld(state)  // Don't overwrite world from state

        // Run movement simulation
        world = simulateMovement(world)

        return worldToGameState(world, currentTick)
    }

    // μ-Chain: Functional Extension - World creation
    private fun createInitialWorld(): World = mapOf(
        0 to entityOf(
            "type" to "unit",
            "pos" to Pos(Vec3(100f, 200f, 0f)),
            "vel" to Vel(Vec3(60f, 0f, 0f)), // Moving right at 60 units/sec (1 unit per tick at 60fps)
            "target" to Target(Vec3(200f, 200f, 0f)), // Target at x=200
            "hp" to HP(100f to 100f),
            "team" to Team(1)
        ),
        1 to entityOf(
            "type" to "unit",
            "pos" to Pos(Vec3(120f, 220f, 0f)),
            "hp" to HP(90f to 100f),
            "team" to Team(2)
        )
    )

    // μ-Chain: Algebraic Transformation - State conversion
    private fun worldToGameState(world: World, tick: Long): GameState {
        val entities = world.entries.mapIndexed { idx, (id, entity) ->
            val pos = entity.get<Pos>("pos") ?: Pos(Vec3(0f, 0f, 0f))
            val hp = entity.get<HP>("hp") ?: HP(100f to 100f)
            val team = entity.get<Team>("team") ?: Team(1)

            GameEntity(
                id = EntityId("unit_${id + 1}"),
                position = Position(pos.vec.first, pos.vec.second),
                health = Health(hp.value.first),
                playerId = PlayerId(team.id)
            )
        }

        return GameState(
            entities = Indexed.of(entities.size) { i -> entities[i] },
            tick = GameTick(tick)
        )
    }

    // μ-Chain: Algebraic Transformation - Reverse conversion
    private fun gameStateToWorld(state: GameState): World {
        val entities = mutableMapOf<rtsgame.core.EntityId, Entity>()

        state.entities.play.forEachIndexed { idx, gameEntity ->
            entities[idx] = entityOf(
                "type" to "unit",
                "pos" to Pos(Vec3(gameEntity.position.x, gameEntity.position.y, 0f)),
                "hp" to HP(gameEntity.health.value to 100f),
                "team" to Team(gameEntity.playerId.value)
            )
        }

        return entities
    }

    // μ-Chain: Metaseries Composition - Transform operation on series
    private fun simulateMovement(world: World): World =
        world.mapValues { (id, entity) ->
            val pos = entity.get<Pos>("pos") ?: return@mapValues entity
            val vel = entity.get<Vel>("vel") ?: return@mapValues entity
            val target = entity.get<Target>("target")
            
            if (target == null) return@mapValues entity
            
            // Calculate new position
            val dt = tickDuration
            val newPos = Vec3(
                pos.vec.first + vel.vec.first * dt,
                pos.vec.second + vel.vec.second * dt,
                pos.vec.third + vel.vec.third * dt
            )
            
            // Check if we've reached the target
            val dx = target.vec.first - newPos.first
            val dy = target.vec.second - newPos.second
            val dz = target.vec.third - newPos.third
            val distanceToTarget = kotlin.math.sqrt(dx * dx + dy * dy + dz * dz)
            
            if (distanceToTarget < 1f) {
                // Reached target, stop moving
                entity.filterKeys { it != "vel" && it != "target" }
                    .plusEntry("pos" to Pos(target.vec))
            } else {
                // Continue moving
                entity.plusEntry("pos" to Pos(newPos))
            }
        }
    
    // GameEngine → CommandSystem Integration Methods
    
    /**
     * Process a single game tick, updating CommandSystem
     */
    fun processGameTick() {
        // Update CommandSystem formation movements
        CommandSystem.updateFormationMovement(world, tickDuration)
        
        // Sync CommandSystem changes back to GameEngine world
        syncCommandSystemToGameEngine()
        
        // Process existing simulation
        world = simulateMovement(world)
        currentTick++
    }
    
    /**
     * Synchronize GameEngine entities to CommandSystem
     */
    fun syncGameEngineToCommandSystem() {
        for ((entityId, entity) in world) {
            val pos = entity.get<Pos>("pos") ?: continue
            val unitId = entityId + 1 // Convert 0-based to 1-based ID
            CommandSystem.addUnit(unitId, Position(pos.vec.first, pos.vec.second))
        }
    }
    
    /**
     * Synchronize CommandSystem unit states back to GameEngine
     */
    fun syncCommandSystemToGameEngine() {
        val newWorld = world.toMutableMap()
        for ((entityId, entity) in world) {
            val unitId = entityId + 1 // Convert 0-based to 1-based ID
            val commandSystemPos = CommandSystem.getUnitPosition(unitId)
            
            // Update GameEngine entity position
            val updatedEntity = entity.plusEntry("pos" to Pos(Vec3(commandSystemPos.x, commandSystemPos.y, 0f)))
            newWorld[entityId] = updatedEntity
        }
        world = newWorld
    }
    
    /**
     * Issue a formation command through the GameEngine
     */
    fun issueFormationCommand(unitIds: List<Int>, targetPosition: Position, formationType: String, spacing: Float): String {
        val command = CommandSystem.createFormationMoveCommand(unitIds, targetPosition, formationType, spacing)
        CommandSystem.executeFormationCommand(world, command)
        return command.id
    }
    
    /**
     * Check if a command is currently active
     */
    fun isCommandActive(commandId: String): Boolean {
        return CommandSystem.isCommandActive(commandId)
    }
    
    /**
     * Add a unit to the GameEngine world
     */
    fun addUnit(unitId: Int, position: Position) {
        val entityId = unitId - 1 // Convert 1-based to 0-based ID
        val entity = entityOf(
            "type" to "unit",
            "pos" to Pos(Vec3(position.x, position.y, 0f)),
            "hp" to HP(100f to 100f),
            "team" to Team(1)
        )
        world = world.plus(entityId to entity)
        
        // Also add to CommandSystem
        CommandSystem.addUnit(unitId, position)
    }
    
    /**
     * Get the position of a unit from GameEngine
     */
    fun getUnitPosition(unitId: Int): Position {
        val entityId = unitId - 1 // Convert 1-based to 0-based ID
        val entity = world[entityId] ?: return Position(0f, 0f)
        val pos = entity.get<Pos>("pos") ?: return Position(0f, 0f)
        return Position(pos.vec.first, pos.vec.second)
    }
}
