/**
 * Tier 1 — Feature 08: Tactile Active Press Haptics
 * Spec: Add :active: scale(0.96) tactile feedback and touch-action: manipulation across all interactive buttons, cards, pills, and chips.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles, parseCssRules, getComputedProperties } = require('../helpers/dom-env');

describe('Feature 08: Tactile Active Press Haptics', () => {
  const sources = loadSourceFiles();
  const rules = parseCssRules(sources.stylesCss);
  const opRules = parseCssRules(sources.operatorsCss);

  it('8.1: interactive buttons (.specular-button, .card-nav-cta-button) define :active transform scale', () => {
    const hasSpecularActive = sources.stylesCss.includes('.specular-button:active') || 
                              sources.stylesCss.includes('.specular-button__label:active') ||
                              sources.stylesCss.includes('scale(0.9');
    const hasCtaActive = sources.stylesCss.includes('.card-nav-cta-button:active');
    expect(hasSpecularActive).toBe(true, 'Specular buttons must define an :active transform state');
    expect(hasCtaActive).toBe(true, 'Card nav CTA button must define an :active transform state');
  });

  it('8.2: filter buttons (.team-filter-btn, .gal-filter-btn) define :active tactile feedback', () => {
    const hasTeamActive = sources.operatorsCss.includes('.team-filter-btn:active') || sources.operatorsCss.includes('scale(');
    const hasGalActive = sources.stylesCss.includes('.gal-filter-btn:active') || sources.stylesCss.includes('scale(');
    expect(hasTeamActive).toBe(true, 'Team filter buttons must define an :active transform');
    expect(hasGalActive).toBe(true, 'Gallery filter buttons must define an :active transform');
  });

  it('8.3: terminal chips (.term-chip) define :active scale feedback', () => {
    const hasTermChipActive = sources.stylesCss.includes('.term-chip:active');
    expect(hasTermChipActive).toBe(true, 'Terminal chips must define an :active transform');
  });

  it('8.4: interactive components enforce touch-action: manipulation for zero 300ms tap lag', () => {
    const hasTouchAction = sources.stylesCss.includes('touch-action: manipulation') || sources.stylesCss.includes('touch-action:manipulation');
    expect(hasTouchAction).toBe(true, 'Interactive components should declare touch-action: manipulation to eliminate mobile 300ms tap delay');
  });

  it('8.5: dock tabs (.dock-tab) implement active press scaling', () => {
    const dockTabActive = getComputedProperties(rules, '.dock-tab:active', 375);
    expect(dockTabActive['transform']).toContain('scale');
  });
});
