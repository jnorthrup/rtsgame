package rtsgame.core

import trikeshed.lib.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import kotlin.math.*
import kotlin.random.Random

/**
 * Dense AI using functional reactive programming and emergent behaviors
 * μ-Chain: Performance Purity - eliminating String keys in hot paths
 */

// μ-Chain: Axiomatic Aliasing - typed perception data using Join composition
data class PerceptionData(
    val id: EntityId,
    val pos: Vec3,
    val allies: Indexed<Join<EntityId, Float>>,  // (id, distance) pairs
    val enemies: Indexed<Join<EntityId, Float>>,
    val resources: Indexed<Join<EntityId, Float>>,  // (resourceId, distance) pairs
    val threat: Int
)

// μ-Chain: Functional Extension - perception and decision types
typealias Perception = (World, EntityId) -> PerceptionData?
typealias Decision = (PerceptionData) -> Cmd?
typealias Behavior = Join<Perception, Decision>

// Spatial reasoning
data class SpatialContext(
    val nearbyAllies: List<Pair<EntityId, Float>>,
    val nearbyEnemies: List<Pair<EntityId, Float>>,
    val nearbyResources: List<Pair<Vec3, String>>,
    val territoryControl: Float,
    val threatLevel: Float
)

// Tactical primitives
object Tactics {
    // μ-Chain: Functional Extension - perception functions with typed data
    val spatial: Perception = spatialLbl@ { world, id ->
        val entity = world[id] ?: return@spatialLbl null
        val pos = entity.get<Pos>("pos")?.vec ?: return@spatialLbl null
        val team = entity.get<Team>("team")?.id ?: return@spatialLbl null

        // μ-Chain: Metaseries Composition - batch processing with functional transforms
        val alliesList = world.with<Team>("team")
            .filter { (otherId, t): Pair<EntityId, Team> -> t.id == team && otherId != id }
            .mapNotNull { (otherId, _): Pair<EntityId, Team> ->
                world[otherId]?.get<Pos>("pos")?.vec?.let { otherPos ->
                    Join(otherId, pos.dist(otherPos))
                }
            }
            .sortedBy { it.r }
            .take(5)
            .toList()

        val enemiesList = world.with<Team>("team")
            .filter { (_, t): Pair<EntityId, Team> -> t.id != team }
            .mapNotNull { (enemyId, _): Pair<EntityId, Team> ->
                world[enemyId]?.get<Pos>("pos")?.vec?.let { enemyPos ->
                    Join(enemyId, pos.dist(enemyPos))
                }
            }
            .sortedBy { it.r }
            .take(5)
            .toList()

        PerceptionData(
            id = id,
            pos = pos,
            allies = Indexed.fromList(alliesList),
            enemies = Indexed.fromList(enemiesList),
            resources = Indexed.fromList(emptyList()),
            threat = enemiesList.count { it.r < 100f }
        )
    }
    
    val economic: Perception = economicLbl@ { world, id ->
        val entity = world[id] ?: return@economicLbl null
        val pos = entity.get<Pos>("pos")?.vec ?: return@economicLbl null
        val team = entity.get<Team>("team")?.id ?: return@economicLbl null

        val resourcesList = world.asSequence()
            .filter { (_, ent): Map.Entry<EntityId, Entity> -> ent["type"] == "resource" }
            .mapNotNull { (resourceId, ent): Map.Entry<EntityId, Entity> ->
                ent.get<Pos>("pos")?.vec?.let { resourcePos ->
                    Join(resourceId, pos.dist(resourcePos))
                }
            }
            .sortedBy { it.r }
            .take(3)
            .toList()

        PerceptionData(
            id = id,
            pos = pos,
            allies = Indexed.fromList(emptyList()),
            enemies = Indexed.fromList(emptyList()),
            resources = Indexed.fromList(resourcesList),
            threat = 0
        )
    }
    
