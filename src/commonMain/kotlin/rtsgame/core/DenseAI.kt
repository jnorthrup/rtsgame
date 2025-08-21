package rtsgame.core

import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import kotlin.math.*
import kotlin.random.Random

/**
 * Dense AI using functional reactive programming and emergent behaviors
 */

// AI types
typealias Perception = (World, EntityId) -> Map<String, Any>
typealias Decision = (Map<String, Any>) -> Cmd?
typealias Behavior = Pair<Perception, Decision>

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
    // Perception functions
    val spatial: Perception = spatialLbl@ { world, id ->
    val entity = world[id] ?: return@spatialLbl emptyMap()
    val pos = entity.get<Pos>("pos")?.vec ?: return@spatialLbl emptyMap()
    val team = entity.get<Team>("team")?.id ?: return@spatialLbl emptyMap()
        
        val allies = world.with<Team>("team")
            .filter { entry: Pair<EntityId, Team> -> entry.second.id == team }
            .mapNotNull { entry: Pair<EntityId, Team> ->
                val otherId = entry.first
                if (otherId == id) return@mapNotNull null
                world[otherId]?.get<Pos>("pos")?.vec?.let { otherPos ->
                    otherId to pos.dist(otherPos)
                }
            }
            .sortedBy { it.second }
            .take(5)
        
        val enemies = world.with<Team>("team")
            .filter { entry: Pair<EntityId, Team> -> entry.second.id != team }
            .mapNotNull { entry: Pair<EntityId, Team> ->
                val enemyId = entry.first
                world[enemyId]?.get<Pos>("pos")?.vec?.let { enemyPos ->
                    enemyId to pos.dist(enemyPos)
                }
            }
            .sortedBy { it.second }
            .take(5)
        
        mapOf(
            "pos" to pos,
            "team" to team,
            "allies" to allies,
            "enemies" to enemies,
            "threat" to enemies.count { it.second < 100f }
        )
    }
    
    val economic: Perception = economicLbl@ { world, id ->
        val entity = world[id] ?: return@economicLbl emptyMap()
        val pos = entity.get<Pos>("pos")?.vec ?: return@economicLbl emptyMap()
        
        val resources = world.asSequence()
            .filter { (_, ent): Map.Entry<EntityId, Entity> -> ent["type"] == "resource" }
            .mapNotNull { (_, ent): Map.Entry<EntityId, Entity> ->
                ent.get<Pos>("pos")?.vec?.let { resourcePos -> resourcePos to pos.dist(resourcePos) }
            }
            .sortedBy { it.second }
            .take(3)
            .toList()
        
        mapOf(
            "resources" to resources,
            "hasResources" to resources.isNotEmpty()
        )
    }
    
    // Decision functions
    val fight: Decision = fightLbl@ { perception ->
    val enemies = perception["enemies"] as? List<Pair<EntityId, Float>> ?: return@fightLbl null
    val pos = perception["pos"] as? Vec3 ?: return@fightLbl null
        
        enemies.firstOrNull()?.let { (target, dist) ->
            if (dist < 50f) {
                Cmd.Attack(perception["id"] as EntityId, target)
            } else {
                // Move towards enemy
                val targetPos = perception["targetPos"] as? Vec3 ?: pos
                Cmd.Move(perception["id"] as EntityId, targetPos)
            }
        }
    }
    
    val flee: Decision = fleeLbl@ { perception ->
        val threat = perception["threat"] as? Int ?: 0
        if (threat > 2) {
            val pos = perception["pos"] as? Vec3 ?: return@fleeLbl null
            val enemies = perception["enemies"] as? List<Pair<EntityId, Float>> ?: return@fleeLbl null
            
            // Calculate escape vector
        val escapeVector = enemies.fold(Vec3(0f, 0f, 0f)) { acc: Vec3, pair: Pair<EntityId, Float> ->
            val dist = pair.second
            val weight = 1f / (dist + 1f)
            acc + pos * weight
            }.let { 
                if (it != Vec3(0f, 0f, 0f)) it * -1f
                else Vec3(Random.nextFloat() - 0.5f, Random.nextFloat() - 0.5f, 0f)
            }
            
            Cmd.Move(perception["id"] as EntityId, pos + escapeVector * 50f)
        } else null
    }
    
    val gather: Decision = gatherLbl@ { perception ->
        val resources = perception["resources"] as? List<Pair<Vec3, Float>> ?: return@gatherLbl null
        resources.firstOrNull()?.let { (resourcePos, _) ->
            Cmd.Move(perception["id"] as EntityId, resourcePos)
        }
    }
}

// Composite behaviors using monadic composition
object Behaviors {
    // Behavior combinators
    infix fun Behavior.or(other: Behavior): Behavior = 
        first to { perception ->
            this.second(perception) ?: other.second(perception)
        }
    
    infix fun Behavior.then(other: Behavior): Behavior =
        { world: World, id: EntityId -> 
            this.first(world, id) + other.first(world, id)
        } to { perception: Map<String, Any> ->
            this@then.second(perception) ?: other.second(perception)
        }
    
    fun Behavior.withPriority(priority: Float): Behavior =
        first to { perception ->
            if (Random.nextFloat() < priority) this.second(perception)
            else null
        }
    
    // Composite behaviors
    val aggressive = (Tactics.spatial to Tactics.fight) or 
                    (Tactics.economic to Tactics.gather)
    
    val defensive = (Tactics.spatial to Tactics.flee) or
                   (Tactics.spatial to Tactics.fight).withPriority(0.3f)
    
    val economic = (Tactics.economic to Tactics.gather) or
                  (Tactics.spatial to Tactics.flee)
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

// Helper extensions
fun Vec3.normalize(): Vec3 {
    val len = sqrt(first * first + second * second + third * third)
    return if (len > 0) Vec3(first / len, second / len, third / len)
    else this
}

operator fun Vec3.minus(other: Vec3): Vec3 =
    Vec3(first - other.first, second - other.second, third - other.third)