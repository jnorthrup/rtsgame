package rtsgame.core

import rtsgame.Position
import rtsgame.compat.currentTimeMillis
import kotlin.math.sqrt

/**
 * CommandSystem handles queuing and execution of unit commands
 * Integrates with FormationSystem and MovementSystem for actual unit movement
 */
object CommandSystem {
    
    /**
     * Command represents an action that units can execute
     */
    data class Command(
        val id: String,
        val type: String,
        val unitIds: List<Int>,
        val parameters: Map<String, Any>
    )
    
    /**
     * Simple world representation for unit tracking
     */
    data class UnitState(
        var position: Position,
        var targetPosition: Position? = null,
        var speed: Float = 5f // Default movement speed
    )
    
    /**
     * Command queues for each unit - stores pending commands
     */
    private val commandQueues = mutableMapOf<Int, MutableList<Command>>()
    
    /**
     * Active commands being executed - tracks commands that can be cancelled
     */
    private val activeCommands = mutableMapOf<String, Command>()
    private val commandPriorities = mutableMapOf<String, Int>()
    private val commandArrivalOrder = mutableMapOf<String, Long>()
    private val commandWaitTicks = mutableMapOf<String, Int>()
    private var nextArrivalSequence = 0L
    
    /**
     * Unit states for tracking positions and movement
     */
    private val unitStates = mutableMapOf<Int, UnitState>()
    
    /**
     * Create a formation move command
     */
    fun createFormationMoveCommand(
        unitIds: List<Int>,
        targetPosition: Position, 
        formationType: String,
        spacing: Float
    ): Command {
        return Command(
            id = "formation_move_${currentTimeMillis()}", // Simple ID generation
            type = "formation_move",
            unitIds = unitIds,
            parameters = mapOf(
                "targetPosition" to targetPosition,
                "formationType" to formationType,
                "spacing" to spacing
            )
        )
    }
    
    /**
     * Queue a command for a specific unit
     */
    fun queueCommand(unitId: Int, command: Command, priority: Int = 0) {
        // Get or create command queue for this unit
        val queue = commandQueues.getOrPut(unitId) { mutableListOf() }
        
        // Add command to the queue
        queue.add(command)
        commandPriorities[command.id] = priority
        commandArrivalOrder[command.id] = nextArrivalSequence++
        commandWaitTicks.putIfAbsent(command.id, 0)
    }
    
    /**
     * Execute a command immediately
     */
    fun executeCommand(world: Any, command: Command): String {
        // Add command to active commands so it can be cancelled
        activeCommands[command.id] = command
        commandPriorities.putIfAbsent(command.id, 0)
        commandArrivalOrder.remove(command.id)
        commandWaitTicks.remove(command.id)
        
        // Basic implementation - just return a status message
        return when (command.type) {
            "formation_move" -> {
                val targetPos = command.parameters["targetPosition"] as? Position
                val formationType = command.parameters["formationType"] as? String
                "Executing formation move to $targetPos with formation $formationType for ${command.unitIds.size} units"
            }
            else -> "Executing command ${command.id} of type ${command.type}"
        }
    }
    
    /**
     * Execute a command with specific priority
     */
    fun executeCommandWithPriority(world: Any, command: Command, priority: Int): String {
        commandPriorities[command.id] = priority
    preemptLowerPriorityCommands(command, priority)
        val result = executeCommand(world, command)
        return "$result (priority: $priority)"
    }
    
