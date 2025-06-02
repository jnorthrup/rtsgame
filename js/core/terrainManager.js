// js/core/terrainManager.js

const terrainGenerators = {
    // This will be populated dynamically or via configuration
    'perlinNoiseGenerator': null // Placeholder, will be dynamically imported
};

/**
 * Loads a terrain generator module dynamically.
 * @param {string} generatorName - The name of the generator to load (e.g., 'perlinNoiseGenerator').
 * @returns {Promise<Function>} A promise that resolves to the loaded generator function.
 */
async function loadGenerator(generatorName) {
    if (terrainGenerators[generatorName]) {
        return terrainGenerators[generatorName];
    }

    try {
        // Dynamically import the module.
        // Note: The path resolution here is relative to this file.
        const module = await import(`../terrain-generators/${generatorName}.js`);
        // Assuming the generator function is exported as generate[GeneratorName]Terrain
        const generatorFunction = module[`generate${generatorName.charAt(0).toUpperCase() + generatorName.slice(1).replace('Generator', '')}Terrain`];
        
        if (typeof generatorFunction === 'function') {
            terrainGenerators[generatorName] = generatorFunction;
            return generatorFunction;
        } else {
            console.error(`Error: Generator function 'generate${generatorName.charAt(0).toUpperCase() + generatorName.slice(1)}Terrain' not found in ${generatorName}.js`);
            throw new Error(`Invalid generator module: ${generatorName}`);
        }
    } catch (error) {
        console.error(`Failed to load terrain generator '${generatorName}':`, error);
        throw error;
    }
}

/**
 * Generates terrain using the specified generator.
 * @param {object} gameContext - The game context object.
 * @param {string} generatorName - The name of the generator to use.
 * @returns {Promise<void>} A promise that resolves when terrain generation is complete.
 */
export async function generateTerrain(gameContext, generatorName) {
    try {
        const generator = await loadGenerator(generatorName);
        await generator(gameContext); // Pass gameContext to the generator
        console.log(`Terrain generated using ${generatorName}.`);
    } catch (error) {
        console.error(`Failed to generate terrain using ${generatorName}:`, error);
        // Fallback to a default or error handling
        console.warn("Attempting to generate default terrain due to generator failure.");
        // This might need a simple fallback generator or a predefined default terrain
        // For now, let's assume the gameContext.terrain would be an empty array
        // or a simple flat land if no generator works.
        // A more robust fallback would be to have a default generator baked in.
    }
}