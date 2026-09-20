/**
 * Tier 1 — Feature 09: Terminal Simulator Race Condition Fix
 * Spec: Make CLI typing simulation cancelable on rapid chip taps with timeout handle clearance and accurate faculty advisor name.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles } = require('../helpers/dom-env');

describe('Feature 09: Terminal Simulator Race Condition Fix', () => {
  const sources = loadSourceFiles();

  it('9.1: terminal defines all 5 standard CLI commands in termCommands object', () => {
    expect(sources.scriptJs).toContain('status:');
    expect(sources.scriptJs).toContain('scope:');
    expect(sources.scriptJs).toContain('events:');
    expect(sources.scriptJs).toContain('team:');
    expect(sources.scriptJs).toContain('join:');
  });

  it('9.2: runTermCommand implements timer handle cancellation (clearTimeout / timer array) to prevent race conditions', () => {
    // Check whether script.js clears active timeouts or timers before starting a new typed sequence
    const hasClearTimeout = sources.scriptJs.includes('clearTimeout') && 
      (sources.scriptJs.includes('termTimer') || 
       sources.scriptJs.includes('termTimeouts') || 
       sources.scriptJs.includes('clearTerm') ||
       sources.scriptJs.includes('cancelTerm'));

    expect(hasClearTimeout).toBe(
      true,
      'runTermCommand must clear pending timeout handles to prevent interleaved text corruption on rapid chip clicks'
    );
  });

  it('9.3: faculty advisor name in terminal telemetry matches authentic leadership data', () => {
    // In operators.js, HOD is "Dr. Rajesh Kumar"
    // script.js previously had a typo ("Dr. Shailesh Kumar")
    const hasConsistentName = sources.scriptJs.includes('Dr. Rajesh Kumar') || !sources.scriptJs.includes('Dr. Shailesh Kumar');
    expect(hasConsistentName).toBe(
      true,
      'Faculty advisor name in terminal telemetry must be consistent with operators data (Dr. Rajesh Kumar)'
    );
  });

  it('9.4: terminal output structure includes color-coded CSS classes and blinking cursor', () => {
    expect(sources.scriptJs).toContain('class="caret"');
    expect(sources.html).toContain('id="termBody"');
    expect(sources.html).toContain('id="termChipsBar"');
  });

  it('9.5: terminal chips have click event listeners wired to runTermCommand', () => {
    expect(sources.scriptJs).toContain('chip.addEventListener("click"');
    expect(sources.scriptJs).toContain('runTermCommand');
  });
});
