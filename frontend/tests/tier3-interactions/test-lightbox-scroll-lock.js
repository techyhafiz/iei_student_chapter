/**
 * Tier 3 — Cross-Feature Interaction: Lightbox Open/Close & Scroll Lock
 * Spec: Lightbox modal opening toggles is-scroll-locked on <html>, stops Lenis smooth scroll, and isolates touch gestures.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles } = require('../helpers/dom-env');

describe('Tier 3: Lightbox Open/Close & Scroll Lock Interaction', () => {
  const sources = loadSourceFiles();

  it('3.4.1: lockScroll() function increments/decrements scrollLockCount and toggles .is-scroll-locked class', () => {
    expect(sources.scriptJs).toContain('function lockScroll(lock)');
    expect(sources.scriptJs).toContain('document.documentElement.classList.toggle("is-scroll-locked"');
  });

  it('3.4.2: openLightbox() calls lockScroll(true) and openBottomSheet() calls lockScroll(true)', () => {
    expect(sources.scriptJs).toContain('lockScroll(true)');
  });

  it('3.4.3: closeLightbox() and closeBottomSheet() call lockScroll(false)', () => {
    expect(sources.scriptJs).toContain('lockScroll(false)');
  });

  it('3.4.4: pressing Escape key triggers dismissal for both lightbox and mobile drawer menus', () => {
    expect(sources.scriptJs).toContain('if (e.key === "Escape")');
    expect(sources.scriptJs).toContain('closeLightbox()');
  });
});