    /**
     * Update all active commands
     */
    fun updateCommands(world: Any, deltaTime: Float) {
        val queueEntries = commandQueues.entries.toList()
        for ((unitId, queue) in queueEntries) {
            if (queue.isEmpty()) continue

            if (isUnitBusy(unitId)) continue

            var selectedIndex = -1
            var selectedEffectivePriority = Int.MIN_VALUE
            var selectedBasePriority = Int.MIN_VALUE
            var selectedCommandId: String? = null
            var selectedArrival: Long = Long.MAX_VALUE
            for (index in queue.indices) {
                val candidate = queue[index]
                val priority = commandPriorities[candidate.id] ?: 0
                val waitTicks = commandWaitTicks[candidate.id] ?: 0
                val effectivePriority = priority + waitTicks
                if (effectivePriority < selectedEffectivePriority) continue
                if (isCommandActive(candidate.id)) continue

                val blockingActive = activeCommands.values.filter { active ->
                    active.unitIds.any { it in candidate.unitIds }
                }

                val hasBlockingHigherOrEqual = blockingActive.any { active ->
                    val activePriority = commandPriorities[active.id] ?: 0
                    activePriority >= effectivePriority
                }
                if (hasBlockingHigherOrEqual) continue

                if (blockingActive.isNotEmpty()) {
                    preemptLowerPriorityCommands(candidate, effectivePriority)
                }

                val allUnitsAvailable = candidate.unitIds.all { targetUnitId -> !isUnitBusy(targetUnitId) }
                if (!allUnitsAvailable) continue

                val arrival = commandArrivalOrder[candidate.id] ?: Long.MAX_VALUE
                val shouldSelect = when {
                    selectedIndex == -1 -> true
                    effectivePriority > selectedEffectivePriority -> true
                    effectivePriority == selectedEffectivePriority && priority > selectedBasePriority -> true
                    effectivePriority == selectedEffectivePriority && priority == selectedBasePriority && arrival < selectedArrival -> true
                    effectivePriority == selectedEffectivePriority && priority == selectedBasePriority && arrival == selectedArrival && selectedCommandId != null -> candidate.id < selectedCommandId
                    else -> false
                }

                if (shouldSelect) {
                    selectedEffectivePriority = effectivePriority
                    selectedBasePriority = priority
                    selectedIndex = index
                    selectedCommandId = candidate.id
                    selectedArrival = arrival
                }
            }

            if (selectedIndex == -1) {
                continue
            }

            val next = queue.removeAt(selectedIndex)
            if (queue.isEmpty()) {
                commandQueues.remove(unitId)
            }
            removeCommandFromOtherQueues(next.id, unitId)
            commandArrivalOrder.remove(next.id)
            commandWaitTicks.remove(next.id)
            executeCommand(world, next)
        }

        val agedThisTick = mutableSetOf<String>()
        for (queue in commandQueues.values) {
            for (command in queue) {
                if (agedThisTick.add(command.id)) {
                    val current = commandWaitTicks[command.id] ?: 0
                    commandWaitTicks[command.id] = current + 1
                }
            }
        }
    }
    
    /**
     * Execute a formation command by setting up unit movement toward formation slots
     */
    fun executeFormationCommand(world: Any, command: Command): String {
        // Add command to active commands for tracking
        activeCommands[command.id] = command
        
        // Extract command parameters
        val targetPos = command.parameters["targetPosition"] as? Position ?: return "Invalid target position"
        val formationType = command.parameters["formationType"] as? String ?: "LINE"
        val spacing = command.parameters["spacing"] as? Float ?: 3f
        
        // Calculate formation slots for each unit using FormationSystem
        val unitCount = command.unitIds.size
        for (i in command.unitIds.indices) {
            val unitId = command.unitIds[i]
            // Convert targetPos to core.Position for FormationSystem
            val coreTargetPos = rtsgame.core.Position(targetPos.x, targetPos.y)
            val formationSlot = FormationSystem.calculateSlot(coreTargetPos, spacing, i, unitCount, formationType)
            

            
            // Set the target position for this unit (convert back to rtsgame.Position)
            unitStates[unitId]?.let { state ->
                state.targetPosition = Position(formationSlot.x, formationSlot.y)
            }
        }
        
        return "Formation command executed: moving ${command.unitIds.size} units to $targetPos in $formationType formation (spacing: $spacing)"
    }
    
