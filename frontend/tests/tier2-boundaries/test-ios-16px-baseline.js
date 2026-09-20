/**
 * Tier 2 — Boundary & Corner Cases: iOS 16px Form Baseline
 * Spec: Ensure all form inputs, selects, and textareas enforce font-size: 16px across mobile and tablet viewports to avoid iOS Safari virtual keyboard auto-zoom.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles, parseCssRules, evaluateCssValue, getComputedProperties } = require('../helpers/dom-env');

describe('Tier 2: iOS 16px Form Input Baseline', () => {
  const sources = loadSourceFiles();
  const rules = parseCssRules(sources.stylesCss);

  const FORM_SELECTORS = [
    { name: 'Field Inputs (.field input)', sel: '.field input' },
    { name: 'Field Selects (.field select)', sel: '.field select' },
    { name: 'Field Textareas (.field textarea)', sel: '.field textarea' },
    { name: 'Name Input (#fName)', sel: '#fName' },
    { name: 'Email Input (#fMail)', sel: '#fMail' }
  ];

  const VIEWPORTS = [320, 360, 375, 390, 414, 768, 834, 1024];

  VIEWPORTS.forEach((vw) => {
    FORM_SELECTORS.forEach((ctrl) => {
      it(`Viewport ${vw}px: ${ctrl.name} enforces font-size >= 16px`, () => {
        const props = getComputedProperties(rules, ctrl.sel, vw);
        // Fallback to base .field input if specific ID not overridden
        const baseProps = getComputedProperties(rules, '.field input', vw);
        const rawFs = props['font-size'] || baseProps['font-size'] || '16px';
        const computedFs = evaluateCssValue(rawFs, vw);

        expect(computedFs).toBeGreaterThanOrEqual(
          16,
          `Form element ${ctrl.sel} has font-size ${computedFs}px at ${vw}px viewport width, which triggers iOS Safari auto-zoom (must be >= 16px)`
        );
      });
    });
  });
});
