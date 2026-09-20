const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function eq(actual, expected, name) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, '| got:', a, '| want:', e); }
}

const script = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
const admin = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8');

function slice(src, startMarker, endMarker, includeEnd) {
  const s = src.indexOf(startMarker);
  const e = src.indexOf(endMarker, s);
  if (s < 0 || e < 0) throw new Error('marker not found: ' + startMarker);
  return src.slice(s, includeEnd ? e + endMarker.length : e);
}

// ---- Real shipped helpers from script.js (pure logic, no DOM at def time) ----
const helpersSrc = slice(script, '    function escHtml(s) {', '\n    function setSpotlightEmpty() {');
const bootHelpers = new Function('$', '$all', 'API_BASE', helpersSrc + '\nreturn { escHtml, evEndDate, evStartDate, evPhase, evCountdownTarget, regCountdownTarget, registrationOpen };');
const H = bootHelpers(function () { return null; }, function () { return []; }, 'http://x');

const NOW = new Date('2026-09-19T12:00:00Z').getTime();
const up = { event_date: '2026-12-20', start_time: '09:00', end_time: '18:00' };
const past = { event_date: '2026-08-10', start_time: '10:00', end_time: '12:00' };

eq(H.evPhase(up, NOW), 'upcoming', 'phase: future event is upcoming');
eq(H.evPhase(past, NOW), 'past', 'phase: old event is past');
eq(H.evPhase({}, NOW), 'tba', 'phase: dateless event is tba');
eq(H.evPhase({ event_date: 'not-a-date' }, NOW), 'tba', 'phase: invalid date is tba');

eq(H.evCountdownTarget({ event_countdown_enabled: false }, NOW), null, 'countdown NONE when disabled');
eq(H.evCountdownTarget({ event_countdown_enabled: true, event_countdown_at: '2026-12-20T09:00:00+05:30' }).toISOString(), '2026-12-20T03:30:00.000Z', 'countdown uses admin override');
eq(H.evCountdownTarget(Object.assign({ event_countdown_enabled: true, event_countdown_at: null }, up)).toISOString(), H.evStartDate(up).toISOString(), 'countdown falls back to event start');
eq(H.regCountdownTarget({ registration_enabled: true, registration_deadline: '2026-12-15T23:59:00+05:30' }).toISOString(), '2026-12-15T18:29:00.000Z', 'reg countdown parses deadline');
eq(H.regCountdownTarget({ registration_enabled: false, registration_deadline: '2026-12-15T23:59:00+05:30' }), null, 'reg countdown NONE when disabled');

