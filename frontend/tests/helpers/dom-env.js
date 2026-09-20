/**
 * In-Memory DOM & CSS Environment for IEI Mobile Overhaul Tests
 * Provides accurate CSS rule resolution, media query matching,
 * viewport-based clamp()/calc() geometry math, and element event simulation.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Load project source files
function loadSourceFiles() {
  const htmlPath = path.join(PROJECT_ROOT, 'index.html');
  const stylesPath = path.join(PROJECT_ROOT, 'styles.css');
  const operatorsCssPath = path.join(PROJECT_ROOT, 'operators.css');
  const scriptPath = path.join(PROJECT_ROOT, 'script.js');
  const operatorsJsPath = path.join(PROJECT_ROOT, 'operators.js');

  return {
    html: fs.readFileSync(htmlPath, 'utf8'),
    stylesCss: fs.readFileSync(stylesPath, 'utf8'),
    operatorsCss: fs.readFileSync(operatorsCssPath, 'utf8'),
    scriptJs: fs.readFileSync(scriptPath, 'utf8'),
    operatorsJs: fs.readFileSync(operatorsJsPath, 'utf8')
  };
}

/**
 * CSS Rule Parser & Media Query Extractor
 */
function parseCssRules(cssText) {
  const rules = [];
  // Strip comments
  const cleanCss = cssText.replace(/\/\*[\s\S]*?\*\//g, '');

  // Match media queries
  const mediaRegex = /@media\s*([^{]+)\{([\s\S]+?\}(?:\s*\})?)/g;
  let match;
  let lastIndex = 0;

  // First extract top-level rules outside media queries
  const topLevelCss = cleanCss.replace(mediaRegex, (m, query, block) => {
    // Parse rules inside media query
    const innerRules = parseSimpleRules(block, query.trim());
    rules.push(...innerRules);
    return '';
  });

  const baseRules = parseSimpleRules(topLevelCss, 'all');
  rules.unshift(...baseRules);

  return rules;
}

function parseSimpleRules(cssChunk, mediaQuery = 'all') {
  const rules = [];
  const ruleRegex = /([^{}]+)\{([^}]+)\}/g;
  let match;

  while ((match = ruleRegex.exec(cssChunk)) !== null) {
    const rawSelectors = match[1].trim();
    const rawDeclarations = match[2].trim();

    const declarations = {};
    rawDeclarations.split(';').forEach((decl) => {
      const colIdx = decl.indexOf(':');
      if (colIdx > 0) {
        const prop = decl.slice(0, colIdx).trim().toLowerCase();
        let val = decl.slice(colIdx + 1).trim();
        if (prop && val) {
          // Normalize !important
          val = val.replace(/\s*!important/i, '').trim();
          declarations[prop] = val;
        }
      }
    });

    rawSelectors.split(',').forEach((sel) => {
      const s = sel.trim();
      if (s) {
        rules.push({
          selector: s,
          declarations,
          mediaQuery
        });
      }
    });
  }

  return rules;
}

/**
 * Media Query Matcher for Viewport Widths
 */
function matchesMediaQuery(mediaQuery, viewportWidth) {
  if (!mediaQuery || mediaQuery === 'all') return true;

  // Handle (max-width: XXXpx)
  const maxWidthMatch = mediaQuery.match(/max-width:\s*(\d+)px/);
  if (maxWidthMatch) {
    const maxW = parseInt(maxWidthMatch[1], 10);
    if (viewportWidth > maxW) return false;
  }

  // Handle (min-width: XXXpx)
  const minWidthMatch = mediaQuery.match(/min-width:\s*(\d+)px/);
  if (minWidthMatch) {
    const minW = parseInt(minWidthMatch[1], 10);
    if (viewportWidth < minW) return false;
  }

  return true;
}

/**
 * CSS Math Evaluator (evaluates clamp, calc, px, rem, vw)
 */
function evaluateCssValue(val, viewportWidth = 375, baseFontSize = 16) {
  if (typeof val !== 'string') return val;

  // Handle clamp(min, val, max)
  const clampMatch = val.match(/clamp\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/);
  if (clampMatch) {
    const min = parseDimension(clampMatch[1], viewportWidth, baseFontSize);
    const pref = parseDimension(clampMatch[2], viewportWidth, baseFontSize);
    const max = parseDimension(clampMatch[3], viewportWidth, baseFontSize);
    return Math.min(Math.max(min, pref), max);
  }

  // Handle calc() or direct dimensions
  return parseDimension(val, viewportWidth, baseFontSize);
}

