// Property tests for the pure greeting core, owned by the refactorer. Kept
// SEPARATE from the normal unit suite (named *.prop.ts, not *.test.ts) and run
// via `npm run test:prop`. They use fast-check over broad inputs to assert
// invariants the example-based unit tests only sample at fixed points.

import assert from 'node:assert/strict'
import { test } from 'node:test'

import fc from 'fast-check'

import { buildGreeting } from '../src/core/greeting.ts'

const PREFIX = 'hello '

test('invariant: always starts with the greeting prefix', () => {
  fc.assert(fc.property(fc.string(), (name) => buildGreeting(name).startsWith(PREFIX)))
})

test('round trip: the target is recoverable from the greeting', () => {
  fc.assert(fc.property(fc.string(), (name) => buildGreeting(name).slice(PREFIX.length) === name))
})

test('conservation: length is exactly prefix + target', () => {
  fc.assert(
    fc.property(fc.string(), (name) => buildGreeting(name).length === PREFIX.length + name.length),
  )
})

test('interpolation: distinct targets yield distinct greetings', () => {
  fc.assert(
    fc.property(fc.string(), fc.string(), (a, b) => {
      assert.equal(buildGreeting(a) === buildGreeting(b), a === b)
      return true
    }),
  )
})
