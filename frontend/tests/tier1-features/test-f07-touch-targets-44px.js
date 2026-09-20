/**
 * Tier 1 — Feature 07: System-Wide 44px+ Touch Targets
 * Spec: Enforce WCAG 2.1 AA (>= 44px x 44px) hit areas on navbar, filter pills, terminal chips, profile buttons, lightbox controls, and footer links.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles, parseCssRules, evaluateCssValue, getComputedProperties } = require('../helpers/dom-env');

describe('Feature 07: System-Wide 44px+ Touch Targets', () => {
  const sources = loadSourceFiles();
  const rules = parseCssRules(sources.stylesCss);
  const opRules = parseCssRules(sources.operatorsCss);

  function getHitSize(cssProps, defaultW = 44, defaultH = 44) {
    const w = evaluateCssValue(cssProps['min-width'] || cssProps['width'] || defaultW, 375);
    const h = evaluateCssValue(cssProps['min-height'] || cssProps['height'] || defaultH, 375);
    return { w: parseFloat(w), h: parseFloat(h) };
  }

  it('7.1: navbar controls (.theme-toggle, .card-nav-cta-button, .hamburger-menu) meet >= 44px hit area on mobile', () => {
    const themeToggleProps = getComputedProperties(rules, '.theme-toggle', 375);
    const burgerProps = getComputedProperties(rules, '.hamburger-menu', 375);
    const ctaProps = getComputedProperties(rules, '.card-nav-cta-button', 375);

    const themeH = parseFloat(evaluateCssValue(themeToggleProps['min-height'] || themeToggleProps['height'] || '36px', 375));
    const burgerH = parseFloat(evaluateCssValue(burgerProps['min-height'] || burgerProps['height'] || '40px', 375));
    const ctaH = parseFloat(evaluateCssValue(ctaProps['min-height'] || ctaProps['height'] || '36px', 375));

    expect(themeH).toBeGreaterThanOrEqual(44, `Theme toggle height on mobile must be >= 44px (current: ${themeH}px)`);
    expect(burgerH).toBeGreaterThanOrEqual(44, `Hamburger menu height on mobile must be >= 44px (current: ${burgerH}px)`);
    expect(ctaH).toBeGreaterThanOrEqual(44, `Navbar CTA button height on mobile must be >= 44px (current: ${ctaH}px)`);
  });

  it('7.2: filter buttons (.gal-filter-btn, .team-filter-btn) meet >= 44px minimum tap target height on mobile', () => {
    const galFilterProps = getComputedProperties(rules, '.gal-filter-btn', 375);
    const teamFilterProps = getComputedProperties(opRules, '.team-filter-btn', 375);

    const galH = parseFloat(evaluateCssValue(galFilterProps['min-height'] || galFilterProps['height'] || '32px', 375));
    const teamH = parseFloat(evaluateCssValue(teamFilterProps['min-height'] || teamFilterProps['height'] || '28px', 375));

    expect(galH).toBeGreaterThanOrEqual(44, `Gallery filter button height on mobile must be >= 44px (current: ${galH}px)`);
    expect(teamH).toBeGreaterThanOrEqual(44, `Team filter button height on mobile must be >= 44px (current: ${teamH}px)`);
  });

  it('7.3: team profile icon links (.profile-btn-icon, .member-line-link) meet >= 44px x 44px hit box on mobile', () => {
    const profileBtnProps = getComputedProperties(opRules, '.profile-btn-icon', 375);
    const memberLinkProps = getComputedProperties(opRules, '.member-line-link', 375);

    const profileH = parseFloat(evaluateCssValue(profileBtnProps['min-height'] || profileBtnProps['height'] || '26px', 375));
    const memberH = parseFloat(evaluateCssValue(memberLinkProps['min-height'] || memberLinkProps['height'] || '40px', 375));

    expect(profileH).toBeGreaterThanOrEqual(44, `Profile button icon height on mobile must be >= 44px (current: ${profileH}px)`);
    expect(memberH).toBeGreaterThanOrEqual(44, `Member line link height on mobile must be >= 44px (current: ${memberH}px)`);
  });

  it('7.4: terminal chips (.term-chip) meet >= 44px hit target height on mobile', () => {
    const chipProps = getComputedProperties(rules, '.term-chip', 375);
    const chipH = parseFloat(evaluateCssValue(chipProps['min-height'] || chipProps['height'] || '28px', 375));
    expect(chipH).toBeGreaterThanOrEqual(44, `Terminal chip height on mobile must be >= 44px (current: ${chipH}px)`);
  });

  it('7.5: modal & utility buttons (.lb-close, .sheet-close-btn, .quick-top-btn, .ft2-soc) meet >= 44px dimensions', () => {
    const lbCloseProps = getComputedProperties(rules, '.lb-close', 375);
    const sheetCloseProps = getComputedProperties(rules, '.sheet-close-btn', 375);
    const quickTopProps = getComputedProperties(rules, '.quick-top-btn', 375);
    const ft2SocProps = getComputedProperties(rules, '.ft2-soc', 375);

    const lbCloseH = parseFloat(evaluateCssValue(lbCloseProps['min-height'] || lbCloseProps['height'] || '42px', 375));
    const sheetCloseH = parseFloat(evaluateCssValue(sheetCloseProps['min-height'] || sheetCloseProps['height'] || '34px', 375));
    const quickTopH = parseFloat(evaluateCssValue(quickTopProps['min-height'] || quickTopProps['height'] || '36px', 375));
    const ft2SocH = parseFloat(evaluateCssValue(ft2SocProps['min-height'] || ft2SocProps['height'] || '38px', 375));

    expect(lbCloseH).toBeGreaterThanOrEqual(44, `Lightbox close button height on mobile must be >= 44px (current: ${lbCloseH}px)`);
    expect(sheetCloseH).toBeGreaterThanOrEqual(44, `Sheet close button height on mobile must be >= 44px (current: ${sheetCloseH}px)`);
    expect(quickTopH).toBeGreaterThanOrEqual(44, `Quick top button height on mobile must be >= 44px (current: ${quickTopH}px)`);
    expect(ft2SocH).toBeGreaterThanOrEqual(44, `Footer social button height on mobile must be >= 44px (current: ${ft2SocH}px)`);
  });
});
