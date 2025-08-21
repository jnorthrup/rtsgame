package rtsgame

// Minimal compatibility stubs that match shapes used in tests and UI stubs.
// Use simple types (no Field wrappers) to match `GameEngineStub.kt` definitions.

// Alias to the canonical GameEntity used in GameEngineStub
typealias Entity = GameEntity

data class Entities(val play: List<Entity>)

// Keep this file intentionally small: GameTick, GameEntity and GameState are
// declared in `GameEngineStub.kt` which is the canonical test stub for the
// rtsgame package.
