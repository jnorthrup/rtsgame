# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Build Commands

```bash
# Build all platform targets (JVM, JS)
./gradlew build

# Run JVM version
./gradlew runJvm

# Run tests - all platforms
./gradlew allTests

# Run tests - specific platform
./gradlew jvmTest
./gradlew jsTest
./gradlew jsNodeTest          # JS tests in Node.js
./gradlew jsBrowserTest       # JS tests in browser (requires CHROME_BIN)

# Run single test class (JVM)
./gradlew jvmTest --tests "rtsgame.core.PathfinderTDDTest"

# Clean build artifacts
./gradlew clean
```

## Architecture Overview

### TrikeShed Type System (Core Foundation)

The codebase uses the TrikeShed architectural philosophy - all data structures radiate from axiomatic core types:

- **`Indexed<T>`**: Functional collection representing `(Int) -> T`. Use instead of `List` for interfaces/returns.
- **`Join<A, B>`**: Product type for paired data. Use instead of `Pair`.
- **`Twin<T>`**: Specialized `Join<T, T>` for homogeneous pairs.
- **DSL operators**: `j` for Join construction (e.g., `a j b`), `α` for series operations.

**Critical constraints**:
- Avoid `List`, `Map`, `Pair` in internal logic where `Indexed`/`Join` suffice (Frictional Drag).
- Avoid `String` operations in loops/hot paths (String Performance War).
- Use `data class` + extension functions, not mutable `class` with methods.
- Design for metaseries (series operations), not individual instances.

### Core Game Systems

Located in `src/commonMain/kotlin/rtsgame/core/`:

- **DenseCore.kt**: ECS foundation using functional composition. `World = Map<EntityId, Entity>`, commands as sealed classes.
- **DensePathfinder.kt**: Pathfinding optimized for cache locality.
- **DenseAI.kt**: AI decision-making using functional transforms.
- **DenseNetwork.kt**: Network protocol and serialization.
- **DenseModels.kt**: Domain model types.

### Module Structure

- **`src/commonMain/kotlin/`**: Cross-platform code (JVM, JS, Native).
- **`src/jvmMain/kotlin/`**: JVM-specific implementations (actuals).
- **`src/jsMain/kotlin/`**: JavaScript-specific implementations.
- **`src/nativeMain/kotlin/`**: Native platform code (macOS, Linux) - for SIMD/C interop.
- **`src/commonTest/kotlin/`**: Cross-platform tests.
- **`trikeshed/lib/TrikeShed.kt`**: Core type definitions (`Indexed`, `Join`, etc.).
- **`borg/trikeshed/lib/BorgTypes.kt`**: Borg compatibility layer for UI components.

### Platform Constraints (ADR-001: SIMD Strategy)

- **DO NOT** remove platform-specific `actual` implementations (macosArm64Main, linuxX64Main).
- **DO NOT** replace C interop with pure Kotlin where SIMD optimizations exist.
- **MUST** use `expect`/`actual` pattern for performance-critical code.
- **MUST** use `kotlinx.datetime` for time APIs, not `System.currentTimeMillis()`.

### Build System Constraints

- **DO NOT** modify Gradle files without explicit permission.
- **DO NOT** add version numbers to child Gradle files (managed centrally).
- Ben Manes version management runs before builds.
- Gradle configurations (cinterop, platform targets) are immutable.

## Testing Patterns

### Test Location
- Tests alongside source: `src/commonTest/kotlin/rtsgame/` mirrors `src/commonMain/kotlin/rtsgame/`.
- Naming: `*TDDTest.kt` for TDD test files, `*Test.kt` for integration tests.

### Running Specific Tests
```bash
# Run all tests in a file (JVM)
./gradlew jvmTest --tests "rtsgame.core.PathfinderTDDTest"

# Run single test method
./gradlew jvmTest --tests "rtsgame.core.PathfinderTDDTest.testPathfinding"

# JS tests (Node.js runner)
./gradlew jsNodeTest --tests "rtsgame.core.PathfinderTDDTest"
```

### Test Patterns
- Use TrikeShed types (`Indexed`, `Join`) in test data structures.
- Tests verify functional composition chains, not implementation details.
- Use `kotlin.test` annotations (`@Test`, `assertEquals`, etc.).

## Code Architecture Principles

### Functional Composition (μ-Chains)
Code quality is measured by unbroken chains of functional composition:

1. **Core Instantiation**: Start with `Indexed<T>` or `Join<A, B>`.
2. **Axiomatic Aliasing**: Create `typealias` for composed types (e.g., `typealias World = Map<EntityId, Entity>`).
3. **Functional Extension**: Define extension functions on core types.
4. **Operator Application**: Use DSL operators (`j`, `α`, `play`).
5. **Performance Purity**: Avoid `String` allocations in hot paths; use `ByteArray`/`CharIndexed`.
6. **Metaseries Composition**: Operate on series, not individual instances.
7. **Algebraic Transformation**: Compose functions to create new operations.

### Performance-Critical Patterns
- **Spatial indexing**: 64x64 world regions for cache locality.
- **Batch processing**: Process entities in cache-friendly batches.
- **Immutable updates**: Critical for determinism and replay capability.
- **Deterministic RNG**: Seeded generators for reproducible gameplay.

### Antipatterns (Avoid)
- Using `List`/`Map`/`Pair` where `Indexed`/`Join` work.
- Mutable classes with methods instead of `data class` + extensions.
- `String` concatenation/splitting in loops.
- Verbose imperative code where functional composition suffices.
- Instance-focused design instead of metaseries design.

## Project-Specific Notes

### Protocol Implementations
All protocol references (couchdb, quic, ipfs, ssh, rest, wave) are for internal dogfooding implementations, even if not yet built.

### Disabled/Stub Files
Files with `.disabled` extension are TDD placeholders awaiting implementation. Do not delete without confirmation.

Stub files in `src/commonMain/kotlin/` serve as scaffolding for WebGPU, SpaceGraph, and other subsystems under development.

### Documentation
- **`.claude/CLAUDE.md`**: Detailed architectural scoring system and μ-Chain mechanics (primary reference).
- **`docs/`**: Design documents (may reference older JS/TS architecture - cross-check with Kotlin code).
- **`docs/implementation-guide.md`**: Authority system, veterancy, C&C hierarchy (pre-refactor documentation).
- **`docs/the-rts-concepts.md`**: Game design concepts.

## Common Workflows

### Adding a New System
1. Define core types as `typealias` or `data class` in `DenseCore.kt` or dedicated file.
2. Implement as `System = suspend (World, Duration) -> World` function.
3. Add extension functions on `World` for system operations.
4. Write tests in `src/commonTest/kotlin/rtsgame/core/`.
5. Register system in game loop (see `GameEngine.kt`).

### Modifying Core Types
1. Check `.claude/CLAUDE.md` for Axiom compliance.
2. Ensure changes radiate truth (extend existing types, don't replace).
3. Update dependent systems via extension functions, not direct modification.
4. Run all tests: `./gradlew allTests`.

### Performance Optimization
1. Profile hot paths (use JVM profiler or browser DevTools).
2. Replace `String` operations with `ByteArray` or type-safe wrappers.
3. Use `Indexed<T>` for cache-friendly iteration.
4. Batch operations on entities (see `DenseCore.kt` system patterns).
5. Verify with benchmarks before/after.
