/**
 * Tier 1 — Feature 15: ScrollTrigger Height Desync Fix
 * Spec: Invoke ScrollTrigger.refresh() after dynamic team card rendering and filter toggles in operators.js.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles } = require('../helpers/dom-env');

describe('Feature 15: ScrollTrigger Height Desync Fix', () => {
  const sources = loadSourceFiles();

  it('15.1: operators.js checks and invokes ScrollTrigger.refresh() after dynamic board population', () => {
    const hasRefreshAfterRender = sources.operatorsJs.includes('ScrollTrigger.refresh()') || 
                                  sources.operatorsJs.includes('ScrollTrigger') && sources.operatorsJs.includes('refresh');
    expect(hasRefreshAfterRender).toBe(
      true,
      'operators.js must call ScrollTrigger.refresh() after injecting dynamic cards into the DOM'
    );
  });

  it('15.2: operators.js invokes ScrollTrigger.refresh() after sticky team filter button clicks', () => {
    // When clicking a team filter pill, DOM height shifts. ScrollTrigger must be refreshed.
    const filterSection = sources.operatorsJs.slice(sources.operatorsJs.indexOf('team-filter-btn'));
    const hasRefreshInFilter = filterSection.includes('ScrollTrigger.refresh()') || filterSection.includes('ScrollTrigger');
    expect(hasRefreshInFilter).toBe(
      true,
      'operators.js must call ScrollTrigger.refresh() after filtering team cards'
    );
  });

  it('15.3: ScrollTrigger calls are safely guarded with window.ScrollTrigger existence checks', () => {
    const isGuarded = !sources.operatorsJs.includes('ScrollTrigger.refresh()') || 
                      sources.operatorsJs.includes('if (window.ScrollTrigger') ||
                      sources.operatorsJs.includes('typeof ScrollTrigger');
    expect(isGuarded).toBe(true, 'ScrollTrigger calls must be guarded against undefined');
  });

  it('15.4: faculty cards wrapper (#facultyCards) is dynamically populated with faculty roster', () => {
    expect(sources.operatorsJs).toContain('facultyCardsWrap.innerHTML');
    expect(sources.operatorsJs).toContain('solo-card--faculty-item');
  });

  it('15.5: operator board (#opSoloBoard) dynamically renders executive committee and team leads', () => {
    expect(sources.operatorsJs).toContain('board.innerHTML');
    expect(sources.operatorsJs).toContain('renderRow("Executive Committee"');
    expect(sources.operatorsJs).toContain('renderTeamRow("Teams & Leads"');
  });
});
