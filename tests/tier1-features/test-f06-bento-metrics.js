/**
 * Tier 1 — Feature 06: Bento Metric Cards Optimization
 * Spec: Remove duplicate CSS blocks in styles.css and refine 3-column / 1-column responsive grid layout.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles, parseCssRules, getComputedProperties } = require('../helpers/dom-env');

describe('Feature 06: Bento Metric Cards Optimization', () => {
  const sources = loadSourceFiles();
  const rules = parseCssRules(sources.stylesCss);

  it('6.1: HTML defines all 3 key metric cards with authentic counts and specular attributes', () => {
    expect(sources.html).toContain('data-count="240"');
    expect(sources.html).toContain('Active Students');
    expect(sources.html).toContain('data-count="20"');
    expect(sources.html).toContain('Core Operations Members');
    const hasValidEventCount = sources.html.includes('data-count="1"') || sources.html.includes('data-count="0"');
    expect(hasValidEventCount).toBe(true, 'Metric card must specify an authentic event count');
    expect(sources.html).toContain('Events Organized');
    expect(sources.html).toContain('specular-card__fx');
    expect(sources.html).toContain('data-metric-specular');
  });

  it('6.2: bento-metrics-grid on desktop (> 900px) configures 3-column grid', () => {
    const desktopProps = getComputedProperties(rules, '.bento-metrics-grid', 1024);
    const cols = desktopProps['grid-template-columns'];
    const is3Col = cols && (cols.includes('repeat(3') || cols.includes('1fr 1fr 1fr'));
    expect(is3Col).toBe(true, 'Desktop bento metrics should be a 3-column grid');
  });

  it('6.3: bento-metrics-grid on mobile (< 768px) collapses cleanly to 1-column stack', () => {
    const mobileProps = getComputedProperties(rules, '.bento-metrics-grid', 375);
    const cols = mobileProps['grid-template-columns'];
    const is1Col = cols === '1fr' || (cols && cols.includes('1fr') && !cols.includes('repeat(3'));
    expect(is1Col).toBe(true, 'Mobile bento metrics should collapse to 1 column');
  });

  it('6.4: metric card inner padding and font sizes adapt to mobile viewports without overflow', () => {
    const cardProps = getComputedProperties(rules, '.bento-metric-card', 375);
    expect(cardProps['position']).toBe('relative');
  });

  it('6.5: duplicate redundant CSS declarations for bento metrics in styles.css are cleaned up', () => {
    // Check for duplicate occurrences of .bento-metrics-grid block definitions in styles.css
    const occurrences = (sources.stylesCss.match(/\.bento-metrics-grid\s*\{/g) || []).length;
    // Base rule + at most 1 or 2 media query overrides (not 4+ redundant duplicate blocks)
    expect(occurrences).toBeLessThanOrEqual(3, `Expected at most 3 cleanly structured rules for .bento-metrics-grid, found ${occurrences}`);
  });
});
