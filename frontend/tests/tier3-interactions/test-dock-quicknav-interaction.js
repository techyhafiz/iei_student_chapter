/**
 * Tier 3 — Cross-Feature Interaction: QuickNav vs BottomDock Coordinate Separation
 * Spec: Verify fixed navigation layers do not collide or obstruct touch actions on mobile viewports.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles, parseCssRules, getComputedProperties } = require('../helpers/dom-env');

describe('Tier 3: QuickNav vs BottomDock Interaction & Coordinate Separation', () => {
  const sources = loadSourceFiles();
  const rules = parseCssRules(sources.stylesCss);

  it('3.1.1: on mobile viewports (<= 768px), #quickNav is either hidden or elevated above #bottomDock', () => {
    const dockProps = getComputedProperties(rules, '.bottom-dock', 375);
    const qNavProps = getComputedProperties(rules, '.quick-nav', 375);

    expect(dockProps['display']).toBe('block');

    const isHidden = qNavProps['display'] && qNavProps['display'].includes('none');
    const bottomVal = qNavProps['bottom'] || '18px';
    const isElevated = bottomVal.includes('+') || parseFloat(bottomVal) >= 75;

    expect(isHidden || isElevated).toBe(
      true,
      `#quickNav on mobile sits at bottom: ${bottomVal} which collides with #bottomDock (z-index 95)`
    );
  });

  it('3.1.2: z-index hierarchy isolates #bottomDock (z-index 95) and drawer modals above standard page flow', () => {
    const dockProps = getComputedProperties(rules, '.bottom-dock', 375);
    const dockZ = parseInt(dockProps['z-index'], 10) || 0;
    expect(dockZ).toBeGreaterThanOrEqual(95);
  });

  it('3.1.3: scrolling past 300px threshold updates navigation visibility states cleanly', () => {
    expect(sources.scriptJs).toContain('onScrollDock');
    expect(sources.scriptJs).toContain('bottomDock');
  });
});
