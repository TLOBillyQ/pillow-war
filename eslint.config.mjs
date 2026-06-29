import base from 'genshin-ts/configs/eslint/full.mjs'

// The acceptance pipeline (acceptance/) and vendored APS tools (tools/) are
// normal Node/TS that run OUTSIDE the node-graph environment. The gsts graph
// linter must not apply to them; they are type-checked by acceptance/tsconfig.json.
export default [{ ignores: ['acceptance/**', 'tools/**', 'build/**'] }, ...base]