const regEv = { registration_enabled: true, registration_url: 'https://example.com/r', registration_deadline: '2026-12-15T23:59:00+05:30' };
eq(H.registrationOpen(regEv, NOW), true, 'registration open before deadline');
eq(H.registrationOpen(regEv, new Date('2026-12-20T00:00:00Z').getTime()), false, 'registration closed after deadline');
eq(H.registrationOpen({ registration_enabled: true, registration_url: null }, NOW), false, 'registration closed without URL');
eq(H.escHtml('<a href="x">&\'test\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;test&#39;&lt;/a&gt;', 'escHtml escapes');

// ---- Real shipped ticker (formatting + expiry), with stubbed DOM ----
const tickerSrc = slice(script, '    var cdTickerStarted = false;', '\n    function initTimeline() {');
let captured = null;
const fakeSetInterval = (fn) => { captured = fn; return 1; };
function fakeEl(attrs) { return { _a: attrs, textContent: '', getAttribute(k) { return this._a[k] || null; } }; }
const bootTicker = new Function('$', '$all', 'setInterval', tickerSrc + '\ninitEventCountdownTicker();');
const elFuture = fakeEl({ 'data-cd-to': new Date(NOW + 90061000).toISOString(), 'data-cd-label': 'STARTS IN' });
const elExpired = fakeEl({ 'data-cd-to': new Date(NOW - 1000).toISOString(), 'data-cd-label': 'REGISTRATION CLOSES IN', 'data-cd-expired': 'REGISTRATION CLOSED' });
const elNoLabel = fakeEl({ 'data-cd-to': new Date(NOW + 5000).toISOString() });
const elBad = fakeEl({ 'data-cd-to': 'garbage' });
bootTicker(function () { return null; }, function () { return [elFuture, elExpired, elNoLabel, elBad]; }, fakeSetInterval);
const realNow = Date.now; Date.now = () => NOW; captured(); Date.now = realNow;
eq(elFuture.textContent, 'STARTS IN 01D : 01H : 01M : 01S', 'ticker formats D:H:M:S with label');
eq(elExpired.textContent, 'REGISTRATION CLOSES IN REGISTRATION CLOSED', 'ticker shows expired text');
eq(elNoLabel.textContent, '00D : 00H : 00M : 05S', 'ticker works without label');
eq(elBad.textContent, '', 'ticker skips invalid dates');

// ---- Real shipped admin datetime helpers (CRLF-safe statement anchors) ----
const adminSrc = slice(admin, 'function toLocalInputValue(isoStr) {', 'getMinutes())}`;', true) + '\n}';
const adminSrc2 = adminSrc + '\n' + slice(admin, 'function fromLocalInputValue(val) {', 'd.toISOString();', true) + '\n}';
const bootAdmin = new Function(adminSrc2 + '\nreturn { toLocalInputValue, fromLocalInputValue };');
const A = bootAdmin();
eq(typeof A.toLocalInputValue('2026-08-10T10:00:00+00:00'), 'string', 'toLocalInputValue returns string');
eq(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(A.toLocalInputValue('2026-08-10T10:00:00+00:00')), true, 'toLocalInputValue shape YYYY-MM-DDTHH:MM');
eq(A.toLocalInputValue(null), '', 'toLocalInputValue empty on null');
eq(A.fromLocalInputValue(''), null, 'fromLocalInputValue null on empty');
eq(new Date(A.fromLocalInputValue('2026-08-10T10:00')).getTime(), new Date('2026-08-10T10:00').getTime(), 'fromLocalInputValue round-trips');

// ---- Real shipped category labels + gallery builders ----
const moreSrc = slice(script, '    function pastCatLabel(c) {', '\n    function getPastEvents() {')
  + slice(script, '    var evdViewerAlbum = [];', '\n    /* Pure gallery-block builders')
  + slice(script, '    function buildEventGalleryHtml(gdata, eventTitle, albumBase) {', '\n    var cdTickerStarted');
const bootMore = new Function('$', '$all', 'API_BASE', helpersSrc + '\n' + moreSrc + '\nreturn { pastCatLabel, buildEventGalleryHtml, buildEventSectionsHtml, sectionPhaseOf, parseSectionBlocks, videoEmbedInfo, renderSectionBlocks, visibleSections };');
const M = bootMore(function () { return null; }, function () { return []; }, 'http://x');

eq(M.pastCatLabel('competition'), 'COMPETITIONS', 'label competition');
eq(M.pastCatLabel('workshop'), 'WORKSHOPS', 'label workshop');
eq(M.pastCatLabel('drill'), 'DEFENSE', 'label drill');
eq(M.pastCatLabel('hackathon'), 'HACKATHONS', 'label hackathon');
eq(M.pastCatLabel('session'), 'SESSIONS', 'label session');
eq(M.pastCatLabel('seminar'), 'SEMINARS', 'label seminar');
eq(M.pastCatLabel('meetup'), 'MEETUPS', 'label meetup');
eq(M.pastCatLabel('other'), 'OTHER', 'label other');
eq(M.pastCatLabel('weird'), 'WEIRD', 'label fallback uppercases');

eq(M.buildEventGalleryHtml({}, 'T'), '', 'gallery builder empty without data');
eq(M.buildEventGalleryHtml({ success: false }, 'T'), '', 'gallery builder empty on failure shape');

const full = M.buildEventGalleryHtml({
  gallery: { cover_image_url: 'https://cdn.test/cover.jpg', short_summary: 'Short', full_description: 'Full', copyright_text: '© IEI' },
  media: [
    { media_type: 'image', media_url: 'https://cdn.test/a.jpg', thumbnail_url: 'https://cdn.test/a-t.jpg', caption: 'Cap A' },
    { media_type: 'video', media_url: 'https://cdn.test/b.mp4', thumbnail_url: 'https://cdn.test/b-t.jpg' }
  ],
  guests: [{ name: 'Jane <Doe>', designation: 'SDE', organization: 'Acme', photo_url: 'https://cdn.test/j.jpg', bio: 'Bio', linkedin_url: 'https://linkedin.test/j' }],
  sponsors: [{ name: 'Spon', logo_url: 'https://cdn.test/s.png', website_url: 'https://spon.test', description: 'Desc' }],
  sections: [{ section_type: 'recap', title: 'Day 1', content: 'It was great' }]
}, 'Evt');
eq(full.includes('evd-gal-cover') && full.includes('https://cdn.test/cover.jpg'), true, 'gallery cover rendered');
eq(full.includes('<video') && full.includes('https://cdn.test/b.mp4'), true, 'gallery video rendered');
eq(full.includes('IMAGES (1)') && full.includes('VIDEOS (1)'), true, 'gallery media counts');
eq(full.includes('Jane &lt;Doe&gt;') && full.includes('SDE') && full.includes('Acme') && full.includes('https://linkedin.test/j'), true, 'guest fields escaped+rendered');
eq(full.includes('https://spon.test') && full.includes('Desc'), true, 'sponsor website+desc rendered');
eq(full.includes('RECAP'), false, 'gallery builder no longer duplicates sections');
eq(full.includes('© IEI'), true, 'copyright rendered');

const secOnly = M.buildEventSectionsHtml([
  { section_type: 'prizes', title: 'Prizes', content: 'Win big' },
  { section_type: 'rules', title: null, content: 'Play fair' },
  { section_type: null, title: null, content: null }
]);
eq(secOnly.includes('EVENT DETAILS'), true, 'sections block labeled');
eq(secOnly.includes('Prizes') && secOnly.includes('Win big'), true, 'section title+legacy content rendered');
eq(!secOnly.includes('PRIZES') && secOnly.includes('Play fair'), true, 'type used as filter only, content rendered');
eq(M.buildEventSectionsHtml([]), '', 'sections builder empty without rows');
eq(M.buildEventSectionsHtml(null), '', 'sections builder empty on null');

// ---- Phase separation (pre/post/both, one event ID) ----
eq(M.sectionPhaseOf('pre'), 'pre', 'phase pre');
eq(M.sectionPhaseOf('post'), 'post', 'phase post');
eq(M.sectionPhaseOf('both'), 'both', 'phase both');
eq(M.sectionPhaseOf('text'), 'both', 'legacy text shows both phases');
eq(M.sectionPhaseOf('html'), 'both', 'legacy html shows both phases');
eq(M.sectionPhaseOf(''), 'both', 'empty type shows both phases');

const phaseRows = [
  { section_type: 'pre', title: 'Rules', content: 'R' },
  { section_type: 'post', title: 'Results', content: 'W' },
  { section_type: 'both', title: 'About', content: 'A' },
  { section_type: 'text', title: 'Legacy', content: 'L' }
];
const preHtml = M.buildEventSectionsHtml(phaseRows, 'pre');
eq(preHtml.includes('Rules') && !preHtml.includes('Results') && preHtml.includes('About') && preHtml.includes('Legacy'), true, 'upcoming shows pre+both+legacy only');
const postHtml = M.buildEventSectionsHtml(phaseRows, 'post');
eq(!postHtml.includes('Rules') && postHtml.includes('Results') && postHtml.includes('About'), true, 'past shows post+both only');
const allHtml = M.buildEventSectionsHtml(phaseRows);
eq(allHtml.includes('Rules') && allHtml.includes('Results') && allHtml.includes('About') && allHtml.includes('Legacy'), true, 'no phase shows everything');

// ---- Rich blocks ----
const rich = M.renderSectionBlocks([
  { k: 'text', text: 'Hello <world>' },
  { k: 'image', url: 'https://cdn.test/i.jpg', caption: 'Cap' },
  { k: 'link', url: 'https://example.com/f', label: 'Form' },
  { k: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', label: 'Teaser' },
  { k: 'video', url: 'https://cdn.test/v.mp4' },
  { k: 'video', url: 'https://stream.test/x' },
  { k: 'resource', url: 'https://example.com/doc.pdf', label: 'Doc', desc: 'Read me' },
  { k: 'image', url: '' },
  { k: 'bogus', x: 1 }
], 'Evt', 5);
eq(rich.includes('Hello &lt;world&gt;'), true, 'text block escaped');
eq(rich.includes('data-viewer-idx="5"') && rich.includes('https://cdn.test/i.jpg'), true, 'image block indexed from base');
eq(rich.includes('target="_blank"') && rich.includes('>Form<'), true, 'link block new-tab with label');
eq(rich.includes('youtube-nocookie.com/embed/dQw4w9WgXcQ'), true, 'youtube embeds nocookie');
eq(rich.includes('<video controls') && rich.includes('https://cdn.test/v.mp4'), true, 'mp4 uses video tag');
eq(rich.includes('https://stream.test/x'), true, 'unknown video falls back to link');
eq(rich.includes('Doc') && rich.includes('Read me'), true, 'resource card rendered');
eq(rich.includes('bogus'), false, 'unknown block kinds dropped');

eq(M.videoEmbedInfo('https://youtu.be/dQw4w9WgXcQ').kind, 'youtube', 'youtu.be classified');
eq(M.videoEmbedInfo('https://vimeo.com/123456').id, '123456', 'vimeo id parsed');
eq(M.videoEmbedInfo('https://cdn.test/a.webm').kind, 'file', 'webm is file');
eq(M.videoEmbedInfo('https://x.test/page').kind, 'link', 'page is link');

const parsed = M.parseSectionBlocks(JSON.stringify([{ k: 'text', text: 'A' }, { k: 'nope' }, 'str', null]));
eq(parsed.length === 1 && parsed[0].k === 'text', true, 'parse keeps valid blocks only');
eq(M.parseSectionBlocks('plain legacy')[0], { k: 'text', text: 'plain legacy' }, 'legacy text becomes text block');
eq(M.parseSectionBlocks(''), [], 'empty content parses empty');

// ---- Real shipped past-sort key ----
const sortSrc = slice(script, '    function evSortTime(ev) {', '\n    function evPhase(ev, now) {');
const bootSort = new Function(sortSrc + '\nreturn { evSortTime };');
const S = bootSort();
const sameDayLate = { event_date: '2026-08-10', start_time: '10:00', end_time: '18:00' };
const sameDayEarly = { event_date: '2026-08-10', start_time: '10:00', end_time: '12:00' };
eq(S.evSortTime(sameDayLate) > S.evSortTime(sameDayEarly), true, 'sort: later end ranks first on same date');
eq(S.evSortTime({ event_date: '2026-08-10', start_time: '12:00' }), S.evSortTime({ event_date: '2026-08-10', end_time: '12:00' }), 'sort: missing end falls back to start');
eq(S.evSortTime({ event_date: '2026-08-10' }), new Date('2026-08-10T00:00:00+05:30').getTime(), 'sort: missing times fall back to midnight');
eq(S.evSortTime({ event_date: '2026-08-11' }) > S.evSortTime({ event_date: '2026-08-10', end_time: '23:59:59' }), true, 'sort: later date still wins');
eq(S.evSortTime({ event_date: 'garbage' }), 0, 'sort: invalid date sorts last');

// ---- Real shipped backend event validation (optional-registration fix) ----
const ctrlSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'backend', 'controllers', 'events.controller.js'), 'utf8');
const valSrc = slice(ctrlSrc, 'const VALID_CATEGORIES', '\n/**')
  + slice(ctrlSrc, 'function isValidUUID(str) {', '\n// ============================================================');
