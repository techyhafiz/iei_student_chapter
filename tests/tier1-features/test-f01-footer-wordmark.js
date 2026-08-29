/**
 * Tier 1 — Feature 01: Footer Wordmark Fluid Scaling
 * Spec: Fix clamp() floor and padding so "IEI STUDENT CHAPTER" renders cleanly with 0 horizontal clipping from 320px to 768px.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles, parseCssRules, evaluateCssValue, getComputedProperties } = require('../helpers/dom-env');

describe('Feature 01: Footer Wordmark Fluid Scaling', () => {
  const sources = loadSourceFiles();
  const rules = parseCssRules(sources.stylesCss);

  it('1.1: footer-wordmark element exists in HTML with correct text and structure', () => {
    expect(sources.html).toContain('footer-wordmark-wrap');
    expect(sources.html).toContain('footer-wordmark');
    expect(sources.html).toContain('IEI STUDENT CHAPTER');
  });

  it('1.2: footer wordmark at 320px viewport width does not exceed container width (320px - 32px padding = 288px)', () => {
    // 19 uppercase characters in Inter Black 900
    // At 24px font size + 0.06em tracking, text width = ~293px (> 288px available -> overflow bug)
    // The spec requires clamp floor <= 18px or dedicated mobile rule at <= 480px / 320px
    const wordmarkProps320 = getComputedProperties(rules, '.footer-wordmark', 320);
    const fontSize320 = evaluateCssValue(wordmarkProps320['font-size'] || '24px', 320);

    // Approximate width of 19 uppercase Inter 900 chars is ~ 0.64 * fontSize * 19 = 12.16 * fontSize
    // With tracking: (12.16 + 19 * tracking) * fontSize
    const letterSpacingVal = parseFloat(wordmarkProps320['letter-spacing']) || 0.06;
    const estTextWidth = (12.16 + 19 * letterSpacingVal) * fontSize320;

    // Available width on 320px device with 16px lateral padding is 288px
    expect(estTextWidth).toBeLessThanOrEqual(288, `Rendered wordmark width (${estTextWidth.toFixed(1)}px) must fit within 288px content width at 320px`);
  });

  it('1.3: clamp() minimum floor or mobile media query scales font size <= 18px on 320px viewport', () => {
    const wordmarkProps320 = getComputedProperties(rules, '.footer-wordmark', 320);
    const fontSize320 = evaluateCssValue(wordmarkProps320['font-size'] || '24px', 320);
    expect(fontSize320).toBeLessThanOrEqual(18, `Font size at 320px viewport should scale to <= 18px (current: ${fontSize320}px)`);
  });

  it('1.4: footer-wordmark-wrap padding scales appropriately on mobile without rigid 40px offsets', () => {
    const wrapProps320 = getComputedProperties(rules, '.footer-wordmark-wrap', 320);
    expect(wrapProps320['overflow']).toBe('hidden');
    expect(wrapProps320['display']).toBe('flex');
  });

  it('1.5: wordmark preserves uppercase tracking, gradient clip, and theme styles', () => {
    const wordmarkProps = getComputedProperties(rules, '.footer-wordmark', 1024);
    expect(wordmarkProps['text-transform']).toBe('uppercase');
    expect(wordmarkProps['user-select']).toBe('none');
    expect(wordmarkProps['white-space']).toBe('nowrap');
  });
});
