// Single source of truth for which modules are TESTABLE versus
// environmentally unsuitable graph-adapter shells.
//
// Consumed by scripts/crap.mjs and scripts/mutate-scan.mjs (via
// isTestableSource). UNSUITABLE_GLOBS is the canonical exclusion list mirrored
// by .c8rc.json (coverage) — JSON config cannot import this module, so keep the
// two in sync if you change the list here.
//
// Convention:
//   - Testable logic lives in pure modules under src/ (e.g. src/core/) that do
//     NOT call the gsts node-graph runtime (`g.server(...).on(...)`). They
//     compile via gsts and are unit-tested in plain Node (node:test).
//   - Graph-adapter shells (src/main.ts, *.entry.ts) and generated artifacts
//     (*.gs.ts) are environmentally unsuitable: kept thin and excluded from
//     tests, coverage, mutation, and CRAP.
//   - Unit tests live under test/ as *.test.ts; property tests as *.prop.ts
//     (kept separate from the normal suite). See docs/REFACTORER_TOOLING.md.

/** Graph-adapter shells & generated artifacts — never tested/mutated/scored. */
export const UNSUITABLE_GLOBS = ['src/main.ts', 'src/**/*.entry.ts', 'src/**/*.gs.ts']

/**
 * True when a repo-relative path is a testable source module (used by the
 * crap/mutate-scan file walkers). Mirrors UNSUITABLE_GLOBS.
 */
export function isTestableSource(relPath) {
  const p = relPath.replace(/\\/g, '/')
  if (!p.startsWith('src/')) return false
  if (!p.endsWith('.ts')) return false
  if (p.endsWith('.d.ts')) return false
  if (p === 'src/main.ts') return false
  if (p.endsWith('.entry.ts')) return false
  if (p.endsWith('.gs.ts')) return false
  if (p.endsWith('.test.ts')) return false
  return true
}
