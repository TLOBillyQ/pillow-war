// Canonical JSON IR shapes produced by `bb gherkin-parser` (see APS parser-spec).
// This module only loads/validates the IR; it knows nothing about the project.

import { readFileSync } from 'node:fs'

export interface Step {
  keyword: 'Given' | 'When' | 'Then' | 'And'
  text: string
  parameters?: string[]
}

export interface Scenario {
  name: string
  steps: Step[]
  examples: Array<Record<string, string>>
}

export interface Feature {
  name: string
  background?: Step[]
  scenarios: Scenario[]
}

export function loadFeatureIr(path: string): Feature {
  const raw = readFileSync(path, 'utf8')
  const data: unknown = JSON.parse(raw)
  if (typeof data !== 'object' || data === null) {
    throw new Error(`IR at ${path} is not an object`)
  }
  const feature = data as Feature
  if (typeof feature.name !== 'string' || !Array.isArray(feature.scenarios)) {
    throw new Error(`IR at ${path} is missing required name/scenarios`)
  }
  return feature
}
