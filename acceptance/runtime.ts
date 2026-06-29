// Acceptance runtime: the shared execution engine used by generated tests and
// by the mutation runner adapter. It is project-neutral; all project meaning
// lives in the step handlers (steps.ts).
//
// Responsibilities (APS acceptance-generator runtime contract):
//   - load IR, expand each scenario into one execution per example row
//     (one empty-example execution when a scenario has no examples),
//   - prepend background steps to every execution,
//   - run steps in order against a fresh world per execution,
//   - route each step to a project handler,
//   - report unsupported step / missing value / invalid conversion / failed
//     assertion as a test failure.

import { type Feature, type Step, loadFeatureIr } from './ir.ts'
import { handlers } from './steps.ts'

export interface RunResult {
  ok: boolean
  executions: number
  failures: string[]
  output: string
}

function executionsFor(scenario: Feature['scenarios'][number]): Array<Record<string, string>> {
  return scenario.examples.length > 0 ? scenario.examples : [{}]
}

function runStep(step: Step, world: Record<string, unknown>, example: Record<string, string>): void {
  for (const handler of handlers) {
    const match = handler.pattern.exec(step.text)
    if (match) {
      handler.run({ world, example, captures: match.slice(1) })
      return
    }
  }
  throw new Error(`unsupported step: "${step.keyword} ${step.text}"`)
}

export function runFeature(feature: Feature): RunResult {
  const background: Step[] = feature.background ?? []
  const failures: string[] = []
  let executions = 0

  for (const scenario of feature.scenarios) {
    const rows = executionsFor(scenario)
    rows.forEach((example, index) => {
      executions += 1
      const label = `${scenario.name}/example_${index + 1}`
      const world: Record<string, unknown> = {}
      try {
        for (const step of [...background, ...scenario.steps]) {
          runStep(step, world, example)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        failures.push(`${label}: ${message}`)
      }
    })
  }

  const ok = failures.length === 0
  const output = ok
    ? `ok: ${executions} execution(s) passed`
    : `${failures.length} of ${executions} execution(s) failed\n${failures.join('\n')}`
  return { ok, executions, failures, output }
}

export function runIr(irPath: string): RunResult {
  return runFeature(loadFeatureIr(irPath))
}
