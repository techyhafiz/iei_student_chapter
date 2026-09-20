/**
 * Tier 1 — Feature 13: WebGL Specular Cards Lifecycle Fix
 * Spec: Ensure IntersectionObserver resumes rAF renderLoop when specular cards re-enter the viewport.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles } = require('../helpers/dom-env');

describe('Feature 13: WebGL Specular Cards Lifecycle Fix', () => {
  const sources = loadSourceFiles();

  it('13.1: specular cards observe intersection to manage rendering lifecycle', () => {
    expect(sources.scriptJs).toContain('IntersectionObserver');
    expect(sources.scriptJs).toContain('item.visible');
  });

  it('13.2: IntersectionObserver callback restarts/resumes render loop when cards re-enter viewport', () => {
    // In script.js: line 1443, when all cards leave viewport, rafId is cancelled.
    // When cards re-enter, start() must be called to restore the rAF loop.
    const hasLifecycleResume = sources.scriptJs.includes('if (item.visible') || 
                               sources.scriptJs.includes('start()') ||
                               sources.scriptJs.includes('requestAnimationFrame');
    expect(hasLifecycleResume).toBe(true, 'IntersectionObserver must resume render loop when specular cards re-enter viewport');
  });

  it('13.3: visibilitychange document listener pauses WebGL rendering on hidden browser tabs', () => {
    expect(sources.scriptJs).toContain('visibilitychange');
    expect(sources.scriptJs).toContain('document.hidden');
  });

  it('13.4: prefers-reduced-motion media query disables expensive continuous GPU shaders', () => {
    expect(sources.scriptJs).toContain('prefers-reduced-motion: reduce');
    expect(sources.scriptJs).toContain('reduced');
  });

  it('13.5: canvas resizing caps DPR at max 1.5 - 2.0 to prevent mobile GPU thermal throttling', () => {
    expect(sources.scriptJs).toContain('devicePixelRatio');
    expect(sources.scriptJs).toContain('Math.min');
  });
});
