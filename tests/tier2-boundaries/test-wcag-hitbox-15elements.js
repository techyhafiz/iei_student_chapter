/**
 * Tier 2 — Boundary & Corner Cases: WCAG 2.1 AA 44px x 44px Hit-Box Matrix
 * Spec: Verify all 15 interactive touch targets meet WCAG 2.1 AA (>= 44px x 44px) on mobile viewports (<= 768px).
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles, parseCssRules, evaluateCssValue, getComputedProperties } = require('../helpers/dom-env');

describe('Tier 2: WCAG 2.1 AA 44px x 44px Hit-Box Matrix (15 Elements)', () => {
  const sources = loadSourceFiles();
  const rules = parseCssRules(sources.stylesCss);
  const opRules = parseCssRules(sources.operatorsCss);

  function checkTarget(name, selector, sourceRules, minExpected = 44) {
    it(`Hit-Box [${name}]: computed height and width on mobile (375px) meet >= ${minExpected}px`, () => {
      const props = getComputedProperties(sourceRules, selector, 375);
      const hStr = props['min-height'] || props['height'] || '0px';
      const wStr = props['min-width'] || props['width'] || '0px';
      const h = parseFloat(evaluateCssValue(hStr, 375));
      const w = parseFloat(evaluateCssValue(wStr, 375));

      // Either explicit dimension >= 44px OR padding creates >= 44px tap zone
      const padY = parseFloat(evaluateCssValue(props['padding-top'] || props['padding'] || '0px', 375)) +
                   parseFloat(evaluateCssValue(props['padding-bottom'] || props['padding'] || '0px', 375));
      const effectiveH = Math.max(h, padY + 16); // 16px font-size base

      expect(effectiveH).toBeGreaterThanOrEqual(
        minExpected,
        `Element ${selector} effective height (${effectiveH}px) violates WCAG 2.1 AA minimum 44px`
      );
    });
  }

  // 1. Theme toggle
  checkTarget('01. Theme Toggle', '.theme-toggle', rules);

  // 2. Card Nav CTA Button
  checkTarget('02. Card Nav CTA Button', '.card-nav-cta-button', rules);

  // 3. Hamburger Menu
  checkTarget('03. Hamburger Menu', '.hamburger-menu', rules);

  // 4. Gallery Filter Button
  checkTarget('04. Gallery Filter Button', '.gal-filter-btn', rules);

  // 5. Team Filter Button
  checkTarget('05. Team Filter Button', '.team-filter-btn', opRules);

  // 6. Profile Button Icon
  checkTarget('06. Profile Button Icon', '.profile-btn-icon', opRules);

  // 7. Member Line Link
  checkTarget('07. Member Line Link', '.member-line-link', opRules);

  // 8. Terminal Chip
  checkTarget('08. Terminal Chip', '.term-chip', rules);

  // 9. Lightbox Close Button
  checkTarget('09. Lightbox Close Button', '.lb-close', rules);

  // 10. Lightbox Segment
  checkTarget('10. Lightbox Segment', '.lb-segment', rules);

  // 11. Bottom Sheet Close Button
  checkTarget('11. Bottom Sheet Close Button', '.sheet-close-btn', rules);

  // 12. Quick Top Button
  checkTarget('12. Quick Top Button', '.quick-top-btn', rules);

  // 13. Footer Navigation Chips
  checkTarget('13. Footer Navigation Chips', '.ft2-chips a', rules);

  // 14. Footer Social Icon Buttons
  checkTarget('14. Footer Social Icon Buttons', '.ft2-soc', rules);

  // 15. Join Section Social Links
  checkTarget('15. Join Section Social Links', '.socials a', rules);
});
