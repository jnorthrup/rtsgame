TDD Gap Analysis & Plan
========================

Summary
-------
Repository scan shows many implementation TODOs and relatively few `commonTest` files under `kotlin/src/commonTest`.
This document captures a lightweight gap analysis and the next TDD-focused steps.

High-level findings
-------------------
- commonMain sources (not exhaustive): MovementSystem, FormationSystem, Pathfinder, Command/Ability systems, Position, GameMap, NetworkPhysics.
- commonTest coverage is sparse: currently a few Position tests and some Formation tests, but many systems lack tests.
- Numerous `TODO` comments across Kotlin and JS code indicate unfinished behavior.

Priority ranking (initial)
-------------------------
1. MovementSystem — affects entity movement and physics; high risk.
2. FormationSystem — movement/slot math; medium-high risk.
3. Pathfinder — core routing logic.
4. Command & Ability systems — game rules and side effects.
5. GameMap / NetworkPhysics / CacheCoherence — infra and correctness.

TDD approach
------------
For each prioritized system:

1. Create a clear contract (inputs, outputs, error modes).
2. Write 3–6 failing unit tests that express required behavior (happy path + edge cases).
3. Implement smallest change to satisfy tests.
4. Repeat until green.

Deliverables created now
-----------------------
- `kotlin/src/commonTest/kotlin/com/rtsgame/shared/systems/MovementSystemTDDTest.kt` (failing test seeds)
- `kotlin/src/commonTest/kotlin/com/rtsgame/shared/systems/FormationSystemTDDTest.kt` (failing test seeds)

Next actions for you (run locally)
---------------------------------
Run the Kotlin tests and paste the summary here:

```bash
./gradlew :kotlin:test --no-daemon --console=plain --stacktrace
```

If the suite is large/slow, run only common tests to start:

```bash
./gradlew :kotlin:compileKotlinMetadata :kotlin:test --tests "com.rtsgame.shared.*" --no-daemon --console=plain --stacktrace
```

What I'll do after you paste results
-----------------------------------
- If many failing tests: produce a file→test map, prioritized TDD backlog, and scaffold additional failing tests for the top N modules.
- If few failures: iterate test-first on those tests (create focused tests and minimal fixes).

Notes & assumptions
-------------------
- I couldn't reliably run Gradle tests from this environment (terminal output capture failed), so I proceeded with the gap analysis and created failing test scaffolds for you to run locally.
TDD Gap Analysis and Plan

Summary
- After removing duplicate platform/time wrappers, the codebase still fails to compile for multiple reasons. The backlog is large. This document lists the categories of issues, a prioritized fix plan with small TDD steps, and concrete tests to add first (Phase A).

Goals
- Stabilize commonMain compilation.
- Add small, fast unit tests that define expected behavior for core primitives.
- Iterate with test-driven fixes to grow confidence and reduce technical debt.

Issue categories (root causes)
1. expect/actual mismatches and duplicate declarations
   - Duplicate actuals for PlatformTime across modules; removed one duplicate but other duplicates/stubs remain.
   - Missing actuals for compat expect functions on some targets (fixed by adding JS actuals).
2. Multiplatform inline/value class support
   - Project uses a compat annotation `PlatformInline` expect/actual; value classes must be annotated with it in common code.
3. Numeric type mismatches
   - Coord is Float; many literals are Doubles. Add `f` suffix where intended.
4. Ambiguous lambdas / missing type annotations
   - Several lambdas (DenseAI, DenseModels) cannot infer parameter types. Add explicit parameter types to resolve inference.
5. ByteArray/NetCodec usage
   - Overloaded `+` on ByteArray and custom encode helpers create type inference problems; prefer explicit builders (`MutableList<Byte>` or ByteArrayOutputStream) and explicit types for encode functions.
6. Coroutine context misuse
   - Calls to `launch` and suspension functions appear in non-suspend contexts; wrap them in appropriate CoroutineScope or convert callers to suspend functions.
7. Platform/compat helper mismatches
   - Some platform helper functions used by common code (e.g., Date.toFixed in JS) are unresolved due to wrong interop usage.
8. Misc small issues
   - Private top-level symbols used across files (TrikeShedStub), recursive type-checking spots needing explicit types, integer literal Byte expectations.

Phase A (small, fast, high-value tests)
- Purpose: add minimal compile/run tests that exercise pure, small functions in `DenseCore` and define contracts.
- Tests to add (source: src/commonTest/kotlin/rtsgame/core)
  1. Vec3Tests.kt
     - Test Vec3.plus, Vec3.times, Vec3.dist with a few vectors.
  2. EntityTests.kt
     - Test entityOf, World.update, World.get, Entity lens operators.
  3. GameInterpretTests.kt
     - Test Game.interpret handles Move/Spawn/Build/Attack in a simple world (happy path only).

Contracts (for tests)
- Vec3.plus: returns component-wise sum.
- Vec3.times(scalar): multiplies each component by scalar.
- Vec3.dist: Euclidean distance.
- entityOf(vararg): returns a map with provided components.
- World.update: if id exists, applies transform; otherwise returns same world.
- Game.interpret(cmd)(world): returns new world with expected changes for each Cmd variant.

Edge cases to cover (later phases)
- Empty worlds, missing components, non-existent entity ids, negative HP, large numbers for varint encoding.

Prioritized fix list (short-term)
1. Fix all expect/actual mismatches across targets (compat/*.kt and core/Platform.kt). Ensure one canonical actual per target.
2. Restore/use PlatformInline on all value classes in commonMain (done for DenseCore). Search for other value classes.
3. Fix numeric literal mismatches in DenseModels (append `f` where needed).
4. Add explicit parameter types for lambdas that fail to infer (DenseAI, DenseModels). Keep changes minimal and local.
5. Replace ambiguous ByteArray + operations in NetCodec with an explicit ByteArray builder helper.
6. Fix coroutine scope misuse: ensure `launch` calls are in CoroutineScope or replace with Structured concurrency patterns.
7. Fix TrikeShedStub top-level visibility and ByteArray conversions.

Deliverables (Phase A)
- Tests: Vec3Tests, EntityTests, GameInterpretTests (skeletons provided).
- A short set of targeted code edits to make tests compile (numeric literals + explicit lambda types + PlatformInline usage + codec helpers).
- Run `./gradlew :compileKotlinJs :compileKotlinJvm :compileKotlinMetadata` and then tests when compilation is green.

Next concrete steps I will take (if you want me to proceed)
1. Add Phase A test skeletons under `src/commonTest/kotlin/rtsgame/core/`.
2. Apply the smallest code edits to make those tests compile (explicit types in a few lambdas, float literals in DenseModels, PlatformInline where missing, a small codec builder helper to replace ByteArray + usage).
3. Re-run compile and tests, iterate until green.

If you confirm, I'll start by creating the tests and then apply the minimal fixes required to compile them.
