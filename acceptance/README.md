# Acceptance pipeline (APS)

Gherkin-driven acceptance tests + acceptance mutation, built on the
[Acceptance Pipeline Specification](https://github.com/unclebob/Acceptance-Pipeline-Specification).

## Why it targets a pure core

gsts source compiles to node graphs that only run inside a game map, so it
cannot be executed here. The acceptance pipeline therefore exercises the pure,
runtime-free **core** (`src/core/`) directly. The gsts shell (`src/main.ts`)
consumes that same core via top-level precompute. Keep gameplay rules in
`src/core/` (testable) and keep the graph shell thin.

## Layout

| Path | Role | Committed? |
| --- | --- | --- |
| `features/*.feature` | Gherkin specs (parser subset) | yes |
| `acceptance/ir.ts` | JSON IR types + loader | yes |
| `acceptance/runtime.ts` | scenario/example expansion + step dispatch | yes |
| `acceptance/steps.ts` | project step handlers (regex → core + assertions) | yes |
| `acceptance/generate.ts` | `acceptance-entrypoint-generator` | yes |
| `acceptance/runner-adapter.ts` | persistent mutation runner worker | yes |
| `acceptance/run.sh` / `mutate.sh` | stable convenience commands | yes |
| `acceptance/tsconfig.json` | type-checks this pipeline (node, not gsts) | yes |
| `tools/aps/` | vendored APS bb tools (`bb gherkin-parser`/`-mutator`) | no (gitignored) |
| `build/acceptance*/` | generated IR, entry points, mutation work | no (gitignored) |

## Commands

```sh
acceptance/install-aps.sh     # procure/refresh the APS bb tools into tools/aps
npm run acceptance            # normal run: parse → generate → execute
npm run acceptance:typecheck  # type-check the pipeline
npm run acceptance:mutate          # acceptance mutation, hard (differential) level
npm run acceptance:mutate -- soft  # soft level (ignores implementation_hash)
```

The portable APS commands (`bb gherkin-parser`, `bb gherkin-mutator`,
`bb gherkin-ir-dry-checker`) are **not** reimplemented here; they are procured
from upstream by `install-aps.sh`. Only the project-specific components live in
this directory.

## Adding coverage

1. Write/extend a `features/*.feature` (Given/When/Then/And, `<placeholders>`,
   `Examples:` tables only).
2. Add or extend a handler in `steps.ts` that matches the new step text and
   drives `src/core/`. One regex handler can capture the placeholder name and
   read it from the example row.
3. `npm run acceptance` to prove it passes, then `npm run acceptance:mutate` to
   confirm important example values are killed (no survivors).

The mutator maintains a differential manifest + mutation-stamp comment block at
the top of each feature file. That block is **tool-managed** — do not hand-edit
it.
