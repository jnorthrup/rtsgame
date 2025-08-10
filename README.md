# RTS Game - Kotlin Multiplatform Edition

A Real-Time Strategy game converted from TypeScript/JavaScript to Kotlin, demonstrating the TrikeShed functional programming architecture with multiplatform capabilities.

## Project Structure

```
rtsgame/
├── src/
│   ├── commonMain/kotlin/        # Shared code for all platforms
│   │   ├── com/rtsgame/trikeshed/    # Core TrikeShed data structures
│   │   └── com/rtsgame/core/         # Game logic and simulation
│   ├── jvmMain/kotlin/           # JVM-specific code
│   └── linuxX64Main/kotlin/      # Native Linux code
├── build.gradle.kts              # Kotlin multiplatform build configuration
└── README.md
```

## TrikeShed Architecture

The game is built on TrikeShed, a functional programming architecture featuring:

- **Join<A, B>**: Core data structure representing pairs with named `a` and `b` components
- **Series<T>**: Lazily-evaluated sequences with functional operations
- **Tensor<T>**: Multidimensional data structures with coordinate-based access
- **Immutable State Management**: All game state updates are immutable for deterministic replay

### Example TrikeShed Usage

```kotlin
// Create a Join using infix notation
val worldSize = 1000.0 j 1000.0  // width j height

// Create a Series of units
val unitSeries = seriesOf(5) { index -> "Unit-${index + 1}" }

// Create a 3D battlefield tensor
val battlefield = tensorOf(listOf(3, 3)) { coords -> 
    "Sector(${coords[0]},${coords[1]})"
}
```

## Game Features

### Resource System
- **Mass**: Basic building material
- **Energy**: Power for operations
- **Computronium**: Advanced computational resource for AI and special abilities

### Unit Types
- **Scout**: Fast reconnaissance unit
- **Warrior**: Heavy combat unit
- **Engineer**: Resource gathering and construction
- **Commander**: High-value command unit

### Core Mechanics
- Turn-based simulation with real-time presentation
- Resource generation and management
- Unit movement and combat
- Immutable state updates for deterministic behavior

## Building and Running

### Prerequisites
- Java 17 or higher
- Gradle (or use included wrapper)

### Build Commands

```bash
# Build all targets
gradle build

# Run JVM version
gradle run

# Build native executable (Linux)
gradle linuxX64Binaries

# Clean build artifacts
gradle clean
```

### Example Output

```
🎮 RTS Game - Kotlin Multiplatform Edition
==========================================

🔧 TrikeShed Architecture Demonstration
---------------------------------------
World Size (Join): 1000.0 x 1000.0
Unit Series: [Unit-1, Unit-2, Unit-3, Unit-4, Unit-5]
Battlefield Tensor [1,1]: Sector(1,1)

🚀 Starting RTS Game Simulation
-------------------------------

📊 Turn 0 (Time: 0.0)
Blue Team (Blue Commander):
  Resources: Mass=1000, Energy=1000, Computronium=100
  Units: 3 alive (Total Health: 480)
    Commander #1: 300/300 HP, Idle
    Engineer #2: 100/100 HP, Idle
    Scout #3: 80/80 HP, Idle
```

## Architecture Benefits

### Functional Programming
- **Immutable Data**: All state changes create new instances
- **Referential Transparency**: Functions are pure and predictable
- **Composability**: Small functions combine to create complex behaviors

### Multiplatform Support
- **Shared Logic**: Core game mechanics work across all platforms
- **Platform-Specific UI**: Different presentation layers for different targets
- **Native Performance**: Compiles to efficient native code

### Deterministic Simulation
- **Replay Capability**: Game state can be recreated exactly
- **Testing**: Deterministic behavior enables reliable testing
- **Debugging**: State transitions are predictable and traceable

## Original Project

This project was converted from a TypeScript/JavaScript RTS game with Three.js rendering to demonstrate:
1. Language conversion while preserving architecture
2. Functional programming patterns in Kotlin
3. Multiplatform capability
4. Clean separation of game logic and presentation

The original web-based game included 3D graphics, complex UI panels, and WebGL rendering. This Kotlin version focuses on the core game simulation with a console-based presentation layer to highlight the architectural patterns.

## Future Enhancements

- [ ] Full multiplatform build (Windows, macOS, JVM)
- [ ] GUI presentation layer using Compose Multiplatform
- [ ] Network multiplayer support
- [ ] Enhanced AI systems using Computronium resources
- [ ] Battle replay system with state serialization