    // Decision functions
    val fight: Decision = fightLbl@ { perception ->
        val enemyCount = perception.enemies.size
        if (enemyCount == 0) return@fightLbl null

        val nearestEnemy = perception.enemies.play[0]
        val target = nearestEnemy.l
        val dist = nearestEnemy.r

        if (dist < 50f) {
            Cmd.Attack(perception.id, target)
        } else {
            // Move towards enemy position (simplified - would need enemy position lookup)
            Cmd.Move(perception.id, perception.pos)
        }
    }
    
    val flee: Decision = fleeLbl@ { perception ->
        if (perception.threat <= 2) return@fleeLbl null

        // Calculate escape vector from enemy threats
        val escapeVector = perception.enemies.play.fold(Vec3(0f, 0f, 0f)) { acc: Vec3, enemyJoin: Join<EntityId, Float> ->
            val dist = enemyJoin.r
            val weight = 1f / (dist + 1f)
            acc + perception.pos * weight
        }.let {
            if (it != Vec3(0f, 0f, 0f)) it * -1f
            else Vec3(Random.nextFloat() - 0.5f, Random.nextFloat() - 0.5f, 0f)
        }

        Cmd.Move(perception.id, perception.pos + escapeVector * 50f)
    }
    
    val gather: Decision = gatherLbl@ { perception ->
        if (perception.resources.size == 0) return@gatherLbl null

        val nearestResource = perception.resources.play[0]
        val resourceId = nearestResource.l
        Cmd.Gather(perception.id, resourceId)
    }
}

// Composite behaviors using monadic composition
object Behaviors {
    // μ-Chain: Operator Application - behavior combinators with Join
    infix fun Behavior.or(other: Behavior): Behavior =
        Join(this.l) { perception ->
            this.r(perception) ?: other.r(perception)
        }

    infix fun Behavior.then(other: Behavior): Behavior =
        Join({ world: World, id: EntityId ->
            this.l(world, id) ?: other.l(world, id)
        }) { perception: PerceptionData ->
            this@then.r(perception) ?: other.r(perception)
        }

    fun Behavior.withPriority(priority: Float): Behavior =
        Join(this.l) { perception ->
            if (Random.nextFloat() < priority) this.r(perception)
            else null
        }

    // Composite behaviors
    val aggressive = Join(Tactics.spatial, Tactics.fight) or
                    Join(Tactics.economic, Tactics.gather)

    val defensive = Join(Tactics.spatial, Tactics.flee) or
                   Join(Tactics.spatial, Tactics.fight).withPriority(0.3f)
    
    val economic = Join(Tactics.economic, Tactics.gather) or
                  Join(Tactics.spatial, Tactics.flee)
}

// Neural-inspired decision networks
class NeuralAI(
    val layers: List<Int> = listOf(10, 20, 10, 4)
) {
    private val weights = layers.zipWithNext().map { (a, b) ->
        Array(a) { FloatArray(b) { Random.nextFloat() * 2 - 1 } }
    }
    
    fun decide(input: FloatArray): Int {
        var current: FloatArray = input

        for (layer in weights) {
            val next = FloatArray(layer[0].size) { j ->
                var sum = 0f
                for (i in current.indices) {
                    val w = layer.getOrNull(i)?.getOrNull(j) ?: 0f
                    sum += current[i] * w
                }
                tanh(sum)
            }
            current = next
        }

        return (current.indices.maxByOrNull { current[it] } ?: 0)
    }
    
    fun perceive(world: World, id: EntityId): FloatArray {
        val entity = world[id] ?: return FloatArray(layers.first())
        val pos = entity.get<Pos>("pos")?.vec ?: return FloatArray(layers.first())
        val team = entity.get<Team>("team")?.id ?: 0
        
        // Neural input encoding
    val features = mutableListOf<Float>()
    features += pos.first / 1000f
    features += pos.second / 1000f
    features += (entity.get<HP>("hp")?.let { it.value.first / it.value.second } ?: 1f)
    features += world.with<Team>("team").count { entry: Pair<EntityId, Team> -> entry.second.id == team }.toFloat() / 20f
    features += world.with<Team>("team").count { entry: Pair<EntityId, Team> -> entry.second.id != team }.toFloat() / 20f

        // Pad or trim to layer size
        val arr = FloatArray(layers.first())
        for (i in 0 until layers.first()) {
            arr[i] = if (i < features.size) features[i] else 0f
        }
        return arr
    }
}

