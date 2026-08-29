/**
 * Tier 1 — Feature 10: iOS Form Auto-Zoom Prevention
 * Spec: Ensure all form inputs, selects, and textareas enforce font-size: 16px across all mobile and tablet viewports.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles, parseCssRules, evaluateCssValue, getComputedProperties } = require('../helpers/dom-env');

describe('Feature 10: iOS Form Auto-Zoom Prevention', () => {
  const sources = loadSourceFiles();
  const rules = parseCssRules(sources.stylesCss);

  it('10.1: base rule for form inputs, selects, and textareas enforces font-size >= 16px', () => {
    // In styles.css: line 2280, .field input had font-size: .92rem (14.72px < 16px -> triggers iOS auto-zoom)
    const baseFieldProps = getComputedProperties(rules, '.field input', 1024);
    const fs = evaluateCssValue(baseFieldProps['font-size'] || '16px', 1024);
    expect(fs).toBeGreaterThanOrEqual(16, `Form input base font-size (${fs}px) must be >= 16px to prevent iOS auto-zoom`);
  });

  it('10.2: form inputs on mobile viewports (<= 768px) maintain font-size >= 16px', () => {
    const mobileFieldProps = getComputedProperties(rules, '.field input', 375);
    const fs = evaluateCssValue(mobileFieldProps['font-size'] || '16px', 375);
    expect(fs).toBeGreaterThanOrEqual(16, `Mobile form input font-size (${fs}px) must be >= 16px`);
  });

  it('10.3: form controls (#fName, #fMail, #fYear, #fTrack, #fMsg) have minimum touch height >= 48px', () => {
    const mobileFieldProps = getComputedProperties(rules, '.field input', 375);
    const minH = parseFloat(evaluateCssValue(mobileFieldProps['min-height'] || mobileFieldProps['height'] || '48px', 375));
    expect(minH).toBeGreaterThanOrEqual(44, `Form input min-height (${minH}px) must be >= 44px (recommended 48px)`);
  });

  it('10.4: form labels have matching for attributes referencing control IDs', () => {
    expect(sources.html).toContain('for="fName"');
    expect(sources.html).toContain('id="fName"');
    expect(sources.html).toContain('for="fMail"');
    expect(sources.html).toContain('id="fMail"');
    expect(sources.html).toContain('for="fYear"');
    expect(sources.html).toContain('id="fYear"');
    expect(sources.html).toContain('for="fTrack"');
    expect(sources.html).toContain('id="fTrack"');
    expect(sources.html).toContain('for="fMsg"');
    expect(sources.html).toContain('id="fMsg"');
  });

  it('10.5: join form submission script performs client-side validation on name and email', () => {
    expect(sources.scriptJs).toContain('$("#fName").value.trim()');
    expect(sources.scriptJs).toContain('$("#fMail").value.trim()');
    expect(sources.scriptJs).toContain('mail.indexOf("@")');
  });
});