function parseDimension(dimStr, viewportWidth = 375, baseFontSize = 16) {
  if (typeof dimStr === 'number') return dimStr;
  const str = dimStr.trim();

  // Handle vw
  if (str.endsWith('vw')) {
    const num = parseFloat(str);
    return (num * viewportWidth) / 100;
  }
  // Handle px
  if (str.endsWith('px')) {
    return parseFloat(str);
  }
  // Handle rem
  if (str.endsWith('rem')) {
    return parseFloat(str) * baseFontSize;
  }
  // Handle em
  if (str.endsWith('em')) {
    return parseFloat(str) * baseFontSize;
  }
  // Handle %
  if (str.endsWith('%')) {
    return (parseFloat(str) * viewportWidth) / 100;
  }
  // Raw number
  const num = parseFloat(str);
  return isNaN(num) ? str : num;
}

/**
 * Simple Lightweight DOM Element Representation
 */
class MockElement {
  constructor(tagName, id = '', className = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.className = className;
    this.classList = new MockClassList(className, this);
    this.attributes = {};
    this.style = {};
    this.children = [];
    this.parentElement = null;
    this.innerHTML = '';
    this.textContent = '';
    this.listeners = {};
    this.value = '';
    this.disabled = false;
    this.dataset = {};

    if (id) this.attributes['id'] = id;
    if (className) this.attributes['class'] = className;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === 'class') {
      this.className = String(value);
      this.classList.value = String(value);
    } else if (name === 'id') {
      this.id = String(value);
    } else if (name.startsWith('data-')) {
      const prop = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      this.dataset[prop] = String(value);
    }
  }

  getAttribute(name) {
    return this.attributes[name] !== undefined ? this.attributes[name] : null;
  }

  removeAttribute(name) {
    delete this.attributes[name];
    if (name === 'class') {
      this.className = '';
      this.classList.value = '';
    } else if (name.startsWith('data-')) {
      const prop = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      delete this.dataset[prop];
    }
  }

  hasAttribute(name) {
    return this.attributes[name] !== undefined;
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentElement = null;
    }
    return child;
  }

  addEventListener(event, handler, options) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push({ handler, options });
  }

  removeEventListener(event, handler) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((l) => l.handler !== handler);
  }

  dispatchEvent(event) {
    const type = typeof event === 'string' ? event : event.type;
    const listeners = this.listeners[type] || [];
    const evtObj = typeof event === 'string' ? { type: event, target: this, preventDefault: () => {} } : event;
    for (const l of listeners) {
      l.handler.call(this, evtObj);
    }
    return true;
  }

  click() {
    this.dispatchEvent({ type: 'click', target: this, preventDefault: () => {} });
  }

  querySelector(selector) {
    return querySelectorInTree(this, selector);
  }

  querySelectorAll(selector) {
    const results = [];
    querySelectorAllInTree(this, selector, results);
    return results;
  }

  getBoundingClientRect() {
    return {
      top: 0,
      left: 0,
      bottom: 44,
      right: 100,
      width: 100,
      height: 44,
      x: 0,
      y: 0
    };
  }
}

class MockClassList {
  constructor(initialClass = '', el) {
    this.el = el;
    this.set = new Set(initialClass ? initialClass.split(/\s+/).filter(Boolean) : []);
  }

  get value() {
    return Array.from(this.set).join(' ');
  }

  set value(v) {
    this.set = new Set(v ? v.split(/\s+/).filter(Boolean) : []);
  }

  add(...classes) {
    classes.forEach((c) => this.set.add(c));
    this.sync();
  }

  remove(...classes) {
    classes.forEach((c) => this.set.delete(c));
    this.sync();
  }

  toggle(cls, force) {
    if (force === true) {
      this.set.add(cls);
    } else if (force === false) {
      this.set.delete(cls);
    } else {
      if (this.set.has(cls)) this.set.delete(cls);
      else this.set.add(cls);
    }
    this.sync();
    return this.set.has(cls);
  }

  contains(cls) {
    return this.set.has(cls);
  }

  sync() {
    if (this.el) {
      this.el.className = this.value;
      this.el.attributes['class'] = this.value;
    }
  }
}

/**
 * Basic CSS Selector Engine for Mock DOM
 */
