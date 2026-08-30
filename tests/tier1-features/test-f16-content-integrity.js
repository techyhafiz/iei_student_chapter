/**
 * Tier 1 — Feature 16: Content & Contact Data Preservation
 * Spec: Preserve authentic GHRCEMP Wagholi details, ghrcem.pune@raisoni.net, and leadership data with 100% integrity.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles } = require('../helpers/dom-env');

describe('Feature 16: Content & Contact Data Preservation', () => {
  const sources = loadSourceFiles();

  it('16.1: official college email (ghrcem.pune@raisoni.net) is present and correctly linked', () => {
    expect(sources.html).toContain('mailto:ghrcem.pune@raisoni.net');
    expect(sources.html).toContain('ghrcem.pune@raisoni.net');
  });

  it('16.2: authentic college and department branding is maintained across all sections', () => {
    expect(sources.html).toContain('G H Raisoni College');
    expect(sources.html).toContain('Department of Cyber Security');
    expect(sources.html).toContain('Wagholi, Pune');
    expect(sources.html).toContain('The Institution of Engineers (India)');
  });

  it('16.3: complete student executive roster is defined in operators data', () => {
    expect(sources.operatorsJs).toContain('President');
    expect(sources.operatorsJs).toContain('Vice President');
    expect(sources.operatorsJs).toContain('Kunal Bankhele');
    expect(sources.operatorsJs).toContain('Secretary');
  });

  it('16.4: domain leads and member teams are fully defined in operators data', () => {
    expect(sources.operatorsJs).toContain('Samiksha Kotkar');
    expect(sources.operatorsJs).toContain('Akshay Narote');
    expect(sources.operatorsJs).toContain('Anisha Sasane');
    expect(sources.operatorsJs).toContain('Ayush Singh');
  });

  it('16.5: external social links enforce target="_blank" and rel="noopener noreferrer"', () => {
    // Check external links in index.html
    const externalLinks = sources.html.match(/<a[^>]+target="_blank"[^>]*>/g) || [];
    expect(externalLinks.length).toBeGreaterThan(0);
    externalLinks.forEach((linkTag) => {
      expect(linkTag).toContain('rel="noopener noreferrer"');
    });
  });
});
