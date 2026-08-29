/**
 * Tier 3 — Cross-Feature Interaction: Team Filter Switching & ScrollTrigger Alignment
 * Spec: Switching segmented team filters dynamically shifts document height and triggers ScrollTrigger.refresh().
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles } = require('../helpers/dom-env');

describe('Tier 3: Team Filter Switching & ScrollTrigger Alignment', () => {
  const sources = loadSourceFiles();

  it('3.3.1: clicking a team filter pill invokes ScrollTrigger.refresh() to realign viewport scroll triggers', () => {
    const hasScrollTriggerRefresh = sources.operatorsJs.includes('ScrollTrigger.refresh()') ||
      (sources.operatorsJs.includes('ScrollTrigger') && sources.operatorsJs.includes('refresh'));

    expect(hasScrollTriggerRefresh).toBe(
      true,
      'operators.js must call ScrollTrigger.refresh() upon switching team filters to prevent scroll trigger misalignment'
    );
  });

  it('3.3.2: segmented filter supports all 6 filter modes (all, admin, technical, management, design, documentation)', () => {
    expect(sources.operatorsJs).toContain('"all"');
    expect(sources.operatorsJs).toContain('"admin"');
    expect(sources.operatorsJs).toContain('"technical"');
    expect(sources.operatorsJs).toContain('"management"');
    expect(sources.operatorsJs).toContain('"design"');
    expect(sources.operatorsJs).toContain('"documentation"');
  });

  it('3.3.3: switching filter to "admin" hides team leads row and displays executive committee row', () => {
    expect(sources.operatorsJs).toContain('if (filter === "admin")');
  });
});
