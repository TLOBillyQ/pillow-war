import { g } from 'genshin-ts/runtime/core'

import { buildGreeting } from './core/greeting'

// Top-level precompute: pure core runs here, the graph captures the value.
const greeting = buildGreeting('world')

g.server({
  id: 1073741825
}).on('whenEntityIsCreated', (_evt, _f) => {
  console.log(greeting)
})
