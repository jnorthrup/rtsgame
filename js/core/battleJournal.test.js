// Simple test for `js/core/battleJournal.js` shim

// Wrap test in async IIFE to avoid top-level await which Jest doesn't allow here
describe('battleJournal shim', () => {
  test('exports a usable constructor or singleton without throwing', async () => {
    const { BattleJournal, battleJournal } = await import('./battleJournal.js');

    function assert(cond, msg) {
      if (!cond) {
        console.error('Assertion failed:', msg);
        throw new Error(msg);
      }
      console.log('ok:', msg);
    }

    // Test: BattleJournal should be a function (constructor) and battleJournal an object
    assert(typeof BattleJournal === 'function', 'BattleJournal is a constructor/function');
    assert(typeof battleJournal === 'object', 'battleJournal is an object');

    // If the constructor can be used to create an instance, ensure it has expected methods
    let inst = null;
    try {
      inst = new BattleJournal();
      assert(typeof inst.startRecording === 'function' || typeof inst.recordEvent === 'function', 'constructed instance has recording API');
      console.log('Constructed BattleJournal instance:', inst && inst.constructor && inst.constructor.name);
    } catch (e) {
      console.log('Could not construct BattleJournal; using exported singleton instead.');
      // ensure singleton has minimal API
      assert(typeof battleJournal.startRecording === 'function', 'singleton has startRecording');
      assert(typeof battleJournal.recordEvent === 'function', 'singleton has recordEvent');
    }

    // Do not invoke startRecording/stopRecording here because some implementations
    // access browser globals (navigator/screen) and will throw in Node. Instead
    // perform a safe smoke call to recordEvent which should be a no-op when not recording.
    assert(typeof battleJournal.recordEvent === 'function', 'singleton has recordEvent');
    try {
      battleJournal.recordEvent && battleJournal.recordEvent('TEST', 'smoke', 0, {});
    } catch (e) {
      // If recordEvent throws, fail the test to surface unexpected runtime errors
      assert(false, 'recordEvent should not throw in this environment: ' + e.message);
    }

    console.log('battleJournal shim tests passed');
  });
});