const bootVal = new Function(valSrc + '\nreturn { validateEventData };');
const V = bootVal();
const baseValid = { title: 'T', category: 'workshop' };
eq(V.validateEventData(Object.assign({ registration_url: '' }, baseValid), true), [], 'validation: empty URL allowed (reg disabled)');
eq(V.validateEventData(baseValid, true), [], 'validation: absent URL allowed');
eq(V.validateEventData(Object.assign({ registration_url: 'https://example.com/r' }, baseValid), true), [], 'validation: https URL allowed');
eq(V.validateEventData(Object.assign({ registration_url: 'not-a-url' }, baseValid), true).length > 0, true, 'validation: bad URL rejected');
eq(V.validateEventData(Object.assign({ registration_enabled: 'yes' }, baseValid), true).length > 0, true, 'validation: non-boolean reg flag rejected');
eq(V.validateEventData(Object.assign({ registration_deadline: '2026-10-15T18:30:00+05:30' }, baseValid), true), [], 'validation: ISO deadline allowed');
eq(V.validateEventData(Object.assign({ registration_deadline: 'tomorrow' }, baseValid), true).length > 0, true, 'validation: bad deadline rejected');
eq(V.validateEventData(Object.assign({ event_countdown_enabled: true, event_countdown_at: '2026-10-01T09:00:00Z' }, baseValid), true), [], 'validation: countdown pair allowed');

console.log('\nLOGIC TESTS: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
