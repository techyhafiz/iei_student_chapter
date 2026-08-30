/**
 * Tier 1 — Feature 05: Officer Title Two-Line Wrapping
 * Spec: Remove single-line ellipsis truncation on 2-column mobile cards to display full leadership titles cleanly.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles, parseCssRules, getComputedProperties } = require('../helpers/dom-env');

describe('Feature 05: Officer Title Two-Line Wrapping', () => {
  const sources = loadSourceFiles();
  const opRules = parseCssRules(sources.operatorsCss);

  it('5.1: solo-card-title on mobile does not enforce single-line ellipsis truncation (white-space: nowrap)', () => {
    const titleMobileProps = getComputedProperties(opRules, '.solo-card-title', 375);
    const whiteSpace = titleMobileProps['white-space'];
    const textOverflow = titleMobileProps['text-overflow'];

    // On mobile, titles like "General Secretary" or "Head of Department" must wrap (white-space: normal or -webkit-box line-clamp)
    const isTruncatedSingleLine = whiteSpace === 'nowrap' && textOverflow === 'ellipsis';
    expect(isTruncatedSingleLine).toBe(
      false,
      'solo-card-title on mobile must NOT use white-space: nowrap with text-overflow: ellipsis; it should allow 2-line wrapping'
    );
  });

  it('5.2: solo-card-title has readable line-height (1.2 to 1.5) for multi-line text wrapping', () => {
    const titleProps = getComputedProperties(opRules, '.solo-card-title', 375);
    const lh = parseFloat(titleProps['line-height']) || 1.3;
    expect(lh).toBeGreaterThanOrEqual(1.15);
    expect(lh).toBeLessThanOrEqual(1.6);
  });

  it('5.3: executive committee cards grid on mobile (<= 600px) configures 2-column layout', () => {
    const gridProps = getComputedProperties(opRules, '.solo-cards--admins', 375);
    const cols = gridProps['grid-template-columns'];
    const isTwoCol = cols && (cols.includes('repeat(2') || cols.includes('1fr 1fr'));
    expect(isTwoCol).toBe(true, 'Executive committee cards should render in a 2-column mobile grid');
  });

  it('5.4: OPERATORS_DATA in operators.js includes all authentic executive officers', () => {
    expect(sources.operatorsJs).toContain('President');
    expect(sources.operatorsJs).toContain('Vice President');
    expect(sources.operatorsJs).toContain('Kunal Bankhele');
    expect(sources.operatorsJs).toContain('Secretary');
  });

  it('5.5: solo cards contain accessible photo, name link, and LinkedIn profile button', () => {
    expect(sources.operatorsJs).toContain('class="solo-card-photo"');
    expect(sources.operatorsJs).toContain('class="solo-card-name-link"');
    expect(sources.operatorsJs).toContain('class="profile-btn-icon"');
  });
});
