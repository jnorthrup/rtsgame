// Compatibility shim: expose a BattleJournal constructor and a default instance.
// Prefer the enhanced replay-capable implementation in `core/replay` when available.
// Fallback to the legacy AI journal instance in `js/ai/battleJournal.js`.
import * as replayModule from './replay/battleJournal.js';
import legacyBattleJournal from '../ai/battleJournal.js';

// Resolve a constructor (class or function) for consumers that call `new BattleJournal()`
let BattleJournalCtor = null;
if (replayModule && typeof replayModule.BattleJournal === 'function') {
	BattleJournalCtor = replayModule.BattleJournal;
} else if (replayModule && typeof replayModule.default === 'function') {
	BattleJournalCtor = replayModule.default;
} else if (legacyBattleJournal && legacyBattleJournal.constructor) {
	BattleJournalCtor = legacyBattleJournal.constructor;
}

// Resolve a default instance for modules that import the singleton
let battleJournalInstance = null;
if (replayModule && replayModule.battleJournal) {
	battleJournalInstance = replayModule.battleJournal;
} else if (replayModule && typeof replayModule.default === 'object') {
	battleJournalInstance = replayModule.default;
} else if (legacyBattleJournal) {
	battleJournalInstance = legacyBattleJournal;
} else if (BattleJournalCtor) {
	try {
		battleJournalInstance = new BattleJournalCtor();
	} catch (e) {
		// ignore; will throw later if nothing usable
		battleJournalInstance = null;
	}
}

// Final fallbacks to ensure exports exist
if (!BattleJournalCtor && battleJournalInstance && battleJournalInstance.constructor) {
	BattleJournalCtor = battleJournalInstance.constructor;
}

if (!battleJournalInstance && BattleJournalCtor) {
	try { battleJournalInstance = new BattleJournalCtor(); } catch (e) { /* ignore */ }
}

if (!BattleJournalCtor) {
	// Provide a minimal constructor that throws to make errors explicit if used
	BattleJournalCtor = function MissingBattleJournal() {
		throw new Error('No BattleJournal implementation available');
	};
}

if (!battleJournalInstance) {
	// Create a placeholder instance with minimal shape to avoid runtime crashes
	battleJournalInstance = { isRecording: false, startRecording: () => {}, stopRecording: () => null, recordEvent: () => {} };
}

export const BattleJournal = BattleJournalCtor;
export const battleJournal = battleJournalInstance;
export default battleJournalInstance;
