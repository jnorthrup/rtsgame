package com.rtsgame.shared.replay

import com.rtsgame.shared.util.gameRNG
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.encodeToString
import kotlin.math.*

// Ported and adapted from js/core/replay/battleJournal.js
@Suppress("UNCHECKED_CAST")
class ReplayBattleJournal {
    var currentBattle: MutableMap<String, Any?>? = null
    var isRecording: Boolean = false
    var frameCount: Int = 0
    val frames = mutableListOf<Any>()
    val events = mutableListOf<Any>()

    private val json = Json { prettyPrint = false }

    fun startRecording(battleConfig: Map<String, Any?> = emptyMap()) {
        val battleId = "battle_${System.currentTimeMillis()}_${(Math.random() * 1e9).toLong()}"
        val battleSeed = abs(battleId.hashCode()).toLong()
        try { gameRNG.setSeed(battleSeed) } catch (_: Throwable) {}

        currentBattle = mutableMapOf(
            "id" to battleId,
            "startTime" to System.currentTimeMillis(),
            "config" to (battleConfig + mapOf("battleSeed" to battleSeed, "deterministic" to true)),
            "frames" to mutableListOf<Any>(),
            "events" to mutableListOf<Any>(),
            "rngState" to mutableListOf<Any>(),
            "stateSnapshots" to mutableListOf<Any>()
        )

        isRecording = true
        frameCount = 0
        frames.clear()
        events.clear()
        println("📹 Replay Battle Journal started - $battleId")
        recordEvent("BATTLE_START", "Battle recording initiated")
        recordRNGState()
    }

    fun recordFrame(gameContext: Map<String, Any?>?) {
        if (!isRecording || currentBattle == null) return

        frameCount++

        if (frameCount % 30 == 0) {
            val frameData = captureFrameData(gameContext)
            @Suppress("UNCHECKED_CAST")
            (currentBattle?.get("frames") as? MutableList<Any?>)?.add(frameData)
        }

        if (frameCount % (5 * 60) == 0) {
            val snapshot = captureStateSnapshot(gameContext)
            @Suppress("UNCHECKED_CAST")
            (currentBattle?.get("stateSnapshots") as? MutableList<Any?>)?.add(snapshot)
        }

        if (frameCount % (30 * 60) == 0) {
            checkStorageUsage()
        }
    }

    private fun captureStateSnapshot(gameContext: Map<String, Any?>?): Map<String, Any?> {
        val gameState = (gameContext?.get("gameState") as? Map<String, Any?>) ?: mapOf("gameTime" to 0)
        val time = (gameState["gameTime"] as? Number ?: 0).toDouble()
        val units = (gameContext?.get("units") as? List<Map<String, Any?>>) ?: emptyList()
        val buildings = (gameContext?.get("buildings") as? List<Map<String, Any?>>) ?: emptyList()
        val resources = (gameContext?.get("resources") as? Map<String, Any?>) ?: mapOf()

        // Simple heuristics for snapshot balances
        val blueRes = ((resources["blue"] as? Map<String, Any?>)?.get("mass") as? Number ?: 0).toDouble() + ((resources["blue"] as? Map<String, Any?>)?.get("energy") as? Number ?: 0).toDouble()
        val redRes = ((resources["red"] as? Map<String, Any?>)?.get("mass") as? Number ?: 0).toDouble() + ((resources["red"] as? Map<String, Any?>)?.get("energy") as? Number ?: 0).toDouble()
        val totalRes = max(1.0, blueRes + redRes)
        val economicBalance = blueRes / totalRes

        val blueMilitary = units.count { it["team"] == "blue" }
        val redMilitary = units.count { it["team"] == "red" }
        val milTotal = max(1.0, (blueMilitary + redMilitary).toDouble())
        val militaryBalance = blueMilitary / milTotal

        val teamStats = mapOf(
            "blue" to mapOf("resources" to mapOf("totalValue" to blueRes), "units" to blueMilitary),
            "red" to mapOf("resources" to mapOf("totalValue" to redRes), "units" to redMilitary)
        )

        return mapOf(
            "time" to time,
            "gamePhase" to when {
                blueRes + blueMilitary * 100 > redRes + redMilitary * 100 -> "blue_dominant"
                redRes + redMilitary * 100 > blueRes + blueMilitary * 100 -> "red_dominant"
                else -> "midgame"
            },
            "economicBalance" to economicBalance,
            "militaryBalance" to militaryBalance,
            "teamStats" to teamStats
        )
    }

