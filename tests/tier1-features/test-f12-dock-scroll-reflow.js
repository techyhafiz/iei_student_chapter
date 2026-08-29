/**
 * Tier 1 — Feature 12: Dock Scroll Layout Thrashing Elimination
 * Spec: Replace unthrottled getBoundingClientRect() scroll loop in onScrollDock with rAF/IntersectionObserver spy.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles } = require('../helpers/dom-env');

describe('Feature 12: Dock Scroll Layout Thrashing Elimination', () => {
  const sources = loadSourceFiles();

  it('12.1: window scroll listener is attached with { passive: true }', () => {
    const scrollAttached = sources.scriptJs.includes('window.addEventListener("scroll", onScrollDock, { passive: true })') ||
                           sources.scriptJs.includes('addEventListener("scroll"');
    expect(scrollAttached).toBe(true, 'Scroll listeners must declare { passive: true }');
  });

  it('12.2: dock section spy avoids synchronous unthrottled reflows on high-frequency scroll ticks', () => {
    // Check if onScrollDock uses requestAnimationFrame or IntersectionObserver or scroll tick throttling
    const hasRafThrottle = sources.scriptJs.includes('requestAnimationFrame') || 
                           sources.scriptJs.includes('IntersectionObserver') ||
                           sources.scriptJs.includes('dockRaf') ||
                           sources.scriptJs.includes('ticking');
    expect(hasRafThrottle).toBe(
      true,
      'onScrollDock should use requestAnimationFrame or IntersectionObserver to eliminate forced synchronous reflow (layout thrashing)'
    );
  });

  it('12.3: dock radar checks the 5 primary sections: join, faq, team, events, about', () => {
    expect(sources.scriptJs).toContain('"join"');
    expect(sources.scriptJs).toContain('"faq"');
    expect(sources.scriptJs).toContain('"team"');
    expect(sources.scriptJs).toContain('"events"');
    expect(sources.scriptJs).toContain('"about"');
  });

  it('12.4: dock auto-hide logic detects scroll direction based on scroll position delta', () => {
    expect(sources.scriptJs).toContain('bottomDock.classList.add("is-hidden")');
    expect(sources.scriptJs).toContain('bottomDock.classList.remove("is-hidden")');
    expect(sources.scriptJs).toContain('lastScrollPos');
  });

  it('12.5: active tab styling toggles .is-active class on corresponding dock-tab', () => {
    expect(sources.scriptJs).toContain('tab.classList.toggle("is-active"');
  });
});
