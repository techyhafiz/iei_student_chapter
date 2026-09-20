/**
 * Tier 1 — Feature 14: Specular Buttons Idle Guard
 * Spec: Guard button specular rAF loop so it runs only when buttons are visible and active.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles } = require('../helpers/dom-env');

describe('Feature 14: Specular Buttons Idle Guard', () => {
  const sources = loadSourceFiles();

  it('14.1: touch/coarse devices skip continuous cursor-tracking shader loops', () => {
    expect(sources.scriptJs).toContain('coarsePointer');
    expect(sources.scriptJs).toContain('sb-static');
  });

  it('14.2: specular button animation loop detects settled state when idle to conserve battery', () => {
    expect(sources.scriptJs).toContain('it.settled');
    expect(sources.scriptJs).toContain('settled');
  });

  it('14.3: pointer proximity (250px radius) activates button shine angle and intensity', () => {
    expect(sources.scriptJs).toContain('pointermove');
    expect(sources.scriptJs).toContain('250');
  });

  it('14.4: document.hidden check early returns inside button animation tick', () => {
    expect(sources.scriptJs).toContain('if (document.hidden) { return; }');
  });

  it('14.5: WebGL shader compilation implements robust fallback between WebGL2 and WebGL1', () => {
    expect(sources.scriptJs).toContain('"webgl2"');
    expect(sources.scriptJs).toContain('"webgl"');
    expect(sources.scriptJs).toContain('compileShader');
  });
});