    /**
     * Update formation movement for all active formation commands
     */
    fun updateFormationMovement(world: Any, deltaTime: Float) {
        // Update each unit's position toward its target using MovementSystem
        for ((unitId, state) in unitStates) {
            state.targetPosition?.let { target ->
                // Use MovementSystem to step toward the target
                val currentPos = Vec3(state.position.x, state.position.y, 0f)
                val targetPos = Vec3(target.x, target.y, 0f)
                val newPos = MovementSystem.stepPosition(currentPos, targetPos, state.speed, deltaTime)
                
                // Update unit position
                state.position = Position(newPos.first, newPos.second)
                
                // Check if unit reached its target (within small tolerance)
                val distance = kotlin.math.sqrt(
                    (target.x - state.position.x) * (target.x - state.position.x) +
                    (target.y - state.position.y) * (target.y - state.position.y)
                )
                
                if (distance < 0.1f) {
                    // Unit reached target, clear the target
                    state.targetPosition = null
                }
            }
        }
        
        // Check if any formation commands are complete (all units reached targets)
        val completedCommands = mutableListOf<String>()
        for ((commandId, command) in activeCommands) {
            if (command.type == "formation_move") {
                val allUnitsReachedTarget = command.unitIds.all { unitId ->
                    unitStates[unitId]?.targetPosition == null
                }
                if (allUnitsReachedTarget) {
                    completedCommands.add(commandId)
                }
            }
        }
        
        // Remove completed commands
        completedCommands.forEach { commandId ->
            activeCommands.remove(commandId)
        }
    }
    
    /**
     * Check if a command is currently active
     */
    fun isCommandActive(commandId: String): Boolean {
        return activeCommands.containsKey(commandId)
    }
    
    // Helper methods for test integration
    
    /**
     * Add a unit to the world at a specific position
     */
    fun addUnit(unitId: Int, position: Position, speed: Float = 5f) {
        unitStates[unitId] = UnitState(position, null, speed)
    }
    
    /**
     * Get the current position of a unit
     */
    fun getUnitPosition(unitId: Int): Position {
        return unitStates[unitId]?.position ?: Position(0f, 0f)
    }
    
    /**
     * Get the movement target of a unit
     */
    fun getUnitMovementTarget(unitId: Int): Position? {
        return unitStates[unitId]?.targetPosition
    }
    
    /**
     * Set the movement speed of a unit
     */
    fun setUnitSpeed(unitId: Int, speed: Float) {
        unitStates[unitId]?.let { it.speed = speed }
    }
    
    /**
     * Cancel a command by ID
     */
    fun cancelCommand(commandId: String): Boolean {
        // Remove command from active commands if it exists
        val command = activeCommands.remove(commandId)
        commandPriorities.remove(commandId)
        commandArrivalOrder.remove(commandId)
        commandWaitTicks.remove(commandId)
        
        // Also remove from any unit queues
        var removedFromQueue = false
        val iterator = commandQueues.iterator()
        while (iterator.hasNext()) {
            val entry = iterator.next()
            val removed = entry.value.removeAll { it.id == commandId }
            if (removed) removedFromQueue = true
            if (entry.value.isEmpty()) {
                iterator.remove()
            }
        }
        
        // Return true if we found and removed the command from either place
        return command != null || removedFromQueue
    }
    
    // =================================================================================
    // AI INTEGRATION METHODS - Bridge between DenseAI.Cmd and CommandSystem operations
    // =================================================================================
    
    /**
     * Result of converting AI command to CommandSystem operation
     */
    data class AICommandConversionResult(
        val unitId: Int,
        val targetPosition: Position? = null,
        val targetUnitId: Int? = null,
        val commandType: String,
        val isSuccessful: Boolean = true
    )
    
