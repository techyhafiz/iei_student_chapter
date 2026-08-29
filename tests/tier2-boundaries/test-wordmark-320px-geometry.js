/**
 * Tier 2 — Boundary & Corner Cases: Wordmark 320px Viewport Geometry Math
 * Spec: Mathematical verification of 19-character "IEI STUDENT CHAPTER" rendered width vs container width on 320px screens.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles, parseCssRules, evaluateCssValue, getComputedProperties } = require('../helpers/dom-env');

describe('Tier 2: Wordmark 320px Viewport Geometry Math', () => {
  const sources = loadSourceFiles();
  const rules = parseCssRules(sources.stylesCss);

  it('2.4.1: font-size clamp evaluation at 320px viewport', () => {
    const wordmarkProps = getComputedProperties(rules, '.footer-wordmark', 320);
    const rawClamp = wordmarkProps['font-size'] || '24px';
    const computedFontSize = evaluateCssValue(rawClamp, 320);

    // If clamp is clamp(24px, 5.2vw, 84px): at 320px, 5.2vw = 16.64px < 24px -> locks at 24px.
    // 24px is too large and causes overflow. The remediation requires clamp floor <= 18px or mobile rule.
    expect(computedFontSize).toBeLessThanOrEqual(
      18,
      `Wordmark font size at 320px must be <= 18px to prevent text clipping (current evaluated size: ${computedFontSize}px)`
    );
  });

  it('2.4.2: container available content width calculation (320px - left/right padding)', () => {
    const wrapProps = getComputedProperties(rules, '.footer-wordmark-wrap', 320);
    const padL = evaluateCssValue(wrapProps['padding-left'] || '16px', 320);
    const padR = evaluateCssValue(wrapProps['padding-right'] || '16px', 320);
    const availableWidth = 320 - (parseFloat(padL) + parseFloat(padR));

    expect(availableWidth).toBeGreaterThanOrEqual(270);
    expect(availableWidth).toBeLessThanOrEqual(300);
  });

  it('2.4.3: total 19-character glyph string width fits within available width', () => {
    const wordmarkProps = getComputedProperties(rules, '.footer-wordmark', 320);
    const fontSize = evaluateCssValue(wordmarkProps['font-size'] || '24px', 320);
    const letterSpacing = parseFloat(wordmarkProps['letter-spacing']) || 0.06;

    // Glyphs in "IEI STUDENT CHAPTER":
    // I (0.32), E (0.62), I (0.32), ' ' (0.30), S (0.60), T (0.58), U (0.64), D (0.64), E (0.62), N (0.64), T (0.58), ' ' (0.30), C (0.64), H (0.66), A (0.66), P (0.60), T (0.58), E (0.62), R (0.64)
    // Sum of relative widths ~ 10.74 * fontSize
    // With letter spacing across 19 chars: (10.74 + 19 * letterSpacing) * fontSize
    const totalRenderedWidth = (10.74 + 19 * letterSpacing) * fontSize;

    const wrapProps = getComputedProperties(rules, '.footer-wordmark-wrap', 320);
    const padL = parseFloat(evaluateCssValue(wrapProps['padding-left'] || '16px', 320));
    const padR = parseFloat(evaluateCssValue(wrapProps['padding-right'] || '16px', 320));
    const availableWidth = 320 - (padL + padR);

    expect(totalRenderedWidth).toBeLessThanOrEqual(
      availableWidth,
      `Calculated wordmark text width (${totalRenderedWidth.toFixed(1)}px) exceeds available container width (${availableWidth}px) at 320px viewport`
    );
  });
});
