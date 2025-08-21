TDD file -> test map (Phase A)
===============================

Summary
-------

This file maps prioritized modules to initial TDD seed tests and provides a short prioritized backlog for the next TDD steps.

Phase A (fast, high-value seeds)
-------------------------------

1) rtsgame.core.Vec3  -> `src/commonTest/kotlin/rtsgame/core/Vec3Tests.kt`
   - Contract: plus (component-wise), times(scalar), dist
2) rtsgame.core.Entity/World -> `src/commonTest/kotlin/rtsgame/core/EntityTests.kt`
   - Contract: entityOf, World.spawn/get/update, component retrieval
3) rtsgame.core.Game.interpret -> `src/commonTest/kotlin/rtsgame/core/GameInterpretTests.kt`
   - Contract: interpret applies Move/Spawn/Attack commands to World (happy path)

Top prioritized modules (next seeds)
------------------------------------

1. MovementSystem -> add `MovementSystemTDDTest` (already present as a seed under kotlin/src/commonTest/...)
2. FormationSystem -> add extra failing slot-calculation tests (seed exists)
3. Pathfinder -> add path correctness and obstacle avoidance tests
4. Command & Ability systems -> add small command processing tests per command type
5. GameMap / NetworkPhysics -> add small pure-function tests for deterministic behaviors

Next steps (recommended)
------------------------

- Run the Kotlin common tests locally and paste the failing summary here:

  ./gradlew :kotlin:test --no-daemon --console=plain --stacktrace

- If many failing tests: I will produce a file->test map for failing tests and scaffold additional focused failing tests for the top N modules.
- If the suite is small: we can pick the top failing test and implement the smallest code change to make it pass (TDD loop).

Notes
-----

These seeds intentionally reference project types and functions (Vec3, World, Game, Command, etc.). They are expected to fail initially and act as TDD drivers. Update assertions once the exact APIs are stabilized.