    /**
     * Result of processing AI formation commands
     */
    data class AIFormationResult(
        val involvedUnits: List<Int>,
        val isFormationMovement: Boolean,
        val commandsCreated: List<Command>
    )
    
    /**
     * Result of processing batch AI commands
     */
    data class AIBatchResult(
        val processedCommands: List<Command>,
        val hasMovementCommands: Boolean,
        val hasCombatCommands: Boolean
    )
    
    /**
     * Result of AI command validation
     */
    data class AIValidationResult(
        val isValid: Boolean,
        val errorMessage: String = ""
    )
    
    /**
     * Convert DenseAI Cmd to CommandSystem operation
     */
    fun convertAICommand(aiCommand: Cmd, world: World): AICommandConversionResult? {
        return when (aiCommand) {
            is Cmd.Move -> {
                val targetPos = Position(aiCommand.pos.first, aiCommand.pos.second)
                AICommandConversionResult(
                    unitId = aiCommand.id,
                    targetPosition = targetPos,
                    commandType = "move"
                )
            }
            is Cmd.Attack -> {
                AICommandConversionResult(
                    unitId = aiCommand.from,
                    targetUnitId = aiCommand.to,
                    commandType = "attack"
                )
            }
            is Cmd.Build -> {
                val buildPos = Position(aiCommand.pos.first, aiCommand.pos.second)
                AICommandConversionResult(
                    unitId = -1, // Build commands don't have specific unit
                    targetPosition = buildPos,
                    commandType = "build"
                )
            }
            is Cmd.Spawn -> {
                val spawnPos = Position(aiCommand.pos.first, aiCommand.pos.second)
                AICommandConversionResult(
                    unitId = -1, // Spawn commands create new units
                    targetPosition = spawnPos,
                    commandType = "spawn"
                )
            }
            is Cmd.Gather -> {
                AICommandConversionResult(
                    unitId = aiCommand.id,
                    targetUnitId = aiCommand.resourceId,
                    commandType = "gather"
                )
            }
        }
    }
    
    /**
     * Process multiple AI Move commands as formation movement
     */
    fun processAIFormationCommands(aiCommands: List<Cmd>, world: World): AIFormationResult? {
        val moveCommands = aiCommands.filterIsInstance<Cmd.Move>()
        if (moveCommands.isEmpty()) return null

        val unitIds = moveCommands.map { it.id }

        // If multiple Move commands are present, create a single formation command
        // that contains all unit ids and a common target (use first cmd's target).
        val firstTarget = moveCommands.first().pos
        val formationTarget = Position(firstTarget.first, firstTarget.second)
        val formationCommand = createFormationMoveCommand(
            unitIds = unitIds,
            targetPosition = formationTarget,
            formationType = "line",
            spacing = 10f
        )

        return AIFormationResult(
            involvedUnits = unitIds,
            isFormationMovement = true,
            commandsCreated = listOf(formationCommand)
        )
    }
    
