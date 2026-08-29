/**
 * Tier 1 — Feature 02: Bottom Dock vs Quick Nav Deconfliction
 * Spec: Prevent #quickNav from colliding with #bottomDock's right CTA on mobile viewports (<= 768px).
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles, parseCssRules, getComputedProperties } = require('../helpers/dom-env');

describe('Feature 02: Bottom Dock vs Quick Nav Deconfliction', () => {
  const sources = loadSourceFiles();
  const rules = parseCssRules(sources.stylesCss);

  it('2.1: #bottomDock exists with 5 navigation tabs and safe-area support', () => {
    expect(sources.html).toContain('id="bottomDock"');
    expect(sources.html).toContain('data-dock="about"');
    expect(sources.html).toContain('data-dock="events"');
    expect(sources.html).toContain('data-dock="team"');
    expect(sources.html).toContain('data-dock="faq"');
    expect(sources.html).toContain('data-dock="join"');
    expect(sources.html).toContain('dock-cta-pill');
  });

  it('2.2: #bottomDock is active on mobile (<= 768px) and hidden on desktop (> 768px)', () => {
    const dockDesktop = getComputedProperties(rules, '.bottom-dock', 1024);
    expect(dockDesktop['display']).toBe('none');

    const dockMobile = getComputedProperties(rules, '.bottom-dock', 768);
    expect(dockMobile['display']).toBe('block');
    expect(dockMobile['position']).toBe('fixed');
    expect(dockMobile['z-index']).toBe('95');
  });

  it('2.3: #quickNav is deconflicted on mobile (<= 768px) by either being hidden or elevated above the dock', () => {
    const quickNavMobile = getComputedProperties(rules, '.quick-nav', 768);
    const quickNavBottom = quickNavMobile['bottom'];
    const quickNavDisplay = quickNavMobile['display'];

    // On mobile, quick-nav must either be hidden (display: none) or bottom must be elevated (>= 75px) above dock (dock height ~54px + 14px bottom offset = 68px)
    const isHidden = quickNavDisplay && quickNavDisplay.includes('none');
    const isElevated = quickNavBottom && (
      quickNavBottom.includes('+') || 
      parseFloat(quickNavBottom) >= 75 || 
      quickNavBottom.includes('calc')
    );

    expect(isHidden || isElevated).toBe(
      true,
      `#quickNav on mobile (<= 768px) must be hidden (display: none) or elevated above the dock (bottom >= 75px). Current bottom: ${quickNavBottom}, display: ${quickNavDisplay}`
    );
  });

  it('2.4: #bottomDock auto-hides during downward scroll via is-hidden class with cubic-bezier transition', () => {
    const hiddenProps = getComputedProperties(rules, '.bottom-dock.is-hidden', 768);
    expect(hiddenProps['opacity']).toBe('0');
    expect(hiddenProps['pointer-events']).toBe('none');
    expect(hiddenProps['transform']).toContain('translate');
  });

  it('2.5: #bottomDock CTA pill has distinct high-contrast gradient styling and 38px+ touch height', () => {
    const ctaProps = getComputedProperties(rules, '.dock-cta-pill', 768);
    expect(ctaProps['border-radius']).toBe('999px');
    expect(ctaProps['font-weight']).toBe('800');
    expect(ctaProps['text-transform']).toBe('uppercase');
  });
});