// Swarm intelligence
object Swarm {
    // Emergent flocking behavior
    fun flock(
        world: World,
        team: Team,
        cohesion: Float = 0.5f,
        separation: Float = 0.3f,
        alignment: Float = 0.2f
    ): Flow<List<Cmd>> = flow {
        while (currentCoroutineContext().isActive) {
        val commands = world.with<Team>("team")
            .filter { entry: Pair<EntityId, Team> -> entry.second.id == team.id }
            .mapNotNull { entry: Pair<EntityId, Team> ->
                val id = entry.first
                val entity = world[id] ?: return@mapNotNull null
                val pos = entity.get<Pos>("pos")?.vec ?: return@mapNotNull null
                val vel = entity.get<Vel>("vel")?.vec ?: Vec3(0f, 0f, 0f)
                    
                    // Find neighbors
                    val neighbors = world.with<Team>("team")
                        .filter { (otherId, t) -> t.id == team.id && otherId != id }
                        .mapNotNull { entry2: Pair<EntityId, Team> ->
                            val otherId = entry2.first
                            world[otherId]?.get<Pos>("pos")?.vec?.let { otherPos ->
                                val dist = pos.dist(otherPos)
                                if (dist < 100f) Triple(otherId, otherPos, dist) else null
                            }
                        }
                        .toList()
                    
                    if (neighbors.isEmpty()) return@mapNotNull null
                    
                    // Cohesion - move towards center of neighbors
                    val center = neighbors.fold(Vec3(0f, 0f, 0f)) { acc: Vec3, triple: Triple<EntityId, Vec3, Float> ->
                        val nPos = triple.second
                        Vec3(acc.first + nPos.first, acc.second + nPos.second, acc.third + nPos.third)
                    }.let { 
                        Vec3(it.first / neighbors.size, it.second / neighbors.size, it.third / neighbors.size)
                    }
                    val cohesionForce = (center - pos).normalize() * cohesion
                    
                    // Separation - avoid crowding
                    val separationForce = neighbors.fold(Vec3(0f, 0f, 0f)) { acc: Vec3, triple: Triple<EntityId, Vec3, Float> ->
                        val nPos = triple.second
                        val dist = triple.third
                        if (dist < 30f) {
                            val away = (pos - nPos).normalize() * (1f / (dist + 1f))
                            acc + away
                        } else acc
                    } * separation
                    
                    // Alignment - match neighbor velocities
                    val avgVel = neighbors.mapNotNull { triple: Triple<EntityId, Vec3, Float> ->
                        val otherId = triple.first
                        world[otherId]?.get<Vel>("vel")?.vec
                    }.fold(Vec3(0f, 0f, 0f)) { acc: Vec3, v: Vec3 ->
                        Vec3(acc.first + v.first, acc.second + v.second, acc.third + v.third)
                    }.let { 
                        if (neighbors.isNotEmpty()) {
                            Vec3(it.first / neighbors.size, it.second / neighbors.size, it.third / neighbors.size)
                        } else Vec3(0f, 0f, 0f)
                    }
                    val alignmentForce = avgVel * alignment
                    
                    // Combine forces
                    val totalForce = cohesionForce + separationForce + alignmentForce
                    val targetPos = pos + totalForce * 10f
                    
                    Cmd.Move(id, targetPos)
                }
                .toList()
            
            emit(commands)
            delay(100) // Update rate
        }
    }
}