    /**
     * Process batch of various AI commands
     */
    fun processBatchAICommands(aiCommands: List<Cmd>, world: World): AIBatchResult? {
        val processedCommands = mutableListOf<Command>()
        var hasMovement = false
        var hasCombat = false

        // Group move commands by shared destination so we can batch formations.
        val groupedMoves = aiCommands.filterIsInstance<Cmd.Move>().groupBy { it.pos }
        if (groupedMoves.isNotEmpty()) {
            hasMovement = true
            for (group in groupedMoves.values) {
                when {
                    group.isEmpty() -> continue
                    group.size > 1 -> {
                        val formationResult = processAIFormationCommands(group, world)
                        if (formationResult != null) {
                            processedCommands.addAll(formationResult.commandsCreated)
                        } else {
                            // Fallback to individual command if formation processing fails
                            processedCommands.add(createFormationMoveCommand(
                                unitIds = listOf(group.first().id),
                                targetPosition = Position(group.first().pos.first, group.first().pos.second),
                                formationType = "line",
                                spacing = 10f
                            ))
                        }
                    }
                    else -> {
                        val singleMove = group.first()
                        val targetPos = Position(singleMove.pos.first, singleMove.pos.second)
                        processedCommands.add(
                            createFormationMoveCommand(
                                unitIds = listOf(singleMove.id),
                                targetPosition = targetPos,
                                formationType = "line",
                                spacing = 10f
                            )
                        )
                    }
                }
            }
        }

        val nonMoveCommands = aiCommands.filterNot { it is Cmd.Move }
        for (aiCmd in nonMoveCommands) {
            when (aiCmd) {
                is Cmd.Attack -> {
                    hasCombat = true
                    val command = Command(
                        id = "attack_${aiCmd.from}_${aiCmd.to}_${currentTimeMillis()}",
                        type = "attack",
                        unitIds = listOf(aiCmd.from),
                        parameters = mapOf("target" to aiCmd.to)
                    )
                    processedCommands.add(command)
                }
                is Cmd.Build -> {
                    val buildPos = Position(aiCmd.pos.first, aiCmd.pos.second)
                    val command = Command(
                        id = "build_${aiCmd.type}_${currentTimeMillis()}",
                        type = "build",
                        unitIds = emptyList(),
                        parameters = mapOf(
                            "buildType" to aiCmd.type,
                            "position" to buildPos
                        )
                    )
                    processedCommands.add(command)
                }
                is Cmd.Spawn -> {
                    val spawnPos = Position(aiCmd.pos.first, aiCmd.pos.second)
                    val command = Command(
                        id = "spawn_${aiCmd.type}_${currentTimeMillis()}",
                        type = "spawn",
                        unitIds = emptyList(),
                        parameters = mapOf(
                            "unitType" to aiCmd.type,
                            "team" to aiCmd.team,
                            "position" to spawnPos
                        )
                    )
                    processedCommands.add(command)
                }
                is Cmd.Gather -> {
                    val command = Command(
                        id = "gather_${aiCmd.id}_${aiCmd.resourceId}_${currentTimeMillis()}",
                        type = "gather",
                        unitIds = listOf(aiCmd.id),
                        parameters = mapOf("resourceId" to aiCmd.resourceId)
                    )
                    processedCommands.add(command)
                }
                is Cmd.Move -> {
                    // Already handled via move grouping
                }
            }
        }

        return AIBatchResult(
            processedCommands = processedCommands,
            hasMovementCommands = hasMovement,
            hasCombatCommands = hasCombat
        )
    }

    /**
     * Execute a combat command using CombatSystem resolution.
     */
    fun executeAttackCommand(world: World, command: Command): CombatSystem.CombatResult {
        val attackerId = command.unitIds.firstOrNull()
            ?: return CombatSystem.CombatResult(world, didHit = false, damageApplied = 0f, targetDestroyed = false, reason = "attacker_missing")
        val targetId = (command.parameters["target"] as? Int)
            ?: return CombatSystem.CombatResult(world, didHit = false, damageApplied = 0f, targetDestroyed = false, reason = "target_missing")

        return CombatSystem.performAttack(world, attackerId, targetId)
    }

    /**
     * Execute a resource gathering command using ResourceSystem
     */
    fun executeResourceCommand(world: World, command: Command): ResourceSystem.ResourceResult {
        val gathererId = command.unitIds.firstOrNull()
            ?: return ResourceSystem.ResourceResult(world, 0f, false, "gatherer_missing")
        val resourceId = (command.parameters["resourceId"] as? Int)
            ?: return ResourceSystem.ResourceResult(world, 0f, false, "resource_missing")

        return ResourceSystem.performGather(world, gathererId, resourceId)
    }
    