function matchesSelector(el, sel) {
  sel = sel.trim();
  if (sel === '*') return true;

  // ID selector #foo
  if (sel.startsWith('#')) {
    return el.id === sel.slice(1);
  }

  // Class selector .bar
  if (sel.startsWith('.')) {
    return el.classList && el.classList.contains(sel.slice(1));
  }

  // Tag selector
  if (/^[A-Za-z0-9]+$/.test(sel)) {
    return el.tagName === sel.toUpperCase();
  }

  // Attribute selector [data-foo] or [data-foo="bar"]
  const attrMatch = sel.match(/^\[([a-zA-Z0-9_-]+)(?:=([^\\]+?))?\]$/);
  if (attrMatch) {
    const attrName = attrMatch[1];
    const attrVal = attrMatch[2] ? attrMatch[2].replace(/^['"]|['"]$/g, '') : null;
    if (attrVal === null) {
      return el.hasAttribute(attrName);
    }
    return el.getAttribute(attrName) === attrVal;
  }

  // Pseudo-class e.g. .is-active
  if (sel.includes('.')) {
    const parts = sel.split('.');
    const tag = parts[0] ? parts[0].toUpperCase() : null;
    if (tag && el.tagName !== tag) return false;
    for (let i = 1; i < parts.length; i++) {
      if (!el.classList.contains(parts[i])) return false;
    }
    return true;
  }

  return false;
}

function querySelectorInTree(root, selector) {
  // Descendant selector 'A B'
  const parts = selector.split(/\s+/);
  if (parts.length === 1) {
    for (const child of root.children) {
      if (matchesSelector(child, selector)) return child;
      const found = querySelectorInTree(child, selector);
      if (found) return found;
    }
    return null;
  }

  // Multi-part selector
  const all = [];
  querySelectorAllInTree(root, parts[0], all);
  for (const match of all) {
    const rest = parts.slice(1).join(' ');
    const found = querySelectorInTree(match, rest);
    if (found) return found;
  }
  return null;
}

function querySelectorAllInTree(root, selector, results = []) {
  for (const child of root.children) {
    if (matchesSelector(child, selector)) {
      results.push(child);
    }
    querySelectorAllInTree(child, selector, results);
  }
  return results;
}

/**
 * Build Virtual Document from HTML String
 */
function buildMockDocument(htmlContent) {
  const docElement = new MockElement('HTML');
  const body = new MockElement('BODY');
  docElement.appendChild(body);

  // Fast HTML tag regex parser
  const tagRegex = /<([a-zA-Z0-9-]+)([^>]*)>([\s\S]*?)<\/\1>|<([a-zA-Z0-9-]+)([^>]*)\/?>/g;
  
  // Create simplified tree based on HTML ids/classes
  const idRegex = /id=["']([^"']+)["']/g;
  const classRegex = /class=["']([^"']+)["']/g;
  const elementMap = new Map();

  // Parse HTML elements with attributes
  const elemRegex = /<([a-zA-Z0-9-]+)([^>]*)>/g;
  let elemMatch;
  const stack = [body];

  while ((elemMatch = elemRegex.exec(htmlContent)) !== null) {
    const fullTag = elemMatch[0];
    const tagName = elemMatch[1];
    const rawAttrs = elemMatch[2];

    if (fullTag.startsWith('</')) {
      if (stack.length > 1) stack.pop();
      continue;
    }

    const isSelfClosing = fullTag.endsWith('/>') || ['INPUT', 'IMG', 'BR', 'HR', 'META', 'LINK'].includes(tagName.toUpperCase());

    const elem = new MockElement(tagName);

    // Parse attributes
    const attrPairRegex = /([a-zA-Z0-9_:-]+)(?:=["']([^"']*)["'])?/g;
    let attrMatch;
    while ((attrMatch = attrPairRegex.exec(rawAttrs)) !== null) {
      const attrName = attrMatch[1];
      const attrVal = attrMatch[2] !== undefined ? attrMatch[2] : '';
      elem.setAttribute(attrName, attrVal);
    }

    stack[stack.length - 1].appendChild(elem);
    if (elem.id) elementMap.set(elem.id, elem);

    if (!isSelfClosing) {
      stack.push(elem);
    }
  }

  return {
    documentElement: docElement,
    body: body,
    getElementById: (id) => elementMap.get(id) || querySelectorInTree(body, `#${id}`),
    querySelector: (sel) => querySelectorInTree(body, sel),
    querySelectorAll: (sel) => {
      const res = [];
      querySelectorAllInTree(body, sel, res);
      return res;
    }
  };
}

/**
 * Compute Effective CSS Properties for Element at Target Viewport Width
 */
function getComputedProperties(cssRules, selectorOrClass, viewportWidth = 375) {
  const merged = {};

  cssRules.forEach((rule) => {
    if (!matchesMediaQuery(rule.mediaQuery, viewportWidth)) return;

    if (rule.selector === selectorOrClass || rule.selector.endsWith(selectorOrClass)) {
      Object.assign(merged, rule.declarations);
    }
  });

  return merged;
}

module.exports = {
  loadSourceFiles,
  parseCssRules,
  matchesMediaQuery,
  evaluateCssValue,
  parseDimension,
  MockElement,
  buildMockDocument,
  getComputedProperties,
  PROJECT_ROOT
};
