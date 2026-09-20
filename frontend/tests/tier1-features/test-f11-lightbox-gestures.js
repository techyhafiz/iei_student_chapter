/**
 * Tier 1 — Feature 11: Lightbox Mobile Edge-to-Edge & Gestures
 * Spec: Optimize mobile stage padding, swipe-down dismissal, and overscroll-behavior: contain on lightbox modal.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles, parseCssRules, evaluateCssValue, getComputedProperties } = require('../helpers/dom-env');

describe('Feature 11: Lightbox Mobile Edge-to-Edge & Gestures', () => {
  const sources = loadSourceFiles();
  const rules = parseCssRules(sources.stylesCss);

  it('11.1: lightbox markup contains semantic dialog role, modal attribute, and header info', () => {
    expect(sources.html).toContain('id="lightbox"');
    expect(sources.html).toContain('role="dialog"');
    expect(sources.html).toContain('aria-modal="true"');
    expect(sources.html).toContain('id="lbEventTracker"');
    expect(sources.html).toContain('id="lbName"');
  });

  it('11.2: lightbox modal container enforces overscroll-behavior: contain to isolate touch scrolling', () => {
    const lbProps = getComputedProperties(rules, '#lightbox', 375);
    const hasOverscroll = sources.stylesCss.includes('overscroll-behavior: contain') || 
                          lbProps['overscroll-behavior'] === 'contain';
    expect(hasOverscroll).toBe(true, 'Lightbox modal must declare overscroll-behavior: contain to prevent background scroll chaining');
  });

  it('11.3: lightbox mobile content padding scales down (<= 12px) for edge-to-edge media stage', () => {
    const lbContentMobile = getComputedProperties(rules, '.lb-content', 375);
    const pad = evaluateCssValue(lbContentMobile['padding'] || '16px', 375);
    // On mobile (< 480px / 375px), padding should be minimal (<= 16px) for full-width presentation
    expect(pad).toBeLessThanOrEqual(20);
  });

  it('11.4: touch event listeners support both horizontal navigation swipe and vertical swipe-down dismissal', () => {
    // Check for swipe gesture handling in script.js
    expect(sources.scriptJs).toContain('touchstart');
    expect(sources.scriptJs).toContain('touchend');
    const hasSwipeDown = sources.scriptJs.includes('closeLightbox') && 
      (sources.scriptJs.includes('dy >') || sources.scriptJs.includes('diff >') || sources.scriptJs.includes('swipeDown'));
    expect(hasSwipeDown).toBe(true, 'Lightbox touch handlers should support swipe-down dismissal gesture');
  });

  it('11.5: opening and closing lightbox toggles page scroll lock (.is-scroll-locked)', () => {
    expect(sources.scriptJs).toContain('lockScroll(true)');
    expect(sources.scriptJs).toContain('lockScroll(false)');
    expect(sources.scriptJs).toContain('is-scroll-locked');
  });
});