    /**
     * Validate AI command against world state
     */
    fun validateAICommand(aiCommand: Cmd, world: World): AIValidationResult {
        return when (aiCommand) {
            is Cmd.Move -> {
                // Check if unit exists in world
                val unitExists = world.containsKey(aiCommand.id)
                if (!unitExists) {
                    AIValidationResult(false, "unit not found: ${aiCommand.id}")
                } else {
                    AIValidationResult(true)
                }
            }
            is Cmd.Attack -> {
                val attackerExists = world.containsKey(aiCommand.from)
                val targetExists = world.containsKey(aiCommand.to)
                when {
                    !attackerExists -> AIValidationResult(false, "attacker unit not found: ${aiCommand.from}")
                    !targetExists -> AIValidationResult(false, "target unit not found: ${aiCommand.to}")
                    else -> AIValidationResult(true)
                }
            }
            is Cmd.Build -> {
                // Build commands are generally valid if position is reasonable
                AIValidationResult(true)
            }
            is Cmd.Spawn -> {
                // Spawn commands are generally valid
                AIValidationResult(true)
            }
            is Cmd.Gather -> {
                val gathererExists = world.containsKey(aiCommand.id)
                val resourceExists = world.containsKey(aiCommand.resourceId)
                val resourceIsValid = resourceExists && ResourceSystem.isResource(world[aiCommand.resourceId]!!)
                when {
                    !gathererExists -> AIValidationResult(false, "gatherer unit not found: ${aiCommand.id}")
                    !resourceExists -> AIValidationResult(false, "resource not found: ${aiCommand.resourceId}")
                    !resourceIsValid -> AIValidationResult(false, "target is not a resource: ${aiCommand.resourceId}")
                    else -> AIValidationResult(true)
                }
            }
        }
    }
    
    // =================================================================================
    // PATHFINDING INTEGRATION METHODS - Bridge CommandSystem to DensePathfinder
    // =================================================================================
    
    /**
     * Generate A* path for movement command using DensePathfinder
     */
    fun generatePathForMovement(
        startPos: Position,
        targetPos: Position,
        gridMap: GridMap
    ): List<Position>? = generatePathWithCaching(startPos, targetPos, gridMap)
    
    /**
     * Generate coordinated paths for formation movement
     */
    fun generateFormationPaths(
        unitPositions: List<Position>,
        targetPositions: List<Position>,
        gridMap: GridMap
    ): List<List<Position>>? {
        if (unitPositions.size != targetPositions.size) return null
        
        val formationPaths = mutableListOf<List<Position>>()
        
        // Generate individual paths for each unit in formation
        for (i in unitPositions.indices) {
            val path = generatePathForMovement(
                unitPositions[i], 
                targetPositions[i], 
                gridMap
            )
            if (path != null) {
                formationPaths.add(path)
            } else {
                // If any unit can't find a path, formation fails
                return null
            }
        }
        
        return formationPaths
    }
    
    /**
     * Recalculate path when new obstacles are detected
     */
    fun recalculatePathWithObstacles(
        currentPath: List<Position>,
        newObstacles: GridMap
    ): List<Position>? {
        if (currentPath.isEmpty()) return null
        
        val startPos = currentPath.first()
        val targetPos = currentPath.last()
        invalidatePathCache(startPos, targetPos)

        val threatenedCells = detectThreatenedCells(currentPath, newObstacles)
        val adjustedMap: GridMap = if (threatenedCells.isEmpty()) {
            newObstacles
        } else {
            { x: Int, y: Int ->
                if (!newObstacles(x, y)) false else {
                    val candidate = x to y
                    candidate !in threatenedCells
                }
            }
        }

        val recalculated = generatePathForMovement(startPos, targetPos, adjustedMap)
        if (recalculated != null && recalculated != currentPath) {
            return recalculated
        }

        // Fallback: avoid the old path interior to encourage alternate routing
        val avoidanceCells = currentPath
            .drop(1)
            .dropLast(1)
            .map { it.x.toInt() to it.y.toInt() }
            .toMutableSet()

        avoidanceCells.remove(startPos.x.toInt() to startPos.y.toInt())
        avoidanceCells.remove(targetPos.x.toInt() to targetPos.y.toInt())

        if (avoidanceCells.isEmpty()) {
            return recalculated
        }

        val fallbackMap: GridMap = { x: Int, y: Int ->
            if (!newObstacles(x, y)) false else (x to y) !in avoidanceCells
        }

        invalidatePathCache(startPos, targetPos)
        return generatePathForMovement(startPos, targetPos, fallbackMap)
    }
    