    private fun captureFrameData(gameContext: Map<String, Any?>?): Map<String, Any?> {
        val units = (gameContext?.get("units") as? List<Map<String, Any?>>) ?: emptyList()
        val buildings = (gameContext?.get("buildings") as? List<Map<String, Any?>>) ?: emptyList()
        val resources = (gameContext?.get("resources") as? Map<String, Any?>) ?: mapOf("blue" to mapOf("mass" to 0, "energy" to 0), "red" to mapOf("mass" to 0, "energy" to 0))
        val gameState = (gameContext?.get("gameState") as? Map<String, Any?>) ?: mapOf("gameTime" to 0)
        val camera = (gameContext?.get("camera") as? Map<String, Any?>) ?: mapOf("x" to 0, "y" to 0, "zoom" to 1)

        val unitsOut = units.map { unit ->
            mapOf(
                "id" to (unit["id"] ?: "${unit["type"]}_${unit["x"]}_${unit["y"]}"),
                "type" to (unit["type"]?.let { if (it is Map<*, *>) it["name"] else it } ?: "unit"),
                "team" to unit["team"],
                "x" to floor((unit["x"] as? Number ?: 0).toDouble()).toInt(),
                "y" to floor((unit["y"] as? Number ?: 0).toDouble()).toInt(),
                "hp" to unit["hp"],
                "maxHp" to unit["maxHp"],
                "target" to (unit["target"] as? Map<String, Any?>)?.let { tgt ->
                    mapOf(
                        "type" to (tgt["type"]?.let { if (it is Map<*, *>) it["name"] else it } ?: "building"),
                        "team" to tgt["team"],
                        "distance" to floor(getDistance(unit, tgt)).toInt()
                    )
                },
                "state" to getUnitState(unit)
            )
        }

        val buildingsOut = buildings.map { b ->
            mapOf(
                "id" to (b["id"] ?: "${b["type"]}_${b["x"]}_${b["y"]}"),
                "type" to (b["type"]?.let { if (it is Map<*, *>) it["name"] else it } ?: "building"),
                "team" to b["team"],
                "x" to floor((b["x"] as? Number ?: 0).toDouble()).toInt(),
                "y" to floor((b["y"] as? Number ?: 0).toDouble()).toInt(),
                "hp" to b["hp"],
                "maxHp" to b["maxHp"],
                "productionQueue" to ((b["productionQueue"] as? List<*>)?.size ?: 0)
            )
        }

        return mapOf(
            "time" to (gameState["gameTime"] ?: 0),
            "frame" to frameCount,
            "units" to unitsOut,
            "buildings" to buildingsOut,
            "resources" to resources,
            "camera" to mapOf("x" to ((camera["x"] as? Number ?: 0).toInt()), "y" to ((camera["y"] as? Number ?: 0).toInt()), "zoom" to camera["zoom"]),
            "metrics" to calculateFrameMetrics(gameContext)
        )
    }

    private fun getUnitState(unit: Map<String, Any?>): String {
        if (unit["constructionTask"] != null) return "building"
        if (unit["target"] != null) return "combat"
        if (unit["patrolTarget"] != null) return "moving"
        if (unit["isEscaping"] == true) return "retreating"
        return "idle"
    }

    private fun getDistance(u1: Map<String, Any?>, u2: Map<String, Any?>): Double {
        val x1 = (u1["x"] as? Number ?: 0).toDouble()
        val y1 = (u1["y"] as? Number ?: 0).toDouble()
        val x2 = (u2["x"] as? Number ?: 0).toDouble()
        val y2 = (u2["y"] as? Number ?: 0).toDouble()
        return sqrt((x1 - x2).pow(2) + (y1 - y2).pow(2))
    }

    private fun calculateFrameMetrics(gameContext: Map<String, Any?>?): Map<String, Any?> {
        val units = (gameContext?.get("units") as? List<Map<String, Any?>>) ?: emptyList()
        val buildings = (gameContext?.get("buildings") as? List<Map<String, Any?>>) ?: emptyList()

        val activeCombats = units.count { it["target"] != null }
        val idleUnits = units.count { it["target"] == null && it["patrolTarget"] == null && it["constructionTask"] == null }
        val buildingProgress = buildings.sumOf { (it["productionProgress"] as? Number ?: 0).toDouble() }

        return mapOf(
            "activeCombats" to activeCombats,
            "idleUnits" to idleUnits,
            "buildingProgress" to buildingProgress,
            "totalUnits" to units.size,
            "totalBuildings" to buildings.size,
            "economicActivity" to calculateEconomicActivity(gameContext)
        )
    }

