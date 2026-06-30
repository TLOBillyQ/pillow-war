# Refactorer Analysis & Test Tooling

TypeScript-native equivalents of the SwarmForge constitution's analysis tools.
The constitution's tool table (`swarmforge/scripts/shared-articles/engineering.prompt`)
lists mutation/CRAP/DRY tools only for Go, Clojure, and Java; this project is
TypeScript, so the closest mature TS-native tools are used instead. The unit
runner is Node's built-in `node:test` (zero runtime deps, runs `.ts` natively),
matching the coder's harness.

| Constitution role | TS-native tool | Command |
| --- | --- | --- |
| Unit tests | `node:test` | `npm test` |
| Property tests | fast-check + `node:test` (separate suite) | `npm run test:prop` |
| Coverage | c8 (V8 → istanbul JSON) | `npm run coverage` |
| CRAP | custom (`scripts/crap.mjs`, TS AST + coverage) | `npm run crap` |
| Mutation **scan/count** | `@stryker-mutator/instrumenter` (`scripts/mutate-scan.mjs`) | `npm run mutate:scan` |
| DRY | jscpd | `npm run dry` |
| Acceptance (coder-owned) | APS Gherkin pipeline | `npm run acceptance` |

## Testable vs. environmentally unsuitable modules

`scripts/lib/testable.mjs` is the single source of truth (mirrored in
`.c8rc.json`, which is JSON and cannot import it).

- **Testable**: pure modules under `src/` (e.g. `src/core/`) that do **not** call
  the gsts node-graph runtime (`g.server(...).on(...)`). They compile via gsts and
  are unit-tested in plain Node. These participate in tests, coverage, mutation,
  and CRAP.
- **Environmentally unsuitable** (excluded from all test tooling): graph-adapter
  shells (`src/main.ts`, `src/**/*.entry.ts`) and generated artifacts
  (`src/**/*.gs.ts`). Keep these thin; move logic into testable modules.

## Test layout & conventions

- Unit tests: `test/**/*.test.ts` (`node:test`), run via `npm test`.
- Property tests: `test/**/*.prop.ts` (note: **not** `*.test.ts`, so they are
  excluded from the normal unit glob), run via `npm run test:prop`.
- `test/` is type-checked by its own `test/tsconfig.json` (`npm run test:typecheck`)
  and is excluded from the gsts lint/typecheck.

Property tests are kept **separate** from the normal unit suite and coverage,
per the engineering rules.

## Refactorer workflow (per role prompt)

1. `npm run coverage` then `npm run crap` — reduce every function's CRAP to
   **6 or below** (CRAP needs coverage to be meaningful).
2. `npm run dry` — reduce duplication where reasonable.
3. `npm run mutate:scan` — count mutation sites on changed/new files
   (`npm run mutate:scan -- --changed`). If any file exceeds **100** sites,
   perform a behavior-preserving split before handoff.
4. Verify with `npm run typecheck`, `npm run lint`, `npm test`,
   `npm run acceptance`, and `npm run build`.

The refactorer does **not** run mutation tests or Gherkin acceptance mutation
(`npm run acceptance:mutate`); only the count-only mutation scan is used.

## Notes

- `node_modules` install in this environment gates package install scripts.
  esbuild's script (needed by gsts) is approved in `package.json`
  (`allowScripts`). Re-approve with `npm approve-scripts esbuild` if reset.
- Generated artifacts (`coverage/`, `reports/`, `dist/`, `tools/`, `build/`,
  `acceptance/generated/`) are gitignored.