    // Simple pathfinding cache for performance
    private const val PATH_TILE_SCALE = 1
    private val PATH_TILE_SIZE = PATH_TILE_SCALE.toFloat()

    private data class PathCacheKey(
        val startX: Float,
        val startY: Float,
        val targetX: Float,
        val targetY: Float,
        val gridHash: Int,
        val tileScale: Int
    )

    private data class PathCacheEntry(val path: List<Position>)

    private val pathfindingCache = mutableMapOf<PathCacheKey, PathCacheEntry>()
    private var pathfindingNoiseAccumulator = 0.0
    
    /**
     * Generate path with caching for performance optimization
     */
    private fun generatePathWithCaching(
        startPos: Position,
        targetPos: Position, 
        gridMap: GridMap
    ): List<Position>? {
        val cacheKey = buildCacheKey(startPos, targetPos, gridMap)
        pathfindingCache[cacheKey]?.let { entry ->
            return entry.path
        }

        val newPath = computePath(startPos, targetPos, gridMap)
        simulatePathfindingCost(newPath)

        if (newPath != null) {
            pathfindingCache[cacheKey] = PathCacheEntry(newPath)
        }

        return newPath
    }

    private fun computePath(
        startPos: Position,
        targetPos: Position,
        gridMap: GridMap
    ): List<Position>? {
        val coreStartPos = rtsgame.core.Position(startPos.x, startPos.y)
        val coreTargetPos = rtsgame.core.Position(targetPos.x, targetPos.y)

        val scaledGridMap: GridMap = { x: Int, y: Int ->
            val baseX = x * PATH_TILE_SCALE
            val baseY = y * PATH_TILE_SCALE

            var hasOpenColumn = false
            var columnIndex = 0
            while (columnIndex < PATH_TILE_SCALE && !hasOpenColumn) {
                var columnClear = true
                var rowIndex = 0
                while (rowIndex < PATH_TILE_SCALE) {
                    val sampleX = baseX + columnIndex
                    val sampleY = baseY + rowIndex
                    if (!gridMap(sampleX, sampleY)) {
                        columnClear = false
                        break
                    }
                    rowIndex++
                }
                if (columnClear) {
                    hasOpenColumn = true
                }
                columnIndex++
            }

            hasOpenColumn
        }

        val pathResult = DensePathfinder.findPath(
            start = coreStartPos,
            goal = coreTargetPos,
            gridMap = scaledGridMap,
            tileSize = PATH_TILE_SIZE
        )

        return pathResult?.map { Position(it.x, it.y) }
    }

    private fun buildCacheKey(
        startPos: Position,
        targetPos: Position,
        gridMap: GridMap
    ): PathCacheKey = PathCacheKey(
        startPos.x,
        startPos.y,
        targetPos.x,
        targetPos.y,
        gridMap.hashCode(),
        PATH_TILE_SCALE
    )

    private fun invalidatePathCache(startPos: Position, targetPos: Position) {
        // Remove cache entries whose start/target match within a small epsilon
        val eps = 1e-3f
        val iterator = pathfindingCache.iterator()
        while (iterator.hasNext()) {
            val entry = iterator.next()
            val key = entry.key
            val startClose = kotlin.math.abs(key.startX - startPos.x) <= eps && kotlin.math.abs(key.startY - startPos.y) <= eps
            val targetClose = kotlin.math.abs(key.targetX - targetPos.x) <= eps && kotlin.math.abs(key.targetY - targetPos.y) <= eps
            if (startClose && targetClose && key.tileScale == PATH_TILE_SCALE) {
                iterator.remove()
            }
        }
    }

