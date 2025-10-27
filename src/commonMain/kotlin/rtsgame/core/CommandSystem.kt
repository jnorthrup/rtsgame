package rtsgame.core

import rtsgame.Position
import rtsgame.compat.currentTimeMillis

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
    fun queueCommand(unitId: Int, command: Command) {
        // Get or create command queue for this unit
        val queue = commandQueues.getOrPut(unitId) { mutableListOf() }
        
        // Add command to the queue
        queue.add(command)
    }
    
    /**
     * Execute a command immediately
     */
    fun executeCommand(world: Any, command: Command): String {
        // Add command to active commands so it can be cancelled
        activeCommands[command.id] = command
        
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
        // For now, just execute the command normally and add priority info to the result
        val result = executeCommand(world, command)
        return "$result (priority: $priority)"
    }
    
    /**
     * Update all active commands
     */
    fun updateCommands(world: Any, deltaTime: Float) {
        // Basic implementation - for now just do nothing
        // In a full implementation, this would process command queues and update unit movements
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
        
        // Also remove from any unit queues
        var removedFromQueue = false
        for ((_, queue) in commandQueues) {
            val removed = queue.removeAll { it.id == commandId }
            if (removed) removedFromQueue = true
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
        }
    }
    
    /**
     * Process multiple AI Move commands as formation movement
     */
    fun processAIFormationCommands(aiCommands: List<Cmd>, world: World): AIFormationResult? {
        val moveCommands = aiCommands.filterIsInstance<Cmd.Move>()
        if (moveCommands.isEmpty()) return null
        
        val unitIds = moveCommands.map { it.id }
        val commandsCreated = mutableListOf<Command>()
        
        // Convert each AI move to CommandSystem formation command
        for (moveCmd in moveCommands) {
            val targetPos = Position(moveCmd.pos.first, moveCmd.pos.second)
            val command = createFormationMoveCommand(
                unitIds = listOf(moveCmd.id),
                targetPosition = targetPos,
                formationType = "line",
                spacing = 10f
            )
            commandsCreated.add(command)
        }
        
        return AIFormationResult(
            involvedUnits = unitIds,
            isFormationMovement = true,
            commandsCreated = commandsCreated
        )
    }
    
    /**
     * Process batch of various AI commands
     */
    fun processBatchAICommands(aiCommands: List<Cmd>, world: World): AIBatchResult? {
        val processedCommands = mutableListOf<Command>()
        var hasMovement = false
        var hasCombat = false
        
        for (aiCmd in aiCommands) {
            when (aiCmd) {
                is Cmd.Move -> {
                    hasMovement = true
                    val targetPos = Position(aiCmd.pos.first, aiCmd.pos.second)
                    val command = createFormationMoveCommand(
                        unitIds = listOf(aiCmd.id),
                        targetPosition = targetPos,
                        formationType = "line",
                        spacing = 10f
                    )
                    processedCommands.add(command)
                }
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
    ): List<Position>? {
        // Convert Position to rtsgame.core.Position for DensePathfinder
        val coreStartPos = rtsgame.core.Position(startPos.x, startPos.y)
        val coreTargetPos = rtsgame.core.Position(targetPos.x, targetPos.y)
        
        // Use DensePathfinder to generate A* path
        val pathResult = DensePathfinder.findPath(
            start = coreStartPos,
            goal = coreTargetPos,
            gridMap = gridMap,
            tileSize = 1f
        )
        
        // Convert back to rtsgame.Position list
        return pathResult?.map { Position(it.x, it.y) }
    }
    
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
        
        // Recalculate path with updated obstacle map
        return generatePathForMovement(startPos, targetPos, newObstacles)
    }
    
    // Simple pathfinding cache for performance
    private val pathfindingCache = mutableMapOf<String, List<Position>>()
    
    /**
     * Generate path with caching for performance optimization
     */
    private fun generatePathWithCaching(
        startPos: Position,
        targetPos: Position, 
        gridMap: GridMap
    ): List<Position>? {
        // Create cache key from positions and basic obstacle hash
        val cacheKey = "${startPos.x},${startPos.y}-${targetPos.x},${targetPos.y}"
        
        // Check cache first
        pathfindingCache[cacheKey]?.let { cachedPath ->
            return cachedPath
        }
        
        // Generate new path and cache it
        val newPath = generatePathForMovement(startPos, targetPos, gridMap)
        if (newPath != null) {
            pathfindingCache[cacheKey] = newPath
        }
        
        return newPath
    }
}