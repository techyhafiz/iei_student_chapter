/**
 * Tier 3 — Cross-Feature Interaction: Terminal Typing Cancellation on Rapid Clicks
 * Spec: Rapid multi-chip clicks cancel ongoing typing simulations, ensuring clean single-stream output.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles } = require('../helpers/dom-env');

describe('Tier 3: Terminal Typing Cancellation on Rapid Clicks', () => {
  const sources = loadSourceFiles();

  it('3.2.1: terminal command runner cleans up previous timer handles before scheduling new lines', () => {
    // Check if script.js provides timer cancellation logic
    const hasCancellation = sources.scriptJs.includes('clearTimeout') &&
      (sources.scriptJs.includes('termTimer') || 
       sources.scriptJs.includes('termTimeouts') || 
       sources.scriptJs.includes('clearTerm') ||
       sources.scriptJs.includes('cancelTerm'));

    expect(hasCancellation).toBe(
      true,
      'runTermCommand must cancel running setTimeout handles before starting a new command typing sequence'
    );
  });

  it('3.2.2: clicking between status, scope, and events chips maintains mutual exclusivity of is-active class', () => {
    expect(sources.scriptJs).toContain('c.classList.toggle("is-active", c.getAttribute("data-cmd") === cmdKey)');
  });

  it('3.2.3: terminal telemetry matches authentic chapter metadata', () => {
    expect(sources.html).toContain('iei@csds:~');
    expect(sources.scriptJs).toContain('IEI Student Chapter (Department of CSDS, GHRCEM)');
  });
});
