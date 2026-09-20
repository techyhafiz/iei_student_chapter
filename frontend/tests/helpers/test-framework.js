/**
 * Standalone Test Framework & Assertion Library for IEI Mobile Overhaul E2E Suites
 * Zero external dependencies. Works in standard Node.js v18+.
 */

const fs = require('fs');
const path = require('path');

class AssertionError extends Error {
  constructor(message, actual, expected) {
    super(message);
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
  }
}

class TestContext {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.total = 0;
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.results = [];
  }

  describe(name, fn) {
    const parentSuite = this.currentSuite;
    const suite = {
      name,
      parent: parentSuite,
      tests: [],
      beforeEachHooks: [],
      afterEachHooks: [],
      beforeAllHooks: [],
      afterAllHooks: []
    };

    if (parentSuite) {
      parentSuite.suites = parentSuite.suites || [];
      parentSuite.suites.push(suite);
    } else {
      this.suites.push(suite);
    }

    this.currentSuite = suite;
    try {
      fn();
    } finally {
      this.currentSuite = parentSuite;
    }
  }

  it(name, fn) {
    if (!this.currentSuite) {
      throw new Error(`Test "${name}" must be inside a describe block`);
    }
    this.currentSuite.tests.push({ name, fn });
  }

  beforeEach(fn) {
    if (this.currentSuite) this.currentSuite.beforeEachHooks.push(fn);
  }

  afterEach(fn) {
    if (this.currentSuite) this.currentSuite.afterEachHooks.push(fn);
  }

  beforeAll(fn) {
    if (this.currentSuite) this.currentSuite.beforeAllHooks.push(fn);
  }

  afterAll(fn) {
    if (this.currentSuite) this.currentSuite.afterAllHooks.push(fn);
  }

  async runSuite(suite, prefix = '') {
    const suiteName = prefix ? `${prefix} > ${suite.name}` : suite.name;
    const suiteResult = {
      name: suiteName,
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0
    };

    // Run beforeAll
    for (const hook of suite.beforeAllHooks) {
      await hook();
    }

    // Run tests in current suite
    for (const test of suite.tests) {
      this.total++;
      const testResult = {
        name: test.name,
        fullName: `${suiteName} :: ${test.name}`,
        passed: false,
        duration: 0,
        error: null
      };

      const start = Date.now();
      try {
        for (const hook of suite.beforeEachHooks) {
          await hook();
        }

        await test.fn();

        for (const hook of suite.afterEachHooks) {
          await hook();
        }

        testResult.passed = true;
        this.passed++;
        suiteResult.passed++;
      } catch (err) {
        testResult.passed = false;
        testResult.error = {
          message: err.message,
          actual: err.actual,
          expected: err.expected,
          stack: err.stack
        };
        this.failed++;
        suiteResult.failed++;
      } finally {
        testResult.duration = Date.now() - start;
        suiteResult.tests.push(testResult);
        this.results.push(testResult);
      }
    }

    // Run nested suites
    if (suite.suites && suite.suites.length) {
      for (const nested of suite.suites) {
        const nestedResult = await this.runSuite(nested, suiteName);
        suiteResult.passed += nestedResult.passed;
        suiteResult.failed += nestedResult.failed;
        suiteResult.skipped += nestedResult.skipped;
      }
    }

    // Run afterAll
    for (const hook of suite.afterAllHooks) {
      await hook();
    }

    return suiteResult;
  }

  async runAll() {
    this.total = 0;
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.results = [];

    const suiteResults = [];
    for (const suite of this.suites) {
      const res = await this.runSuite(suite);
      suiteResults.push(res);
    }

    return {
      total: this.total,
      passed: this.passed,
      failed: this.failed,
      skipped: this.skipped,
      results: this.results,
      suites: suiteResults
    };
  }

  reset() {
    this.suites = [];
    this.currentSuite = null;
    this.total = 0;
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.results = [];
  }
}

