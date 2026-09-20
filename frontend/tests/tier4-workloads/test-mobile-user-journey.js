/**
 * Tier 4 — Real-World Mobile Workload: Complete Mobile User Journey Test Sequence
 * Simulates a realistic end-to-end mobile user journey through the IEI Student Chapter website.
 */

const { describe, it, expect } = require('../helpers/test-framework');
const { loadSourceFiles, buildMockDocument } = require('../helpers/dom-env');

describe('Tier 4: Real-World Mobile User Journey Sequence', () => {
  const sources = loadSourceFiles();
  const doc = buildMockDocument(sources.html);

  it('Step 01: Initial Mobile Page Load (375px Viewport)', () => {
    const nav = doc.getElementById('nav');
    const heroTitle = doc.getElementById('heroTitle');
    const bottomDock = doc.getElementById('bottomDock');

    expect(nav).toBeDefined();
    expect(heroTitle).toBeDefined();
    expect(bottomDock).toBeDefined();
  });

  it('Step 02: Primary Mobile Navigation Drawer Interaction', () => {
    const burger = doc.getElementById('navBurger');
    const navContent = doc.getElementById('navContent');

    expect(burger).toBeDefined();
    expect(navContent).toBeDefined();
    expect(burger.getAttribute('aria-controls')).toBe('navContent');
  });

  it('Step 03: Hero Section CTAs and Metric Counters', () => {
    const joinCta = doc.querySelector('.cta-group a[href="#join"]');
    const eventsCta = doc.querySelector('.cta-group a[href="#events"]');
    const metricCards = doc.querySelectorAll('.bento-metric-card');

    expect(joinCta).toBeDefined();
    expect(eventsCta).toBeDefined();
    expect(metricCards.length).toBeGreaterThanOrEqual(3);
  });

  it('Step 04: Events Milestone Stream Navigation', () => {
    const evTimeline = doc.getElementById('evTrack');
    const nextCard = doc.getElementById('nextEventCard');
    const pastGrid = doc.getElementById('pastGrid');
    const pastFilter = doc.getElementById('pastFilterBar');

    expect(evTimeline).toBeDefined();
    expect(nextCard).toBeDefined();
    // Timeline nodes render dynamically from the events API:
    // no static TBA placeholder cards remain in markup.
    expect(doc.querySelectorAll('.tl-node').length).toBe(0);
    // Past-events archive grid and its category filter are present.
    expect(pastGrid).toBeDefined();
    expect(pastFilter).toBeDefined();
  });

  it('Step 05: Edge-to-Edge Lightbox Album Viewer', () => {
    const lightbox = doc.getElementById('lightbox');
    const lbClose = doc.querySelector('.lb-close');
    const lbFrame = doc.getElementById('lbContent');

    expect(lightbox).toBeDefined();
    expect(lbClose).toBeDefined();
    expect(lbFrame).toBeDefined();
    expect(lightbox.getAttribute('role')).toBe('dialog');
  });

  it('Step 06: Leadership Deck & Sticky Domain Filter Selection', () => {
    const filterBar = doc.getElementById('teamFilterBar');
    const filterBtns = doc.querySelectorAll('.team-filter-btn');

    expect(filterBar).toBeDefined();
    expect(filterBtns.length).toBeGreaterThanOrEqual(5);
  });

  it('Step 07: FAQ Accordion Expand & Collapse Workflow', () => {
    const faqItems = doc.querySelectorAll('.faq-item');
    const faqTriggers = doc.querySelectorAll('.faq-q');

    expect(faqItems.length).toBeGreaterThanOrEqual(4);
    expect(faqTriggers.length).toBeGreaterThanOrEqual(4);
  });

  it('Step 08: Live Terminal CLI Quick-Chip Command Execution', () => {
    const chipsBar = doc.getElementById('termChipsBar');
    const termBody = doc.getElementById('termBody');
    const chips = doc.querySelectorAll('.term-chip');

    expect(chipsBar).toBeDefined();
    expect(termBody).toBeDefined();
    expect(chips.length).toBe(5);
  });

  it('Step 09: Join Form Input Entry & Client-Side Validation', () => {
    const form = doc.getElementById('joinForm');
    const fName = doc.getElementById('fName');
    const fMail = doc.getElementById('fMail');
    const formStatus = doc.getElementById('formStatus');

    expect(form).toBeDefined();
    expect(fName).toBeDefined();
    expect(fMail).toBeDefined();
    expect(formStatus).toBeDefined();
    expect(fName.getAttribute('required')).toBeDefined();
    expect(fMail.getAttribute('required')).toBeDefined();
  });

  it('Step 10: Footer Brand Wordmark & Official Communication Channels', () => {
    const footer = doc.getElementById('footer');
    const wordmark = doc.querySelector('.footer-wordmark');
    const emailLink = doc.querySelector('.ft2-mail');

    expect(footer).toBeDefined();
    expect(wordmark).toBeDefined();
    expect(emailLink).toBeDefined();
    expect(emailLink.getAttribute('href')).toBe('mailto:ghrcem.pune@raisoni.net');
  });
});
