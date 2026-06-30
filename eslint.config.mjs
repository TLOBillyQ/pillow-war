import base from 'genshin-ts/configs/eslint/full.mjs'

// The acceptance pipeline (acceptance/), vendored APS tools (tools/), and unit
// tests (test/) are normal Node/TS that run OUTSIDE the node-graph environment.
// The gsts graph linter must not apply to them; acceptance/ and test/ are
// type-checked by their own node tsconfig.json files.
export default [{ ignores: ['acceptance/**', 'tools/**', 'build/**', 'test/**'] }, ...base]
