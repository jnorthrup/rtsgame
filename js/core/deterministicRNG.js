// Deterministic Random Number Generator - Ensures reproducible randomness for battle replay
// Uses Linear Congruential Generator (LCG) algorithm for predictable random sequences

export class DeterministicRNG {
    constructor(seed = 12345) {
        this.seed = seed;
        this.state = seed;
        this.originalSeed = seed;
        this.callCount = 0;
        this.history = []; // Track random calls for debugging
    }

    // Linear Congruential Generator
    // Parameters from Numerical Recipes (a = 1664525, c = 1013904223, m = 2^32)
    next() {
        this.callCount++;
        this.state = (this.state * 1664525 + 1013904223) % 4294967296;
        const result = this.state / 4294967296;
        
        // Record call for debugging if needed
        if (this.history.length < 1000) { // Limit history size
            this.history.push({
                call: this.callCount,
                seed: this.state,
                value: result
            });
        }
        
        return result;
    }

    // Generate random float between 0 and 1
    random() {
        return this.next();
    }

    // Generate random integer between min and max (inclusive)
    randomInt(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }

    // Generate random float between min and max
    randomFloat(min, max) {
        return this.random() * (max - min) + min;
    }

    // Generate random boolean with given probability (0-1)
    randomBool(probability = 0.5) {
        return this.random() < probability;
    }

    // Choose random element from array
    randomChoice(array) {
        if (array.length === 0) return null;
        return array[this.randomInt(0, array.length - 1)];
    }

    // Shuffle array in place using Fisher-Yates algorithm
    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = this.randomInt(0, i);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Generate random position within bounds
    randomPosition(minX, maxX, minY, maxY) {
        return {
            x: this.randomFloat(minX, maxX),
            y: this.randomFloat(minY, maxY)
        };
    }

    // Generate random angle in radians
    randomAngle() {
        return this.randomFloat(0, Math.PI * 2);
    }

    // Generate random direction vector
    randomDirection() {
        const angle = this.randomAngle();
        return {
            x: Math.cos(angle),
            y: Math.sin(angle)
        };
    }

    // Reset to original seed for replay
    reset() {
        this.state = this.originalSeed;
        this.callCount = 0;
        this.history = [];
    }

    // Set new seed and reset
    setSeed(seed) {
        this.seed = seed;
        this.originalSeed = seed;
        this.state = seed;
        this.callCount = 0;
        this.history = [];
    }

    // Get current state for saving/restoring
    getState() {
        return {
            seed: this.seed,
            originalSeed: this.originalSeed,
            state: this.state,
            callCount: this.callCount
        };
    }

    // Restore from saved state
    setState(savedState) {
        this.seed = savedState.seed;
        this.originalSeed = savedState.originalSeed;
        this.state = savedState.state;
        this.callCount = savedState.callCount;
        this.history = [];
    }

    // Generate reproducible noise for terrain generation
    noise2D(x, y, scale = 1) {
        const tempState = this.state;
        const tempCallCount = this.callCount;
        
        // Use position to create deterministic seed offset
        const coordSeed = Math.floor(x * 73856093) ^ Math.floor(y * 19349663);
        this.state = (this.originalSeed + coordSeed) % 4294967296;
        this.callCount = 0;
        
        const noise = this.random() * scale;
        
        // Restore original state
        this.state = tempState;
        this.callCount = tempCallCount;
        
        return noise;
    }

    // Generate debug report
    getDebugInfo() {
        return {
            originalSeed: this.originalSeed,
            currentSeed: this.seed,
            currentState: this.state,
            callCount: this.callCount,
            historyLength: this.history.length,
            recentCalls: this.history.slice(-5)
        };
    }
}

// Global deterministic RNG instance
export const gameRNG = new DeterministicRNG();

// Replace Math.random with deterministic version for game logic
export function enableDeterministicMode(seed = null) {
    if (seed !== null) {
        gameRNG.setSeed(seed);
    }
    
    // Store original Math.random
    if (!Math._originalRandom) {
        Math._originalRandom = Math.random;
    }
    
    // Replace Math.random with deterministic version
    Math.random = () => gameRNG.random();
    
    console.log(`🎲 Deterministic RNG enabled with seed: ${gameRNG.originalSeed}`);
}

// Restore original Math.random
export function disableDeterministicMode() {
    if (Math._originalRandom) {
        Math.random = Math._originalRandom;
        console.log('🎲 Deterministic RNG disabled, restored original Math.random');
    }
}

// Utility functions for battle replay
export function createReproducibleSeed(battleId, timestamp = Date.now()) {
    // Create seed from battle ID and timestamp for reproducibility
    let hash = 0;
    const str = `${battleId}_${timestamp}`;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}