// Strategic AI layer
class StrategyAI(
    val team: Team
) {
    private val memory = mutableMapOf<String, Any>()
    
    // High-level strategy states
    sealed class Strategy {
        object Expand : Strategy()
        object Attack : Strategy()
        object Defend : Strategy()
        object Tech : Strategy()
    }
    
    private var currentStrategy: Strategy = Strategy.Expand
    
    suspend fun think(world: World): List<Cmd> = coroutineScope {
        // Analyze game state
        val analysis = analyze(world)
        
        // Update strategy
        currentStrategy = when {
            analysis.enemyStrength > analysis.ourStrength * 1.5f -> Strategy.Defend
            analysis.ourStrength > analysis.enemyStrength * 2f -> Strategy.Attack
            analysis.unitCount < 20 -> Strategy.Expand
            else -> Strategy.Tech
        }
        
        // Execute strategy
        when (currentStrategy) {
            is Strategy.Expand -> expand(world, analysis)
            is Strategy.Attack -> attack(world, analysis)
            is Strategy.Defend -> defend(world, analysis)
            is Strategy.Tech -> tech(world, analysis)
        }
    }
    
    private data class Analysis(
        val unitCount: Int,
        val enemyCount: Int,
        val ourStrength: Float,
        val enemyStrength: Float,
        val mapControl: Float
    )
    
    private fun analyze(world: World): Analysis {
        val ourUnits = world.with<Team>("team").filter { (_, t) -> t.id == team.id }.toList()
        val enemyUnits = world.with<Team>("team").filter { (_, t) -> t.id != team.id }.toList()
        
        return Analysis(
            unitCount = ourUnits.size,
            enemyCount = enemyUnits.size,
            ourStrength = ourUnits.sumOf { (id, _) -> 
                world[id]?.get<Dmg>("dmg")?.value?.toDouble() ?: 0.0
            }.toFloat(),
            enemyStrength = enemyUnits.sumOf { (id, _) ->
                world[id]?.get<Dmg>("dmg")?.value?.toDouble() ?: 0.0
            }.toFloat(),
            mapControl = ourUnits.size.toFloat() / (ourUnits.size + enemyUnits.size).coerceAtLeast(1)
        )
    }
    
    private suspend fun expand(world: World, analysis: Analysis): List<Cmd> {
        // Find good expansion locations
        val basePos = world.with<Team>("team")
            .filter { (_, t) -> t.id == team.id }
            .mapNotNull { (id, _) -> world[id]?.get<Pos>("pos")?.vec }
            .firstOrNull() ?: Vec3(0f, 0f, 0f)
        
        return listOf(
            Cmd.Spawn("scout", team.id, basePos + Vec3(100f, 0f, 0f)),
            Cmd.Build("base", basePos + Vec3(200f, 200f, 0f))
        )
    }
    
    private suspend fun attack(world: World, analysis: Analysis): List<Cmd> {
        // Coordinate attack on weakest enemy
        return world.with<Team>("team")
            .filter { (_, t) -> t.id == team.id }
            .take(10)
            .mapNotNull { (id, _) ->
                val enemyTarget = world.with<Team>("team")
                    .filter { (_, t) -> t.id != team.id }
                    .mapNotNull { (enemyId, _) ->
                        world[enemyId]?.get<Pos>("pos")?.vec?.let { enemyId to it }
                    }
                    .firstOrNull()
                
                enemyTarget?.let { (targetId, targetPos) ->
                    if (Random.nextFloat() < 0.3f) {
                        Cmd.Attack(id, targetId)
                    } else {
                        Cmd.Move(id, targetPos)
                    }
                }
            }
            .toList()
    }
    
    private suspend fun defend(world: World, analysis: Analysis): List<Cmd> = 
        emptyList() // Simplified
    
    private suspend fun tech(world: World, analysis: Analysis): List<Cmd> =
        emptyList() // Simplified
}

// Helper extensions moved to DenseCore.kt for shared access