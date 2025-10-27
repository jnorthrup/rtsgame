# RTS Game — Unified TODOs (automatically maintained)

This file tracks the high-level TDD-driven backlog and marks completed seeds and small wins.
Update cadence: the automated agent updates this after each red→green cycle.

## Completed (green)
- MovementSystem: added `MovementSystem` seed tests and implemented `stepPosition` (src/commonMain/kotlin/rtsgame/core/MovementSystem.kt).
- FormationSystem: added `FormationSystem` seed tests and implemented basic slot calculation (src/commonMain/kotlin/rtsgame/core/FormationSystem.kt).
- NetworkPhysics.merge: added deterministic generic map merge (last-writer-wins) and tests (src/commonMain/kotlin/rtsgame/NetworkPhysics.kt).
- Vec3Utils: small Vec3 helpers (add, distance) and tests (src/commonMain/kotlin/rtsgame/Vec3Utils.kt).
- GameEngine.tickDuration: exposed `tickDuration` and updated simulateMovement to use `vel * dt`; added test verifying per-tick movement (src/commonMain/kotlin/rtsgame/GameEngine.kt).

All of the above currently have passing tests (Gradle `allTests` ran green in this session).

## In progress / recently seeded
- Pathfinder deeper integration (seed exists but needs more integration tests between pathfinder and movement across grid/map tiles).
- Formation → Movement integration (wiring formation slot assignment into movement commands).

## Backlog (prioritized next TDD seeds)
1. Pathfinder: add tests for obstacle avoidance, multi-tile A* correctness, and path smoothing.
2. GameMap / NetworkPhysics: tests for deterministic state reconciliation across tick boundaries and partial updates.
3. Command/Ability system: add tests for queued commands, cancelation, and ability resolution order.
4. Resource/CacheCoherence: tests for deterministic resource updates and cache expiry under simulated network latency.
5. UI/Replay integration: test harness for replay parser and deterministic playback.

## Notes & small follow-ups (non-blocking)
- Avoid adding concrete overloads alongside generic functions (JVM signature clashes observed when adding a String-specific `merge` overload).
- Many TODO comments remain across codebase; address those as part of larger feature work rather than single-change TDD seeds.

## Next suggested immediate action (pick one)
- A: Write failing tests for Pathfinder obstacle avoidance and implement the minimal A* changes to pass them.
- B: Create integration tests that wire FormationSystem slot calculations into Command handling and Movement simulation.

If you'd like, I can start on A (Pathfinder tests) now and drive red→green for those seeds. Otherwise, pick B or tell me another priority.
