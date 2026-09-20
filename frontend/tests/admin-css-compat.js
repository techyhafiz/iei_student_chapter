/**
 * Admin compatibility check: verifies that admin.html / reset-password.html
 * resolve all CSS custom properties they reference, given the NEW styles.css
 * (with its appended admin compatibility token layer) + admin.css/reset-password.css.
 */
const fs = require('fs');
const path = require('path');
const FE = path.resolve(__dirname, '..');

const stylesCss = fs.readFileSync(path.join(FE, 'styles.css'), 'utf8');
const adminCss = fs.readFileSync(path.join(FE, 'admin.css'), 'utf8');
const resetCss = fs.readFileSync(path.join(FE, 'reset-password.css'), 'utf8');

// All variables referenced by admin.css + reset-password.css
const referenced = new Set();
for (const css of [adminCss, resetCss]) {
  for (const m of css.matchAll(/var\((--[a-zA-Z0-9-]+)/g)) referenced.add(m[1]);
}

// All variables defined in styles.css (both :root blocks, incl. compat layer)
const defined = new Set();
for (const m of stylesCss.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) defined.add(m[1]);

let failed = 0;
console.log('Variables referenced by admin.css/reset-password.css:');
for (const v of [...referenced].sort()) {
  const ok = defined.has(v);
  if (!ok) failed++;
  console.log('  ' + (ok ? 'OK  ' : 'MISS') + ' ' + v);
}

// Also confirm classes used by admin.html exist in admin.css or styles.css
// (only regressions matter: classes styled in the OLD styles.css must stay available)
const oldStylesCss = fs.readFileSync(path.join(FE, '..', 'frontend_backup_20260911', 'styles.css'), 'utf8');
const adminHtml = fs.readFileSync(path.join(FE, 'admin.html'), 'utf8');
const classes = new Set();
for (const m of adminHtml.matchAll(/class="([^"]+)"/g)) {
  m[1].split(/\s+/).forEach(c => { if (c) classes.add(c); });
}
console.log('\nClasses used by admin.html and where they are styled:');
for (const c of [...classes].sort()) {
  const inAdmin = new RegExp('\\.' + c + '[\\s,{.:\\[]').test(adminCss);
  const inStyles = new RegExp('\\.' + c + '[\\s,{.:\\[]').test(stylesCss);
  const wasInOldStyles = new RegExp('\\.' + c + '[\\s,{.:\\[]').test(oldStylesCss);
  // regression = previously styled by base styles.css, now nowhere
  const regression = wasInOldStyles && !inAdmin && !inStyles;
  if (regression) { failed++; console.log('  REGRESSION ' + c); }
  else console.log('  OK   ' + c + (inAdmin ? ' (admin.css)' : '') + (inStyles ? ' (styles.css)' : '') + (regression === false && !inAdmin && !inStyles ? ' (unstyled wrapper — same as before)' : ''));
}

console.log('\n' + (failed === 0 ? 'ADMIN COMPATIBILITY: PASS' : 'ADMIN COMPATIBILITY: ' + failed + ' issue(s)'));
process.exit(failed ? 1 : 0);
