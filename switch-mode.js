#!/usr/bin/env node

/**
 * ============================================================================
 * IEI Student Chapter — Site Mode Switcher (Live vs Maintenance)
 * ============================================================================
 * Usage:
 *   node switch-mode.js --maintenance   (Enables Maintenance mode on index.html)
 *   node switch-mode.js --live          (Restores Full Live site to index.html)
 *   node switch-mode.js --status        (Checks current site deployment mode)
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const INDEX_HTML = path.join(ROOT, 'index.html');
const PROD_HTML = path.join(ROOT, 'index.prod.html');
const MAINT_HTML = path.join(ROOT, 'index.maintenance.html');

function getStatus() {
  if (!fs.existsSync(INDEX_HTML)) return 'MISSING';
  const indexContent = fs.readFileSync(INDEX_HTML, 'utf8');
  if (indexContent.includes('Portal Under Scheduled Maintenance') || indexContent.includes('IEI STUDENT CHAPTER — SCHEDULED MAINTENANCE')) {
    return 'MAINTENANCE';
  }
  return 'LIVE';
}

function enableMaintenance() {
  if (!fs.existsSync(MAINT_HTML)) {
    console.error('❌ Error: index.maintenance.html not found.');
    process.exit(1);
  }

  // If currently live, refresh index.prod.html to ensure no latest changes are lost
  if (getStatus() === 'LIVE') {
    fs.copyFileSync(INDEX_HTML, PROD_HTML);
    console.log('✓ Preserved current live code to index.prod.html');
  }

  // Copy maintenance template over index.html
  fs.copyFileSync(MAINT_HTML, INDEX_HTML);
  console.log('\n🔒 [MAINTENANCE MODE ACTIVE]');
  console.log('  • Public entry point (index.html) now displays the Maintenance Page.');
  console.log('  • All production code is 100% safely preserved in index.prod.html.');
  console.log('  • You can still preview the full live site anytime at: http://localhost:3000/index.prod.html');
  console.log('  • To revert back to live at any time, run: node switch-mode.js --live\n');
}

function enableLive() {
  if (!fs.existsSync(PROD_HTML)) {
    console.error('❌ Error: index.prod.html not found. Cannot restore live site.');
    process.exit(1);
  }

  // Copy production code back to index.html
  fs.copyFileSync(PROD_HTML, INDEX_HTML);
  console.log('\n🚀 [LIVE MODE ACTIVE]');
  console.log('  • Full production website has been restored to index.html.');
  console.log('  • All animations, 3D intro, and interactive sections are live.');
  console.log('  • To put the site into maintenance mode again, run: node switch-mode.js --maintenance\n');
}

function printStatus() {
  const current = getStatus();
  console.log(`\nCurrent Mode: [${current === 'MAINTENANCE' ? '🔒 MAINTENANCE' : '🚀 LIVE'}]`);
  console.log(`- index.html is currently serving: ${current} mode.`);
  console.log(`- Backup file (index.prod.html): ${fs.existsSync(PROD_HTML) ? 'Present (OK)' : 'Missing'}`);
  console.log(`- Maintenance template (index.maintenance.html): ${fs.existsSync(MAINT_HTML) ? 'Present (OK)' : 'Missing'}\n`);
}

// CLI args parsing
const arg = (process.argv[2] || '').toLowerCase().replace(/^--?/, '');

if (arg === 'maintenance' || arg === 'maint') {
  enableMaintenance();
} else if (arg === 'live' || arg === 'prod') {
  enableLive();
} else if (arg === 'status') {
  printStatus();
} else {
  console.log('Usage:');
  console.log('  node switch-mode.js --maintenance   Switch site to Maintenance');
  console.log('  node switch-mode.js --live          Switch site back to Live');
  console.log('  node switch-mode.js --status        Check current mode');
  printStatus();
}
