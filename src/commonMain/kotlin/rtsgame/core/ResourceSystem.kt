package rtsgame.core

/**
 * ResourceSystem handles resource gathering, storage, and economic mechanics
 */
object ResourceSystem {

    data class ResourceResult(
        val updatedWorld: World,
        val resourcesGathered: Float,
        val success: Boolean,
        val reason: String = ""
    )

    data class ResourceInfo(
        val type: String,
        val amount: Float,
        val maxAmount: Float,
        val gatherRate: Float
    )

    /**
     * Perform resource gathering action
     */
    fun performGather(
        world: World,
        gathererId: EntityId,
        resourceId: EntityId
    ): ResourceResult {
        val gatherer = world[gathererId]
            ?: return ResourceResult(world, 0f, false, "gatherer_missing")
        val resource = world[resourceId]
            ?: return ResourceResult(world, 0f, false, "resource_missing")

        if (!isResource(resource)) {
            return ResourceResult(world, 0f, false, "invalid_resource")
        }

        // Check if resource has resources left
        val resourceInfo = getResourceInfo(resource)
        if (resourceInfo.amount <= 0f) {
            return ResourceResult(world, 0f, false, "resource_depleted")
        }

        // Check if gatherer is in range
        val gathererPos = gatherer.get<Pos>("pos")?.vec
        val resourcePos = resource.get<Pos>("pos")?.vec
        val gatherRange = 2f // Close range for gathering

        if (gathererPos != null && resourcePos != null) {
            val distance = gathererPos.dist(resourcePos)
            if (distance > gatherRange) {
                return ResourceResult(world, 0f, false, "out_of_range")
            }
        }

        // Calculate resources to gather (limited by available amount)
        val gatherAmount = minOf(resourceInfo.gatherRate, resourceInfo.amount)

        // Update resource amount
        val newResourceAmount = resourceInfo.amount - gatherAmount
        val updatedResource = resource + ("resource" to resourceInfo.copy(amount = newResourceAmount))

        // Update gatherer's resources (assuming they have a resource storage component)
        val gathererResources = gatherer.get("resources") as? Float ?: 0f
        val updatedGatherer = gatherer + ("resources" to gathererResources + gatherAmount)

        val updatedWorld = world + (resourceId to updatedResource) + (gathererId to updatedGatherer)

        return ResourceResult(updatedWorld, gatherAmount, true)
    }

    /**
     * Get resource information from an entity
     */
    fun getResourceInfo(entity: Entity): ResourceInfo {
        val resourceComponent = entity.get("resource") as? ResourceInfo
            ?: ResourceInfo("unknown", 0f, 100f, 5f)
        return resourceComponent
    }

    /**
     * Check if entity is a resource
     */
    fun isResource(entity: Entity): Boolean {
        return entity.containsKey("resource")
    }

    /**
     * Create a resource entity
     */
    fun createResource(
        id: EntityId,
        type: String,
        position: Vec3,
        amount: Float = 100f,
        gatherRate: Float = 5f
    ): Pair<EntityId, Entity> {
        val resourceInfo = ResourceInfo(type, amount, amount, gatherRate)
        val entity = mapOf(
            "pos" to Pos(position),
            "resource" to resourceInfo
        )
        return id to entity
    }
}
