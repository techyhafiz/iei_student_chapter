#!/usr/bin/env node

/**
 * ============================================================================
 * IEI Student Chapter — Mobile Overhaul E2E Automated Test Runner
 * ============================================================================
 * Runs all 4 test tiers:
 *   - Tier 1: Feature Coverage (16 Features, >= 5 tests each)
 *   - Tier 2: Boundary & Corner Cases (320px-768px Viewport Math, WCAG 44px Hitboxes, iOS 16px)
 *   - Tier 3: Cross-Feature Interactions (Dock vs QuickNav, Terminal Race Conditions, ScrollTrigger)
 *   - Tier 4: Real-World Mobile Workloads (Complete Mobile User Journey)
 *
 * Usage:
 *   node tests/run-all-tests.js
 *   node tests/run-all-tests.js --tier=1
 *   node tests/run-all-tests.js --tier=2
 *   node tests/run-all-tests.js --feature=1
 *   node tests/run-all-tests.js --baseline
 *   node tests/run-all-tests.js --json
 * ============================================================================
 */

const path = require('path');
const fs = require('fs');
const { defaultContext } = require('./helpers/test-framework');

// ANSI formatting helpers
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m'
};

// Parse CLI flags
const args = process.argv.slice(2);
const flags = {
  tier: null,
  feature: null,
  baseline: false,
  json: false,
  verbose: false
};

args.forEach((arg) => {
  if (arg.startsWith('--tier=')) flags.tier = parseInt(arg.split('=')[1], 10);
  else if (arg.startsWith('--feature=')) flags.feature = parseInt(arg.split('=')[1], 10);
  else if (arg === '--baseline') flags.baseline = true;
  else if (arg === '--json') flags.json = true;
  else if (arg === '--verbose') flags.verbose = true;
});

// Test Suite Catalog
const testSuites = [
  // Tier 1: Feature Coverage
  { tier: 1, feature: 1, file: './tier1-features/test-f01-footer-wordmark.js', title: 'Feature 01: Footer Wordmark Fluid Scaling' },
  { tier: 1, feature: 2, file: './tier1-features/test-f02-dock-quicknav.js', title: 'Feature 02: Bottom Dock vs Quick Nav Deconfliction' },
  { tier: 1, feature: 3, file: './tier1-features/test-f03-lead-photo-size.js', title: 'Feature 03: Team Card Lead Photo Sizing' },
  { tier: 1, feature: 4, file: './tier1-features/test-f04-hero-typography.js', title: 'Feature 04: Hero Headline Typography Clamp' },
  { tier: 1, feature: 5, file: './tier1-features/test-f05-officer-title-wrap.js', title: 'Feature 05: Officer Title Two-Line Wrapping' },
  { tier: 1, feature: 6, file: './tier1-features/test-f06-bento-metrics.js', title: 'Feature 06: Bento Metric Cards Optimization' },
  { tier: 1, feature: 7, file: './tier1-features/test-f07-touch-targets-44px.js', title: 'Feature 07: System-Wide 44px+ Touch Targets' },
  { tier: 1, feature: 8, file: './tier1-features/test-f08-tactile-haptics.js', title: 'Feature 08: Tactile Active Press Haptics' },
  { tier: 1, feature: 9, file: './tier1-features/test-f09-terminal-cancelation.js', title: 'Feature 09: Terminal Simulator Race Condition Fix' },
  { tier: 1, feature: 10, file: './tier1-features/test-f10-ios-form-zoom.js', title: 'Feature 10: iOS Form Auto-Zoom Prevention' },
  { tier: 1, feature: 11, file: './tier1-features/test-f11-lightbox-gestures.js', title: 'Feature 11: Lightbox Mobile Edge-to-Edge & Gestures' },
  { tier: 1, feature: 12, file: './tier1-features/test-f12-dock-scroll-reflow.js', title: 'Feature 12: Dock Scroll Layout Thrashing Elimination' },
  { tier: 1, feature: 13, file: './tier1-features/test-f13-specular-cards-lifecycle.js', title: 'Feature 13: WebGL Specular Cards Lifecycle Fix' },
  { tier: 1, feature: 14, file: './tier1-features/test-f14-specular-buttons-guard.js', title: 'Feature 14: Specular Buttons Idle Guard' },
  { tier: 1, feature: 15, file: './tier1-features/test-f15-scrolltrigger-sync.js', title: 'Feature 15: ScrollTrigger Height Desync Fix' },
  { tier: 1, feature: 16, file: './tier1-features/test-f16-content-integrity.js', title: 'Feature 16: Content & Contact Data Preservation' },

  // Tier 2: Boundaries & Corners
  { tier: 2, file: './tier2-boundaries/test-viewport-overflow-math.js', title: 'Tier 2: Viewport Overflow Math (320px–768px)' },
  { tier: 2, file: './tier2-boundaries/test-wcag-hitbox-15elements.js', title: 'Tier 2: WCAG 2.1 AA 44px Hit-Box Matrix' },
  { tier: 2, file: './tier2-boundaries/test-ios-16px-baseline.js', title: 'Tier 2: iOS 16px Form Baseline' },
  { tier: 2, file: './tier2-boundaries/test-wordmark-320px-geometry.js', title: 'Tier 2: Wordmark 320px Viewport Geometry Math' },

  // Tier 3: Interactions
  { tier: 3, file: './tier3-interactions/test-dock-quicknav-interaction.js', title: 'Tier 3: QuickNav vs BottomDock Coordinate Separation' },
  { tier: 3, file: './tier3-interactions/test-terminal-rapid-clicks.js', title: 'Tier 3: Terminal Typing Cancellation on Rapid Taps' },
  { tier: 3, interactions: true, file: './tier3-interactions/test-team-filter-scrolltrigger.js', title: 'Tier 3: Team Filter Switching & ScrollTrigger Alignment' },
  { tier: 3, file: './tier3-interactions/test-lightbox-scroll-lock.js', title: 'Tier 3: Lightbox Modal & Page Scroll Lock' },

  // Tier 4: Real-World Workloads
  { tier: 4, file: './tier4-workloads/test-mobile-user-journey.js', title: 'Tier 4: End-to-End Mobile User Journey Sequence' }
];