    private fun calculateEconomicActivity(gameContext: Map<String, Any?>?): Int {
        val buildings = (gameContext?.get("buildings") as? List<Map<String, Any?>>) ?: emptyList()
        val resources = (gameContext?.get("resources") as? Map<String, Any?>) ?: mapOf()
        val extractors = buildings.count { (it["type"] as? Map<*, *>)?.get("resourceGeneration") == true }
        val factories = buildings.count { (it["type"] as? Map<*, *>)?.get("produces") != null }
        val blueMass = ((resources["blue"] as? Map<String, Any?>)?.get("mass") as? Number ?: 0).toInt()
        val blueEnergy = ((resources["blue"] as? Map<String, Any?>)?.get("energy") as? Number ?: 0).toInt()
        val redMass = ((resources["red"] as? Map<String, Any?>)?.get("mass") as? Number ?: 0).toInt()
        val redEnergy = ((resources["red"] as? Map<String, Any?>)?.get("energy") as? Number ?: 0).toInt()
        val totalResources = blueMass + blueEnergy + redMass + redEnergy
        return extractors * 5 + factories * 3 + (totalResources / 100)
    }

    fun recordEvent(type: String, message: String, data: Any? = null) {
        val cb = currentBattle ?: return
        if (!isRecording) return
        val rec = mapOf(
            "time" to (cb["startTime"] as? Long ?: System.currentTimeMillis()),
            "frame" to frameCount,
            "type" to type,
            "message" to message,
            "data" to data,
            "timestamp" to System.currentTimeMillis()
        )
        @Suppress("UNCHECKED_CAST")
        val evs = cb["events"] as? MutableList<Any?>
        evs?.add(rec)
    }

    fun recordRNGState() {
        val cb = currentBattle ?: return
        if (!isRecording) return
        val rngState = try { gameRNG.getState() } catch (_: Throwable) { null }
        @Suppress("UNCHECKED_CAST")
        val rngList = cb["rngState"] as? MutableList<Any?>
        rngList?.add(mapOf("frame" to frameCount, "state" to rngState, "timestamp" to System.currentTimeMillis()))
    }

    fun recordPlayerAction(action: String, target: Any? = null, position: Any? = null) {
        if (!isRecording || currentBattle == null) return
        val cb = currentBattle!!
        @Suppress("UNCHECKED_CAST")
        val pa = cb.getOrPut("playerActions") { mutableListOf<Any?>() } as MutableList<Any?>
        pa.add(mapOf("time" to (cb["startTime"] as? Long ?: System.currentTimeMillis()), "frame" to frameCount, "action" to action, "target" to target, "position" to position, "timestamp" to System.currentTimeMillis()))
    }

    fun recordInputCommand(commandType: String, commandData: Map<String, Any?>, playerId: String = "human") {
        if (!isRecording || currentBattle == null) return
        val cb = currentBattle!!
        @Suppress("UNCHECKED_CAST")
        val cmds = cb.getOrPut("inputCommands") { mutableListOf<Any?>() } as MutableList<Any?>
        val cmd = mapOf(
            "time" to (cb["startTime"] as? Long ?: System.currentTimeMillis()),
            "frame" to frameCount,
            "playerId" to playerId,
            "commandType" to commandType,
            "commandData" to commandData.toMap(),
            "rngCallCount" to try { gameRNG.callCount } catch (_: Throwable) { 0 },
            "timestamp" to System.currentTimeMillis()
        )
        cmds.add(cmd)
        if (isRandomnessAffectingCommand(commandType)) recordRNGState()
    }

    private fun isRandomnessAffectingCommand(commandType: String): Boolean {
        val randomnessCommands = setOf("UNIT_MOVE", "UNIT_ATTACK", "BUILD_STRUCTURE", "SPAWN_UNIT", "COMBAT_RESOLVE", "PATHFIND")
        return randomnessCommands.contains(commandType)
    }

    fun stopRecording(gameOutcome: Any? = null): Any? {
        if (!isRecording || currentBattle == null) return null
    val endTime = System.currentTimeMillis()
    currentBattle?.put("endTime", endTime)
    // store outcome if provided
    gameOutcome?.let { currentBattle?.put("outcome", it) }
    val startNum = (currentBattle?.get("startTime") as? Number)?.toLong() ?: endTime
    val duration = endTime - startNum
    currentBattle?.put("duration", duration)
        isRecording = false
        val id = currentBattle?.get("id") as String?

        try {
            val serialized = serializeBattle(currentBattle ?: emptyMap())
            val saved = BattleStorage.saveBattle(id ?: "unknown", serialized)
            if (!saved) println("📹 Replay Battle Journal: Failed to persist battle $id")
        } catch (e: Throwable) {
            println("📹 Replay Battle Journal: Error persisting battle: ${e.message}")
        }

        currentBattle = null
        println("📹 Replay Battle Journal stopped - $id")
        return id
    }

