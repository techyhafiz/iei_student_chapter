/** Basic CSS sanity: brace balance + no obvious corruption in merged stylesheets. */
const fs = require('fs');
const path = require('path');
const FE = path.resolve(__dirname, '..');
let failed = 0;
for (const f of ['styles.css', 'operators.css', 'admin.css', 'reset-password.css']) {
  const css = fs.readFileSync(path.join(FE, f), 'utf8');
  // strip comments and strings for brace counting
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '');
  let depth = 0, min = 0;
  for (const ch of clean) {
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth < min) min = depth; }
  }
  const ok = depth === 0 && min >= 0;
  if (!ok) failed++;
  console.log(f + ': braces ' + (ok ? 'BALANCED' : 'UNBALANCED (final depth ' + depth + ')'));
}
// index.html: basic sanity — matching essential tags
const html = fs.readFileSync(path.join(FE, 'index.html'), 'utf8');
for (const tag of ['html', 'head', 'body', 'main', 'footer', 'section', 'form']) {
  const open = (html.match(new RegExp('<' + tag + '(\\s|>)', 'g')) || []).length;
  const close = (html.match(new RegExp('</' + tag + '>', 'g')) || []).length;
  const ok = open === close;
  if (!ok && ['html', 'head', 'body', 'main', 'footer', 'form'].includes(tag)) failed++;
  console.log('index.html <' + tag + '>: ' + open + ' open / ' + close + ' close ' + (ok ? 'OK' : 'MISMATCH'));
}
console.log('\n' + (failed === 0 ? 'CSS/HTML SANITY: PASS' : 'CSS/HTML SANITY: ' + failed + ' issue(s)'));
process.exit(failed ? 1 : 0);
