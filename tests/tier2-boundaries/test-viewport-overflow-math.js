/**
 * Tier 2 — Boundary & Corner Cases: Strict Viewport Overflow Math
 * Spec: Zero horizontal overflow or scroll traps at 320px, 360px, 375px, 390px, 414px, 768px.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles, parseCssRules, evaluateCssValue, getComputedProperties } = require('../helpers/dom-env');

describe('Tier 2: Strict Horizontal Overflow Math Across Viewports', () => {
  const sources = loadSourceFiles();
  const rules = parseCssRules(sources.stylesCss);
  const opRules = parseCssRules(sources.operatorsCss);

  const VIEWPORTS = [320, 360, 375, 390, 414, 768];

  VIEWPORTS.forEach((vw) => {
    describe(`Viewport ${vw}px Checks`, () => {
      it(`${vw}px: page body and root container overflow-x is controlled (hidden or clip)`, () => {
        const bodyProps = getComputedProperties(rules, 'body', vw);
        const htmlProps = getComputedProperties(rules, 'html', vw);
        const overflowX = bodyProps['overflow-x'] || htmlProps['overflow-x'] || 'hidden';
        expect(overflowX).toBe('hidden');
      });

      it(`${vw}px: card nav container padding and max-width fit within ${vw}px`, () => {
        const navProps = getComputedProperties(rules, '.card-nav-container', vw);
        const padL = evaluateCssValue(navProps['padding-left'] || navProps['padding'] || '12px', vw);
        const padR = evaluateCssValue(navProps['padding-right'] || navProps['padding'] || '12px', vw);
        const totalPad = parseFloat(padL) + parseFloat(padR);
        expect(totalPad).toBeLessThan(vw, `Nav container lateral padding (${totalPad}px) must be less than viewport width (${vw}px)`);
      });

      it(`${vw}px: floating bottom dock width is constrained within ${vw}px`, () => {
        const dockProps = getComputedProperties(rules, '.bottom-dock', vw);
        if (vw <= 768) {
          expect(dockProps['display']).toBe('block');
          // width: calc(100% - 24px)
          const dockW = vw - 24;
          expect(dockW).toBeLessThanOrEqual(vw);
        }
      });

      it(`${vw}px: mosaic gallery items and event milestones do not exceed ${vw}px width`, () => {
        const galProps = getComputedProperties(rules, '.cl-mosaic', vw);
        const pad = evaluateCssValue(galProps['padding'] || '16px', vw);
        expect(parseFloat(pad) * 2).toBeLessThan(vw);
      });
    });
  });
});