    fun analyzeBattle() {
        val cb = currentBattle ?: return
        val analysis = cb.getOrPut("analysis") { mutableMapOf<String, Any?>() } as MutableMap<String, Any?>
        @Suppress("UNCHECKED_CAST")
        val snapshots = cb["stateSnapshots"] as? List<Map<String, Any?>> ?: emptyList()
        analysis["phases"] = analyzeGamePhases(snapshots)
        analysis["keyMoments"] = identifyKeyMoments(cb)
        analysis["balanceIssues"] = detectBalanceIssues(snapshots)
        analysis["playerBehavior"] = analyzePlayerBehavior(cb)
    }

    private fun analyzeGamePhases(snapshots: List<Map<String, Any?>>): List<Map<String, Any?>> {
        val phases = mutableListOf<MutableMap<String, Any?>>()
        var currentPhase: String? = null
        for (snapshot in snapshots) {
            val gp = snapshot["gamePhase"] as? String
            if (gp != currentPhase) {
                phases.add(mutableMapOf("phase" to gp, "startTime" to snapshot["time"], "economicBalance" to snapshot["economicBalance"], "militaryBalance" to snapshot["militaryBalance"]))
                currentPhase = gp
            }
        }
        return phases
    }

    private fun identifyKeyMoments(cb: MutableMap<String, Any?>): List<Map<String, Any?>> {
        @Suppress("UNCHECKED_CAST")
        val events = cb["events"] as? List<Map<String, Any?>> ?: emptyList()
        @Suppress("UNCHECKED_CAST")
        val snapshots = cb["stateSnapshots"] as? List<Map<String, Any?>> ?: emptyList()
        val key = mutableListOf<Map<String, Any?>>()
        val firstBuilding = events.find { it["type"] == "BUILDING_COMPLETED" }
        if (firstBuilding != null) key.add(mapOf("type" to "FIRST_BUILDING", "time" to firstBuilding["time"], "significance" to "high"))
        val firstCombat = events.find { it["type"] == "UNIT_DESTROYED" || it["type"] == "COMBAT_START" }
        if (firstCombat != null) key.add(mapOf("type" to "FIRST_COMBAT", "time" to firstCombat["time"], "significance" to "medium"))
        for (snapshot in snapshots) {
            val blue = ((snapshot["teamStats"] as? Map<String, Any?>)?.get("blue") as? Map<String, Any?>)
            val red = ((snapshot["teamStats"] as? Map<String, Any?>)?.get("red") as? Map<String, Any?>)
            val bTotal = ((blue?.get("resources") as? Map<String, Any?>)?.get("totalValue") as? Number ?: 0).toDouble()
            val rTotal = ((red?.get("resources") as? Map<String, Any?>)?.get("totalValue") as? Number ?: 0).toDouble()
            if (bTotal + rTotal > 1000 && key.none { it["type"] == "RESOURCE_BOOM" }) {
                key.add(mapOf("type" to "RESOURCE_BOOM", "time" to snapshot["time"], "significance" to "medium"))
            }
        }
        return key
    }

    private fun detectBalanceIssues(snapshots: List<Map<String, Any?>>): List<Map<String, Any?>> {
        val issues = mutableListOf<Map<String, Any?>>()
        for (snapshot in snapshots) {
            val econ = snapshot["economicBalance"] as? Number ?: continue
            if (abs(econ.toDouble() - 0.5) > 0.3) issues.add(mapOf("type" to "ECONOMIC_IMBALANCE", "time" to snapshot["time"], "severity" to abs(econ.toDouble() - 0.5), "favoring" to if (econ.toDouble() > 0.5) "blue" else "red"))
            val mil = snapshot["militaryBalance"] as? Number ?: continue
            if (abs(mil.toDouble() - 0.5) > 0.4) issues.add(mapOf("type" to "MILITARY_IMBALANCE", "time" to snapshot["time"], "severity" to abs(mil.toDouble() - 0.5), "favoring" to if (mil.toDouble() > 0.5) "blue" else "red"))
        }
        return issues
    }

