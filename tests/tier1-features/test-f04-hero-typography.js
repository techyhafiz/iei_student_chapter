/**
 * Tier 1 — Feature 04: Hero Headline Typography Clamp
 * Spec: Refine headline clamp parameters on < 480px viewports to prevent awkward single-word wrapping on 320px screens.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles, parseCssRules, evaluateCssValue, getComputedProperties } = require('../helpers/dom-env');

describe('Feature 04: Hero Headline Typography Clamp', () => {
  const sources = loadSourceFiles();
  const rules = parseCssRules(sources.stylesCss);

  it('4.1: hero headline markup contains structured line spans and brackets', () => {
    expect(sources.html).toContain('id="heroTitle"');
    expect(sources.html).toContain('class="headline"');
    expect(sources.html).toContain('Break Systems');
    expect(sources.html).toContain('Build Engineers');
  });

  it('4.2: hero headline font size at 320px scales down to <= 32px to fit narrow screens', () => {
    const headlineProps320 = getComputedProperties(rules, '.headline', 320);
    const fontSize = evaluateCssValue(headlineProps320['font-size'] || '2.1rem', 320);
    // At 320px, a font size > 32px causes "Break Systems." to awkwardly break across multiple lines
    expect(fontSize).toBeLessThanOrEqual(32, `Headline font size at 320px (${fontSize}px) must be <= 32px for clean 2-line layout`);
  });

  it('4.3: hero headline line spans display block or flex to ensure balanced 2-row layout', () => {
    const lineProps = getComputedProperties(rules, '.headline-line', 375);
    expect(lineProps['display']).toBe('block');
  });

  it('4.4: hero CTA group stacks vertically on mobile (< 480px) for thumb reachability', () => {
    const ctaGroupMobile = getComputedProperties(rules, '.cta-group', 375);
    const isStacked = ctaGroupMobile['flex-direction'] === 'column' || ctaGroupMobile['width'] === '100%';
    expect(isStacked).toBe(true, 'CTA group should stack or span full width on mobile viewports');
  });

  it('4.5: organized-by pill uses inline-flex display and scales within mobile container', () => {
    const pillProps = getComputedProperties(rules, '.organized-by-pill', 320);
    expect(pillProps['display']).toBe('inline-flex');
    expect(pillProps['align-items']).toBe('center');
  });
});
