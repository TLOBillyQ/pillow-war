// Pure, testable core. No gsts runtime dependency: this module must be runnable
// outside the node-graph environment so the acceptance pipeline can exercise it
// directly. The gsts shell (src/main.ts) consumes it via top-level precompute.

export function buildGreeting(name: string): string {
  return `hello ${name}`
}
