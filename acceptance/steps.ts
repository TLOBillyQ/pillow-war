// Project step handlers: the ONLY layer that knows about project behavior.
// Each handler matches raw step text, capturing placeholder NAMES, then reads
// the corresponding example values by name (APS step-handler contract) and
// drives the pure core (src/core). Assertions throw to signal a test failure.

import { buildGreeting } from '../src/core/greeting.ts'

export interface StepContext {
  world: Record<string, unknown>
  example: Record<string, string>
  captures: string[]
}

export interface StepHandler {
  pattern: RegExp
  run: (ctx: StepContext) => void
}

function requireValue(example: Record<string, string>, name: string | undefined): string {
  if (!name) {
    throw new Error('step matched without a placeholder name')
  }
  const value = example[name]
  if (value === undefined) {
    throw new Error(`missing example value for <${name}>`)
  }
  return value
}

export const handlers: StepHandler[] = [
  {
    // e.g. "the greeting target is <target>"
    pattern: /^the greeting target is <([A-Za-z0-9_]+)>$/,
    run: ({ world, example, captures }) => {
      world.target = requireValue(example, captures[0])
    }
  },
  {
    // e.g. "the greeting is <message>"
    pattern: /^the greeting is <([A-Za-z0-9_]+)>$/,
    run: ({ world, example, captures }) => {
      const expected = requireValue(example, captures[0])
      const target = world.target
      if (typeof target !== 'string') {
        throw new Error('greeting target was not set before the assertion')
      }
      const actual = buildGreeting(target)
      if (actual !== expected) {
        throw new Error(`expected greeting "${expected}" but got "${actual}"`)
      }
    }
  }
]
