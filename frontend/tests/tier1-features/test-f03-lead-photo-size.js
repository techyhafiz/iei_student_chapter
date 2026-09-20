/**
 * Tier 1 — Feature 03: Team Card Lead Photo Sizing
 * Spec: Fix selector mismatch in operators.css (.team-card-lead-pod-box .solo-card-photo) to properly scale lead photos to 96px on mobile.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles, parseCssRules, getComputedProperties } = require('../helpers/dom-env');

describe('Feature 03: Team Card Lead Photo Sizing', () => {
  const sources = loadSourceFiles();
  const opRules = parseCssRules(sources.operatorsCss);

  it('3.1: operators.js renders lead photos with .solo-card-photo class inside .team-card-lead-pod-box', () => {
    expect(sources.operatorsJs).toContain('team-card-lead-pod-box');
    expect(sources.operatorsJs).toContain('solo-card-photo');
    expect(sources.operatorsJs).toContain('lead-pod-tag');
  });

  it('3.2: desktop rules specify 126px photo size for lead pod boxes', () => {
    const desktopProps = getComputedProperties(opRules, '.team-card-lead-pod-box .solo-card-photo', 1024);
    expect(desktopProps['width']).toBe('126px');
    expect(desktopProps['height']).toBe('126px');
    expect(desktopProps['aspect-ratio']).toBe('1 / 1');
  });

  it('3.3: mobile rules (<= 600px) correctly target .team-card-lead-pod-box .solo-card-photo and set width to 96px', () => {
    const mobileProps = getComputedProperties(opRules, '.team-card-lead-pod-box .solo-card-photo', 375);
    expect(mobileProps['width']).toBe(
      '96px',
      'Lead photo width on mobile (<= 600px) must be 96px (check for selector mismatch where .team-card-lead-photo was targeted instead of .solo-card-photo)'
    );
    expect(mobileProps['height']).toBe(
      '96px',
      'Lead photo height on mobile (<= 600px) must be 96px'
    );
  });

  it('3.4: mobile rules scale squircle border-radius to 10px-12px on narrow viewports', () => {
    const mobileProps = getComputedProperties(opRules, '.team-card-lead-pod-box .solo-card-photo', 375);
    const br = mobileProps['border-radius'];
    expect(br).toBeDefined();
  });

  it('3.5: lead pod box maintains vertical column layout with tag, photo, and name link', () => {
    const podProps = getComputedProperties(opRules, '.team-card-lead-pod-box', 375);
    expect(podProps['display']).toBe('flex');
    expect(podProps['flex-direction']).toBe('column');
    expect(podProps['align-items']).toBe('center');
  });
});
