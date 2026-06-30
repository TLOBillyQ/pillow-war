// Unit tests for the pure greeting core. These run OUTSIDE the gsts node-graph
// environment via Node's built-in test runner, so they live here rather than
// under src/ (which gsts compiles into graphs). They are intentionally separate
// from the generated acceptance tests: acceptance proves the feature end-to-end,
// these pin the core's behavior directly and would fail for plausible wrong
// implementations (constant output, wrong separator, dropped/!interpolated name).

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildGreeting } from '../src/core/greeting.ts'

test('builds "hello <name>" for the given target', () => {
  assert.equal(buildGreeting('world'), 'hello world')
})

test('interpolates the target rather than returning a constant', () => {
  assert.equal(buildGreeting('pillow'), 'hello pillow')
  assert.notEqual(buildGreeting('world'), buildGreeting('pillow'))
})

test('uses a single space between greeting and target', () => {
  assert.equal(buildGreeting('a'), 'hello a')
})

test('preserves the target verbatim, including spaces', () => {
  assert.equal(buildGreeting('big world'), 'hello big world')
})

test('handles an empty target without dropping the separator', () => {
  assert.equal(buildGreeting(''), 'hello ')
})