    private fun analyzePlayerBehavior(cb: MutableMap<String, Any?>): Map<String, Any?> {
        @Suppress("UNCHECKED_CAST")
        val actions = cb["playerActions"] as? List<Map<String, Any?>> ?: emptyList()
        val durationMs = (cb["duration"] as? Number ?: 1).toDouble()
        val behavior = mutableMapOf<String, Any?>("totalActions" to actions.size, "actionsPerMinute" to (actions.size / (durationMs / 60000.0)), "actionTypes" to mutableMapOf<String, Int>(), "earlyGameFocus" to "unknown", "microManagement" to "low")
        val actionTypes = behavior["actionTypes"] as MutableMap<String, Int>
        for (a in actions) {
            val name = a["action"] as? String ?: "unknown"
            actionTypes[name] = (actionTypes[name] ?: 0) + 1
        }
        val early = actions.filter { (it["time"] as? Number ?: 0).toDouble() < 120 }
        val buildActions = early.count { (it["action"] as? String ?: "").contains("build") }
        val combatActions = early.count { (it["action"] as? String ?: "").contains("attack") }
        behavior["earlyGameFocus"] = when {
            buildActions > combatActions * 2 -> "economic"
            combatActions > buildActions -> "aggressive"
            else -> "balanced"
        }
        return behavior
    }

    private fun serializeBattle(battle: Map<String, Any?>): String {
        val simple = battle.mapValues { (_, v) ->
            when (v) {
                null -> JsonPrimitive("null")
                is String -> JsonPrimitive(v)
                is Number -> JsonPrimitive(v.toString())
                is Boolean -> JsonPrimitive(v.toString())
                is Map<*, *> -> JsonPrimitive(v.toString())
                is List<*> -> JsonPrimitive(v.toString())
                else -> JsonPrimitive(v.toString())
            }
        }
        val job = buildJsonObject {
            for ((k, pv) in simple) put(k, pv)
        }
        return json.encodeToString(job)
    }

    fun saveBattleToStorage() {
        val cb = currentBattle ?: return
        try {
            val serialized = serializeBattle(cb)
            val id = cb["id"] as? String ?: return
            BattleStorage.saveBattle(id, serialized)
        } catch (_: Throwable) {}
    }

    fun getBattleIndex(): List<Map<String, Any?>> {
        return try {
            val raw = BattleStorage.listBattles()
            raw.map { mapOf("id" to it) }
        } catch (_: Throwable) { emptyList() }
    }

    fun loadBattle(battleId: String): Map<String, Any?>? {
        return try {
            val s = BattleStorage.loadBattle(battleId) ?: return null
            mapOf("id" to battleId, "raw" to s)
        } catch (_: Throwable) { null }
    }

    fun deleteBattle(battleId: String): Boolean {
        return try {
            BattleStorage.saveBattle(battleId, "")
        } catch (_: Throwable) { false }
    }

    fun exportBattleData(battleId: String, format: String = "json"): String? {
        val b = loadBattle(battleId) ?: return null
        val raw = b["raw"] as? String ?: return null
        if (format == "csv") return convertToCSV(raw)
        return raw
    }

    private fun convertToCSV(rawJson: String): String {
        return "data\n" + rawJson.replace('\n', ' ')
    }

    fun generateBattleReport(battleId: String): Map<String, Any?>? {
        val b = loadBattle(battleId) ?: return null
        return mapOf("battleId" to battleId, "raw" to b["raw"])
    }

    fun getFrameAtTime(time: Number): Any? {
        val t = time.toDouble()
        val found = frames.mapNotNull { it as? Map<*, *> }.find { ((it["time"] as? Number)?.toDouble() ?: Double.NEGATIVE_INFINITY) >= t }
        return found ?: frames.lastOrNull()
    }

    fun getEventsAtTime(time: Number): List<Any> {
        val t = time.toDouble()
        return events.mapNotNull { it as? Map<*, *> }.filter { ((it["time"] as? Number)?.toDouble() ?: Double.NEGATIVE_INFINITY) <= t }
    }

    fun getDuration(): Number = if (frames.isEmpty()) 0 else ((frames.last() as? Map<*, *>)?.get("time") as? Number)?.toDouble() ?: 0

    private fun compressBattleData() {
        @Suppress("UNCHECKED_CAST")
        val f = currentBattle?.get("frames") as? MutableList<MutableMap<String, Any?>> ?: return
        val kept = f.filterIndexed { idx, _ -> idx % 2 == 0 }
        currentBattle?.put("frames", kept.toMutableList())
    }

    private fun cleanupOldBattles() {
        val idx = getBattleIndex()
        val toRemove = max(1, idx.size / 3)
        for (i in 0 until toRemove) {
            val id = idx.getOrNull(i)?.get("id") as? String ?: continue
            deleteBattle(id)
        }
    }

    private fun checkStorageUsage() {
        // noop in common code
    }

    companion object {
        val instance = ReplayBattleJournal()
    }
}
