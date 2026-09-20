/**
 * Frontend <-> Backend integration smoke test (Node, zero deps).
 * Simulates the public frontend's runtime flow against the live
 * backend on http://localhost:5000/api:
 *   1. fetch /api/events -> renderEvents() contract
 *   2. fetch /api/team   -> loadTeams() contract
 *   3. fetch /api/gallery -> fetchPublicGalleries() contract
 *   4. fetch /api/gallery/:id -> fetchEventAlbumMedia() contract
 *   5. static frontend files reference each other correctly
 *   6. index.html has the DOM ids/structure script.js expects
 */
const fs = require('fs');
const path = require('path');

const FE = path.resolve(__dirname, '..');
const API = 'http://localhost:5000/api';

let passed = 0, failed = 0;
function ok(name, cond, extra) {
  if (cond) { passed++; console.log('  PASS ' + name); }
  else { failed++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

async function getJSON(url) {
  const res = await fetch(url);
  const data = await res.json();
  return { status: res.status, data };
}

(async () => {
  console.log('\n[1] EVENTS API (/api/events)');
  const ev = await getJSON(API + '/events');
  ok('responds ok', ev.status === 200, 'status ' + ev.status);
  ok('success=true', ev.data.success === true);
  ok('events is array', Array.isArray(ev.data.events));
  const pub = (ev.data.events || []).filter(e => e.status === 'published');
  ok('has published events', pub.length > 0);
  if (pub.length) {
    const e = pub[0];
    ok('event has id/title/category/date', !!(e.id && e.title && e.category && e.event_date));
    ok('event has location/start_time', 'location' in e && 'start_time' in e);
  }

  console.log('\n[2] TEAM API (/api/team)');
  const tm = await getJSON(API + '/team');
  ok('responds ok', tm.status === 200, 'status ' + tm.status);
  ok('success=true', tm.data.success === true);
  ok('faculty array', Array.isArray(tm.data.faculty));
  ok('executive array', Array.isArray(tm.data.executive));
  ok('teams array', Array.isArray(tm.data.teams));
  if (tm.data.executive.length) {
    const m = tm.data.executive[0];
    ok('member has name/position', !!(m.name && m.position));
    ok('member has image_url/linkedin_url fields', 'image_url' in m && 'linkedin_url' in m);
  }
  if (tm.data.teams.length) {
    const t = tm.data.teams[0];
    ok('team has name/lead/members', !!(t.name) && 'lead' in t && Array.isArray(t.members));
  }

  console.log('\n[3] GALLERY API (/api/gallery)');
  const ga = await getJSON(API + '/gallery');
  ok('responds ok', ga.status === 200, 'status ' + ga.status);
  ok('galleries array', Array.isArray(ga.data.galleries));
  if (ga.data.galleries.length) {
    const g = ga.data.galleries[0];
    ok('gallery has id/event_id/cover', !!(g.id && g.event_id));
    ok('gallery embeds events.title', !!(g.events && g.events.title));
    ok('cover_image_url present or null', 'cover_image_url' in g);
  } else {
    console.log('  (info: no galleries published)');
  }

  console.log('\n[4] GALLERY DETAIL (/api/gallery/:eventId) — album hydration');
  if (ga.data.galleries && ga.data.galleries.length) {
    const g = ga.data.galleries[0];
    const det = await getJSON(API + '/gallery/' + g.event_id);
    ok('responds ok', det.status === 200, 'status ' + det.status);
    ok('success=true', det.data.success === true);
    ok('media array', Array.isArray(det.data.media));
    const img = (det.data.media || []).filter(m => m.media_type !== 'video');
    const vid = (det.data.media || []).filter(m => m.media_type === 'video');
    ok('image media have media_url', img.every(m => !!m.media_url));
    ok('video media handled (media_type present)', vid.every(m => 'media_type' in m));
  } else {
    console.log('  (skipped — no galleries)');
  }

  console.log('\n[5] STATIC FILE INTEGRITY');
  const html = fs.readFileSync(path.join(FE, 'index.html'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(FE, 'script.js'), 'utf8');
  const operatorsJs = fs.readFileSync(path.join(FE, 'operators.js'), 'utf8');

  // index.html references
  for (const f of ['styles.css', 'operators.css', 'script.js', 'operators.js']) {
    ok('index.html links ' + f, html.includes(f) && fs.existsSync(path.join(FE, f)));
  }
  // DOM contract ids used by script.js API rendering
  // (public Gallery mosaic was folded into Past Events; gallery data now
  // enriches the event detail view, so pastGrid/pastFilterBar replace clMosaic)
  for (const id of ['nextEventDateDisplay', 'nextEventTag', 'nextEventTitle', 'nextEventDesc', 'nextEventMeta', 'evTrack', 'evViewport', 'evShell', 'pastGrid', 'pastFilterBar', 'lightbox', 'lbContent', 'opSoloBoard', 'facultyCards']) {
    ok('index.html has #' + id, html.includes('id="' + id + '"'));
  }
  // script.js API wiring
  ok('script.js defines API_BASE', /API_BASE\s*=\s*"http:\/\/localhost:5000\/api"/.test(scriptJs));
  ok('script.js fetches /events', scriptJs.includes('API_BASE + "/events"'));
  ok('script.js fetches /gallery', scriptJs.includes('API_BASE + "/gallery"'));
  ok('script.js fetches /gallery/:id', scriptJs.includes('API_BASE + "/gallery/" + eventId'));
  ok('script.js filters published', scriptJs.includes('status === "published"'));
  ok('script.js builds gal-<id> targets', scriptJs.includes('"gal-" + g.id'));
  ok('script.js no leftover EVENT_ALBUMS statics', !scriptJs.includes('var EVENT_ALBUMS'));
  // operators.js API wiring
  ok('operators.js defines API_URL', /API_URL\s*=\s*window\.IEI_API_BASE\s*\|\|\s*'http:\/\/localhost:5000\/api'/.test(operatorsJs));
  ok('operators.js fetches /team', operatorsJs.includes('`${API_URL}/team`'));
  ok('operators.js maps position/linkedin_url/image_url',
    operatorsJs.includes('m.position') && operatorsJs.includes('m.linkedin_url') && operatorsJs.includes('m.image_url'));
  ok('operators.js keeps offline fallback roster', operatorsJs.includes('OPERATORS_DATA'));
  // admin files untouched
  const adminHtml = fs.readFileSync(path.join(FE, 'admin.html'), 'utf8');
  ok('admin.html intact (loads admin.js)', adminHtml.includes('admin.js') && adminHtml.includes('admin.css'));
  ok('admin.html loads styles.css base', adminHtml.includes('styles.css'));
  // assets referenced by index.html exist
  const assetRefs = [...html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)].map(m => m[1]);
  for (const a of [...new Set(assetRefs)]) {
    ok('asset exists: ' + a, fs.existsSync(path.join(FE, a)));
  }
  // team images referenced by fallback exist
  for (const m of operatorsJs.matchAll(/"assets\/team\/[^"]+"/g)) {
    const p = m[0].replace(/"/g, '');
    ok('team asset exists: ' + p, fs.existsSync(path.join(FE, p)));
  }

  console.log('\n==========================================');
  console.log('RESULT: ' + passed + ' passed, ' + failed + ' failed');
  console.log('==========================================');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