// Fluent Matcher
function expect(actual) {
  return {
    toBe(expected, msg) {
      if (actual !== expected) {
        throw new AssertionError(
          msg || `Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`,
          actual,
          expected
        );
      }
    },
    toEqual(expected, msg) {
      const actualJson = JSON.stringify(actual);
      const expectedJson = JSON.stringify(expected);
      if (actualJson !== expectedJson) {
        throw new AssertionError(
          msg || `Expected ${actualJson} to equal ${expectedJson}`,
          actual,
          expected
        );
      }
    },
    toBeGreaterThan(expected, msg) {
      if (!(actual > expected)) {
        throw new AssertionError(
          msg || `Expected ${actual} to be > ${expected}`,
          actual,
          expected
        );
      }
    },
    toBeGreaterThanOrEqual(expected, msg) {
      if (!(actual >= expected)) {
        throw new AssertionError(
          msg || `Expected ${actual} to be >= ${expected}`,
          actual,
          expected
        );
      }
    },
    toBeLessThan(expected, msg) {
      if (!(actual < expected)) {
        throw new AssertionError(
          msg || `Expected ${actual} to be < ${expected}`,
          actual,
          expected
        );
      }
    },
    toBeLessThanOrEqual(expected, msg) {
      if (!(actual <= expected)) {
        throw new AssertionError(
          msg || `Expected ${actual} to be <= ${expected}`,
          actual,
          expected
        );
      }
    },
    toBeTruthy(msg) {
      if (!actual) {
        throw new AssertionError(
          msg || `Expected truthy value, got ${JSON.stringify(actual)}`,
          actual,
          true
        );
      }
    },
    toBeFalsy(msg) {
      if (actual) {
        throw new AssertionError(
          msg || `Expected falsy value, got ${JSON.stringify(actual)}`,
          actual,
          false
        );
      }
    },
    toBeNull(msg) {
      if (actual !== null) {
        throw new AssertionError(
          msg || `Expected null, got ${JSON.stringify(actual)}`,
          actual,
          null
        );
      }
    },
    toBeDefined(msg) {
      if (actual === undefined) {
        throw new AssertionError(
          msg || `Expected value to be defined`,
          actual,
          'defined'
        );
      }
    },
    toContain(expected, msg) {
      if (typeof actual === 'string') {
        if (!actual.includes(expected)) {
          throw new AssertionError(
            msg || `Expected string to contain ${JSON.stringify(expected)}`,
            actual,
            expected
          );
        }
      } else if (Array.isArray(actual)) {
        if (!actual.includes(expected)) {
          throw new AssertionError(
            msg || `Expected array to contain ${JSON.stringify(expected)}`,
            actual,
            expected
          );
        }
      } else {
        throw new AssertionError(
          msg || `toContain target must be string or array`,
          actual,
          expected
        );
      }
    },
    toMatch(regex, msg) {
      if (!regex.test(String(actual))) {
        throw new AssertionError(
          msg || `Expected ${JSON.stringify(actual)} to match regex ${regex}`,
          actual,
          regex.toString()
        );
      }
    },
    toThrow(expectedSubstring) {
      if (typeof actual !== 'function') {
        throw new AssertionError(`Expected a function in toThrow()`, typeof actual, 'function');
      }
      let threw = false;
      let error = null;
      try {
        actual();
      } catch (e) {
        threw = true;
        error = e;
      }
      if (!threw) {
        throw new AssertionError(`Expected function to throw error, but it did not`);
      }
      if (expectedSubstring && error) {
        if (!error.message.includes(expectedSubstring)) {
          throw new AssertionError(
            `Expected thrown error to contain "${expectedSubstring}", got "${error.message}"`,
            error.message,
            expectedSubstring
          );
        }
      }
    },
    not: {
      toBe(expected, msg) {
        if (actual === expected) {
          throw new AssertionError(
            msg || `Expected ${JSON.stringify(actual)} NOT to be ${JSON.stringify(expected)}`,
            actual,
            `not ${expected}`
          );
        }
      },
      toContain(expected, msg) {
        if (typeof actual === 'string' && actual.includes(expected)) {
          throw new AssertionError(
            msg || `Expected string NOT to contain ${JSON.stringify(expected)}`,
            actual,
            `not ${expected}`
          );
        } else if (Array.isArray(actual) && actual.includes(expected)) {
          throw new AssertionError(
            msg || `Expected array NOT to contain ${JSON.stringify(expected)}`,
            actual,
            `not ${expected}`
          );
        }
      },
      toMatch(regex, msg) {
        if (regex.test(String(actual))) {
          throw new AssertionError(
            msg || `Expected ${JSON.stringify(actual)} NOT to match regex ${regex}`,
            actual,
            `not ${regex}`
          );
        }
      }
    }
  };
}

const defaultContext = new TestContext();

module.exports = {
  TestContext,
  defaultContext,
  describe: (name, fn) => defaultContext.describe(name, fn),
  it: (name, fn) => defaultContext.it(name, fn),
  beforeEach: (fn) => defaultContext.beforeEach(fn),
  afterEach: (fn) => defaultContext.afterEach(fn),
  beforeAll: (fn) => defaultContext.beforeAll(fn),
  afterAll: (fn) => defaultContext.afterAll(fn),
  expect,
  AssertionError
};