async function main() {
  const startTime = Date.now();

  // Filter test suites based on CLI flags
  let filteredSuites = testSuites;
  if (flags.tier !== null) {
    filteredSuites = filteredSuites.filter((s) => s.tier === flags.tier);
  }
  if (flags.feature !== null) {
    filteredSuites = filteredSuites.filter((s) => s.feature === flags.feature);
  }

  if (!flags.json) {
    console.log(`\n${colors.cyan}${colors.bold}==============================================================================${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold} 📱 IEI STUDENT CHAPTER — MOBILE E2E TEST RUNNER${colors.reset}`);
    console.log(`${colors.dim} Target Viewports: 320px, 360px, 375px, 390px, 414px, 768px${colors.reset}`);
    console.log(`${colors.dim} Spec: PROJECT.md | Original Request: ORIGINAL_REQUEST.md${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}==============================================================================${colors.reset}\n`);
  }

  const tierStats = {
    1: { total: 0, passed: 0, failed: 0 },
    2: { total: 0, passed: 0, failed: 0 },
    3: { total: 0, passed: 0, failed: 0 },
    4: { total: 0, passed: 0, failed: 0 }
  };

  const suiteResults = [];

  for (const suiteDef of filteredSuites) {
    defaultContext.reset();

    try {
      require(path.resolve(__dirname, suiteDef.file));
    } catch (err) {
      console.error(`${colors.red}Failed to load suite ${suiteDef.file}: ${err.message}${colors.reset}`);
      continue;
    }

    const res = await defaultContext.runAll();
    tierStats[suiteDef.tier].total += res.total;
    tierStats[suiteDef.tier].passed += res.passed;
    tierStats[suiteDef.tier].failed += res.failed;

    suiteResults.push({
      tier: suiteDef.tier,
      feature: suiteDef.feature || null,
      title: suiteDef.title,
      file: suiteDef.file,
      stats: { total: res.total, passed: res.passed, failed: res.failed },
      results: res.results
    });

    if (!flags.json) {
      const statusIcon = res.failed === 0 ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
      console.log(`[Tier ${suiteDef.tier}] ${statusIcon} ${colors.bold}${suiteDef.title}${colors.reset} ${colors.dim}(${res.passed}/${res.total})${colors.reset}`);

      if (flags.verbose || res.failed > 0) {
        res.results.forEach((test) => {
          if (!test.passed) {
            console.log(`   ${colors.red}✗ ${test.name}${colors.reset}`);
            if (test.error) {
              console.log(`     ${colors.yellow}→ ${test.error.message}${colors.reset}`);
            }
          } else if (flags.verbose) {
            console.log(`   ${colors.green}✓ ${test.name}${colors.reset}`);
          }
        });
      }
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalAll = Object.values(tierStats).reduce((acc, t) => acc + t.total, 0);
  const passedAll = Object.values(tierStats).reduce((acc, t) => acc + t.passed, 0);
  const failedAll = Object.values(tierStats).reduce((acc, t) => acc + t.failed, 0);
  const passRate = totalAll > 0 ? ((passedAll / totalAll) * 100).toFixed(1) : '0.0';

  if (flags.json) {
    const jsonOutput = {
      summary: {
        total: totalAll,
        passed: passedAll,
        failed: failedAll,
        passRate: `${passRate}%`,
        durationSeconds: parseFloat(totalTime),
        tierStats
      },
      suites: suiteResults
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
    return;
  }

  // Render Scorecard
  console.log(`\n${colors.cyan}${colors.bold}==============================================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold} 📊 MOBILE TEST SCORECARD & BASELINE SUMMARY${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}==============================================================================${colors.reset}`);
  console.log(`  Tier 1: Feature Coverage (16 Features)       : ${tierStats[1].passed}/${tierStats[1].total} passed`);
  console.log(`  Tier 2: Boundary & Corner Cases (320px-768px): ${tierStats[2].passed}/${tierStats[2].total} passed`);
  console.log(`  Tier 3: Cross-Feature Interactions           : ${tierStats[3].passed}/${tierStats[3].total} passed`);
  console.log(`  Tier 4: Real-World Mobile Workloads          : ${tierStats[4].passed}/${tierStats[4].total} passed`);
  console.log(`${colors.dim}------------------------------------------------------------------------------${colors.reset}`);
  console.log(`  ${colors.bold}TOTAL SCORE${colors.reset} : ${passedAll} / ${totalAll} tests passed (${colors.bold}${passRate}%${colors.reset}) in ${totalTime}s`);

  if (failedAll > 0) {
    console.log(`\n  ${colors.yellow}⚠️  Baseline Notice: ${failedAll} known spec-deviations / defects detected in existing codebase.${colors.reset}`);
    console.log(`  ${colors.yellow}   Milestone workers (M1-M5) will remediate code to reach 100% pass rate.${colors.reset}\n`);
  } else {
    console.log(`\n  ${colors.green}🎉 ALL TESTS PASSED! Mobile experience is 100% spec-compliant.${colors.reset}\n`);
  }

  // Exit with non-zero code unless in baseline mode
  if (failedAll > 0 && !flags.baseline) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(`${colors.red}Fatal test runner error: ${err.stack}${colors.reset}`);
  process.exit(1);
});
