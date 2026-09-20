/**
 * Runtime DOM simulation: executes the REAL frontend script.js and
 * operators.js inside a lightweight DOM shim, with fetch pointed at
 * the live backend. Verifies that API data lands in the DOM without
 * runtime errors (no browser available, so we mock the DOM).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FE = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(FE, 'index.html'), 'utf8');

// ---------- Minimal DOM ----------
class Element {
  constructor(tag, attrs = {}) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.attrs = { ...attrs };
    this.dataset = {};
    this.style = {};
    this.listeners = {};
    this._innerHTML = '';
    this.textContent = '';
    this.classList = makeClassList(this);
    this.disabled = false;
    this.tabIndex = 0;
    for (const [k, v] of Object.entries(attrs)) this.setAttribute(k, v);
  }
  setAttribute(name, value) {
    this.attrs[name] = String(value);
    if (name === 'class') this.classList.value = String(value);
    if (name.startsWith('data-')) {
      const prop = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      this.dataset[prop] = String(value);
    }
  }
  getAttribute(n) { return this.attrs[n] !== undefined ? this.attrs[n] : null; }
  hasAttribute(n) { return this.attrs[n] !== undefined; }
  removeAttribute(n) { delete this.attrs[n]; }
  get className() { return this.attrs['class'] || ''; }
  set className(v) { this.attrs['class'] = String(v); this.classList.value = String(v); }
  get id() { return this.attrs['id'] || ''; }
  set id(v) { this.attrs['id'] = String(v); }
  appendChild(c) { if (c && !this.children.includes(c)) { this.children.push(c); c.parentElement = this; } return c; }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); }
  addEventListener(t, h) { (this.listeners[t] = this.listeners[t] || []).push(h); }
  removeEventListener() {}
  dispatch(type, ev) {
    (this.listeners[type] || []).forEach(h => h.call(this, { target: this, currentTarget: this, stopPropagation() {}, preventDefault() {}, ...ev }));
  }
  click() { this.dispatch('click', {}); }
  querySelector(sel) { return query(this, sel)[0] || null; }
  querySelectorAll(sel) { return query(this, sel); }
  getBoundingClientRect() { return { top: 0, left: 0, bottom: 44, right: 100, width: 100, height: 44, x: 0, y: 0 }; }
  focus() {}
  closest(sel) {
    let n = this;
    while (n) {
      if (matchSimple(n, sel)) return n;
      n = n.parentElement;
    }
    return null;
  }
  cloneNode(deep) {
    const c = new Element(this.tagName, { ...this.attrs });
    c.dataset = { ...this.dataset };
    c._innerHTML = this._innerHTML;
    c.textContent = this.textContent;
    if (deep) this.children.forEach(ch => c.appendChild(ch.cloneNode(true)));
    return c;
  }
  scrollTo() {}
  scrollIntoView() {}
  getContext() { return null; }  // no WebGL/canvas in the shim — FX modules skip gracefully
  closest2() {}
  insertAdjacentHTML(pos, t) { this.innerHTML = (this._innerHTML || '') + t; }
  get scrollWidth() { return 2000; }
  get clientWidth() { return 800; }
  get scrollLeft() { return 0; }
  set scrollLeft(v) {}
  get offsetLeft() { return 0; }
  get offsetParent() { return null; }
  get offsetWidth() { return 100; }
  get readyState() { return undefined; }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(v) {
    this._innerHTML = String(v);
    this.children = [];
    // parse crude tags to allow querySelector by class/id within
    const VOID = ['IMG', 'BR', 'HR', 'INPUT', 'META', 'LINK', 'SOURCE', 'SVG', 'PATH', 'LINE', 'CIRCLE', 'RECT', 'POLYLINE'];
    const tagRe = /<(\/?)([a-zA-Z0-9-]+)([^>]*)>/g;
    const stack = [this];
    let mm;
    while ((mm = tagRe.exec(v)) !== null) {
      const isClose = mm[1] === '/';
      const tag = mm[2];
      const full = mm[0];
      if (isClose) { if (stack.length > 1) stack.pop(); continue; }
      if (VOID.includes(tag.toUpperCase())) continue;
      const attrsRaw = mm[3];
      const el = new Element(tag);
      const attrPair = /([a-zA-Z0-9_:-]+)(?:="([^"]*)")?/g;
      let am;
      while ((am = attrPair.exec(attrsRaw)) !== null) el.setAttribute(am[1], am[2] === undefined ? '' : am[2]);
      stack[stack.length - 1].appendChild(el);
      if (!full.endsWith('/>')) stack.push(el);
    }
  }
}
function makeClassList(el) {
  const set = new Set();
  function sync() { el.attrs['class'] = [...set].join(' '); }
  return {
    add(...c) { c.forEach(x => set.add(x)); sync(); },
    remove(...c) { c.forEach(x => set.delete(x)); sync(); },
    toggle(c, force) {
      if (force === true) set.add(c);
      else if (force === false) set.delete(c);
      else set.has(c) ? set.delete(c) : set.add(c);
      sync();
      return set.has(c);
    },
    contains(c) { return set.has(c); },
    get value() { return [...set].join(' '); },
    set value(v) { set.clear(); String(v).split(/\s+/).filter(Boolean).forEach(x => set.add(x)); sync(); }
  };
}
function matchSimple(el, sel) {
  sel = sel.trim();
  if (sel.includes(',')) return sel.split(',').some(s => matchSimple(el, s));
  if (sel.includes(' ')) {
    const parts = sel.split(/\s+/);
    // descendant or pseudo patterns like ".tl-node:not(.tl-eof)" — handle single level of :not
    const first = parts[0];
    const rest = parts.slice(1).join(' ');
    if (rest.includes(':not(')) {
      // match all by tag/class, then filter by :not arg
      const notArg = rest.match(/:not\(([^)]+)\)/)[1].trim();
      const base = rest.replace(/:not\([^)]+\)/, '').trim();
      const targets = queryAllDesc(el, base);
      return targets.some(t => !matchSimple(t, notArg));
    }
    return query(el, rest).length > 0;
  }
  // :not(...)
  const notM = sel.match(/^([.\w-]+):not\(([^)]+)\)$/);
  if (notM) return matchSimple(el, notM[1]) && !matchSimple(el, notM[2].trim());
  if (sel.startsWith('#')) return el.attrs['id'] === sel.slice(1);
  if (sel.startsWith('.')) return el.classList.contains(sel.slice(1)) || (el.attrs['class'] || '').split(/\s+/).includes(sel.slice(1));
  return el.tagName === sel.toUpperCase();
}
function query(root, sel) {
  const out = [];
  (function walk(n) {
    n.children.forEach(c => {
      if (matchSimple(c, sel)) out.push(c);
      walk(c);
    });
  })(root);
  return out;
}
function queryAllDesc(root, sel) { return query(root, sel); }

// Build the document from index.html
const body = new Element('BODY');
const head = new Element('HEAD');
const htmlEl = new Element('HTML');
htmlEl.appendChild(head);
htmlEl.appendChild(body);
(function parse() {
  const VOID = ['SCRIPT', 'META', 'LINK', 'BR', 'HR', 'INPUT', 'IMG', 'SOURCE', 'AREA', 'BASE', 'COL', 'EMBED', 'TRACK', 'WBR'];
  const tagRe = /<(\/?)([a-zA-Z0-9-]+)([^>]*)>/g;
  const stack = [body];
  let m;
  while ((m = tagRe.exec(html)) !== null) {
    const isClose = m[1] === '/';
    const tag = m[2];
    const full = m[0];
    if (isClose) { if (stack.length > 1) stack.pop(); continue; }
    if (VOID.includes(tag.toUpperCase())) continue; // leaf elements never nest
    const attrsRaw = m[3];
    const el = new Element(tag);
    const attrPair = /([a-zA-Z0-9_:-]+)(?:="([^"]*)")?/g;
    let am;
    while ((am = attrPair.exec(attrsRaw)) !== null) el.setAttribute(am[1], am[2] === undefined ? '' : am[2]);
    stack[stack.length - 1].appendChild(el);
    if (!full.endsWith('/>')) stack.push(el);
  }
})();

const doc = {
  documentElement: htmlEl,
  body,
  readyState: 'complete',
  listeners: {},
  addEventListener(t, h) { (this.listeners[t] = this.listeners[t] || []).push(h); },
  removeEventListener(t, h) { this.listeners[t] = (this.listeners[t] || []).filter(x => x !== h); },
  dispatchEvent(t) { (this.listeners[t] || []).forEach(h => h({})); },
  getElementById(id) { return queryAllDesc(htmlEl, '#' + id)[0] || null; },
  querySelector(sel) { return queryAllDesc(body, sel)[0] || null; },
  querySelectorAll(sel) { return queryAllDesc(body, sel); },
  createElement(tag) { return new Element(tag); },
  hidden: false
};
const win = {
  document: doc,
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  addEventListener() {},
  removeEventListener() {},
  innerWidth: 1280,
  innerHeight: 900,
  devicePixelRatio: 1,
  pageYOffset: 0,
  localStorage: { getItem: () => null, setItem() {} },
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {},
  fetch: (url, opts) => fetch(url, opts),
  location: { href: 'http://localhost:5500/' },
  navigator: { userAgent: 'node' },
  IntersectionObserver: class { constructor(cb) {} observe() {} unobserve() {} disconnect() {} },
  Lenis: undefined,
  gsap: undefined,
  ScrollTrigger: undefined
};
win.window = win;

// node-fetch returns WHATWG response — script uses .json() and .ok: compatible.

const ctx = vm.createContext({ ...win, window: win, document: doc, console, fetch: win.fetch });
// run script.js
const scriptJs = fs.readFileSync(path.join(FE, 'script.js'), 'utf8');
const operatorsJs = fs.readFileSync(path.join(FE, 'operators.js'), 'utf8');

let errors = [];
try {
  vm.runInContext(scriptJs, ctx, { filename: 'script.js' });
  console.log('script.js executed without throwing');
} catch (e) {
  errors.push('script.js: ' + e.message + '\n' + e.stack.split('\n').slice(0, 4).join('\n'));
}
try {
  vm.runInContext(operatorsJs, ctx, { filename: 'operators.js' });
  console.log('operators.js executed without throwing');
} catch (e) {
  errors.push('operators.js: ' + e.message + '\n' + e.stack.split('\n').slice(0, 4).join('\n'));
}

// fire DOMContentLoaded
try {
  doc.dispatchEvent('DOMContentLoaded');
  console.log('DOMContentLoaded dispatched');
} catch (e) {
  errors.push('DOMContentLoaded: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n'));
}

// wait for API promises
setTimeout(() => {
  const evTrack = doc.getElementById('evTrack');
  console.log('\n--- Runtime results ---');
  console.log('evTrack found:', !!evTrack, 'children:', evTrack ? evTrack.children.length : 'n/a');
  console.log('evTrack innerHTML sample:', evTrack ? JSON.stringify(String(evTrack._innerHTML).slice(0, 140)) : 'n/a');
  const tlNodes = evTrack ? evTrack.querySelectorAll('.tl-node') : [];
  console.log('timeline nodes rendered from API:', tlNodes.length);
  console.log('first node classes:', tlNodes[0] ? tlNodes[0].attrs['class'] : 'n/a');
  const titleEl = doc.getElementById('nextEventTitle');
  console.log('nextEventTitle innerHTML:', titleEl ? JSON.stringify(String(titleEl._innerHTML).slice(0, 100)) : 'n/a');

  const board = doc.getElementById('opSoloBoard');
  console.log('opSoloBoard innerHTML length:', board ? String(board._innerHTML).length : 'n/a');
  console.log('opSoloBoard has Executive row:', board ? String(board._innerHTML).toUpperCase().includes('EXECUTIVE') : 'n/a');
  const fboard = doc.getElementById('facultyCards');
  console.log('facultyCards innerHTML length:', fboard ? String(fboard._innerHTML).length : 'n/a');

  const clMosaic = doc.getElementById('clMosaic');
  console.log('clMosaic innerHTML length:', clMosaic ? String(clMosaic._innerHTML).length : 'n/a');
  const galCards = clMosaic ? clMosaic.querySelectorAll('.gal-item') : [];
  console.log('gallery cards rendered:', galCards.length);
  if (galCards.length) {
    console.log('first gallery card id:', galCards[0].attrs['id']);
    const album = galCards[0]._album || [];
    console.log('album pieces hydrated from /api/gallery/:id:', album.length);
    if (album.length) {
      console.log('album piece types:', album.map(p => p.tagName).join(', '));
    }
    // simulate a user click on the gallery card -> lightbox opens
    try {
      galCards[0].dispatch('click', {});
      const lb = doc.getElementById('lightbox');
      const opened = lb && lb.classList.contains('open');
      console.log('lightbox opens on card click:', opened);
      if (opened) {
        const name = doc.getElementById('lbName');
        console.log('lightbox lbName.textContent:', JSON.stringify(String(name.textContent).slice(0, 60)));
      }
    } catch (e) {
      errors.push('lightbox click: ' + e.message);
    }
  }

  if (errors.length) {
    console.log('\nERRORS:');
    errors.forEach(e => console.log('  ' + e));
    process.exit(1);
  }
  console.log('\nRUNTIME SIMULATION OK');
  process.exit(0);
}, 3500);