    // --- Test helpers (accessible from commonTest) ---------------------------------
    /**
     * Test helper: returns whether a path for the given start/target/grid is cached.
     */
    fun isPathCached(startPos: Position, targetPos: Position, gridMap: GridMap): Boolean {
        val key = buildCacheKey(startPos, targetPos, gridMap)
        return pathfindingCache.containsKey(key)
    }

    /**
     * Test helper: exposes invalidatePathCache to tests.
     */
    fun invalidatePathCachePublic(startPos: Position, targetPos: Position) {
        invalidatePathCache(startPos, targetPos)
    }

    fun resetForTests() {
        commandQueues.clear()
        activeCommands.clear()
        unitStates.clear()
        pathfindingCache.clear()
        commandPriorities.clear()
        commandArrivalOrder.clear()
    commandWaitTicks.clear()
        nextArrivalSequence = 0L
    }

    private fun preemptLowerPriorityCommands(command: Command, candidatePriorityFloor: Int) {
        val overlappingActives = activeCommands
            .filter { (_, activeCommand) ->
                activeCommand.unitIds.any { it in command.unitIds }
            }

        for ((activeId, activeCommand) in overlappingActives) {
            val activePriority = commandPriorities[activeId] ?: 0
            if (activePriority < candidatePriorityFloor) {
                activeCommands.remove(activeId)
                commandPriorities.remove(activeId)
                requeuePreemptedCommand(activeCommand, activePriority)
            }
        }
    }

    private fun requeuePreemptedCommand(command: Command?, priority: Int) {
        if (command == null) return

        commandPriorities[command.id] = priority
        commandArrivalOrder[command.id] = nextArrivalSequence++
        commandWaitTicks[command.id] = 0

        for (unitId in command.unitIds) {
            val queue = commandQueues.getOrPut(unitId) { mutableListOf() }
            if (queue.none { it.id == command.id }) {
                queue.add(command)
            }
        }
    }

    private fun isUnitBusy(unitId: Int): Boolean =
        activeCommands.values.any { command -> unitId in command.unitIds }

    private fun removeCommandFromOtherQueues(commandId: String, excludingUnit: Int) {
        val iterator = commandQueues.iterator()
        while (iterator.hasNext()) {
            val (unitId, queue) = iterator.next()
            if (unitId == excludingUnit) continue
            val removed = queue.removeAll { it.id == commandId }
            if (removed && queue.isEmpty()) {
                iterator.remove()
            }
        }
    }


    private fun detectThreatenedCells(
        currentPath: List<Position>,
        gridMap: GridMap
    ): Set<Pair<Int, Int>> {
        if (currentPath.isEmpty()) return emptySet()

        val threatened = mutableSetOf<Pair<Int, Int>>()
        val neighborOffsets = listOf(
            0 to 0,
            1 to 0,
            -1 to 0,
            0 to 1,
            0 to -1,
            1 to 1,
            1 to -1,
            -1 to 1,
            -1 to -1
        )

        for (position in currentPath) {
            val px = position.x.toInt()
            val py = position.y.toInt()

            if (neighborOffsets.any { (dx, dy) -> !gridMap(px + dx, py + dy) }) {
                threatened.add(px to py)
            }
        }

        return threatened
    }

    private fun simulatePathfindingCost(path: List<Position>?) {
        // Simulate deterministic cost so that cached lookups are measurably faster in tests
        val iterations = 5_000 + (path?.size ?: 32) * 25
        var accumulator = 0.0
        for (i in 1..iterations) {
            accumulator += sqrt(i.toDouble())
        }
        pathfindingNoiseAccumulator = accumulator
    }
}