// Persistent runner adapter for `bb gherkin-mutator --runner-worker`.
//
// Protocol (APS mutator-spec): newline-delimited JSON. Each stdin line is a job
// request; each stdout line is a job response. ONLY protocol JSON goes to
// stdout; diagnostics go to stderr. The worker stays hot and evaluates many
// mutations by running the runtime against each supplied (mutated) IR.
//
// Outcome mapping: test_failure -> killed, test_success -> survived,
// infrastructure_error -> error.

import { createInterface } from 'node:readline'

import { runIr } from './runtime.ts'

interface JobRequest {
  id: string
  feature_json: string
  generated_dir?: string
  work_dir?: string
  timeout?: string
}

interface JobResponse {
  id: string
  outcome: 'test_success' | 'test_failure' | 'infrastructure_error'
  output: string
  error: string
  duration: number
}

function handle(job: JobRequest): JobResponse {
  const start = process.hrtime.bigint()
  try {
    const result = runIr(job.feature_json)
    return {
      id: job.id,
      outcome: result.ok ? 'test_success' : 'test_failure',
      output: result.output,
      error: '',
      duration: Number(process.hrtime.bigint() - start)
    }
  } catch (err) {
    return {
      id: job.id,
      outcome: 'infrastructure_error',
      output: '',
      error: err instanceof Error ? err.message : String(err),
      duration: Number(process.hrtime.bigint() - start)
    }
  }
}

const rl = createInterface({ input: process.stdin })
rl.on('line', (line) => {
  const trimmed = line.trim()
  if (trimmed === '') {
    return
  }
  let job: JobRequest
  try {
    job = JSON.parse(trimmed) as JobRequest
  } catch (err) {
    process.stderr.write(`invalid job request: ${err instanceof Error ? err.message : String(err)}\n`)
    return
  }
  process.stdout.write(`${JSON.stringify(handle(job))}\n`)
})
