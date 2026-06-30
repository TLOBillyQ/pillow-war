#!/usr/bin/env node
// Mutation-site SCAN — count only, never runs mutation tests.
//
// Implements the refactorer role's "use the mutation tool's scan/count mode to
// count mutation sites without running mutation tests" and the ">100 sites ->
// split" rule. Uses Stryker's own instrumenter so the counts match exactly what
// `stryker run` would generate, but without executing any test.
//
// Usage:
//   node scripts/mutate-scan.mjs [--limit N] [file ...]
//   node scripts/mutate-scan.mjs --changed        # scan changed/new src files
//
// With no file args (and without --changed) it scans every testable source file.
// Exits non-zero if any file exceeds the limit (default 100).
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { Instrumenter } from '@stryker-mutator/instrumenter'

import { isTestableSource } from './lib/testable.mjs'

const ROOT = process.cwd()

function parseArgs(argv) {
  const opts = { limit: 100, changed: false, files: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--limit') opts.limit = Number(argv[++i])
    else if (a === '--changed') opts.changed = true
    else opts.files.push(a)
  }
  return opts
}

function walk(dir, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, acc)
    else acc.push(full)
  }
  return acc
}

function changedSourceFiles() {
  let out = ''
  try {
    out = execFileSync('git', ['status', '--porcelain', '--', 'src'], {
      cwd: ROOT,
      encoding: 'utf8'
    })
  } catch {
    return []
  }
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter((p) => isTestableSource(p))
}

function discoverFiles(opts) {
  let rels
  if (opts.files.length) {
    rels = opts.files.map((f) => path.relative(ROOT, path.resolve(ROOT, f)))
  } else if (opts.changed) {
    rels = changedSourceFiles()
  } else {
    const srcDir = path.join(ROOT, 'src')
    rels = fs.existsSync(srcDir) ? walk(srcDir, []).map((f) => path.relative(ROOT, f)) : []
  }
  return rels.map((p) => p.replace(/\\/g, '/')).filter(isTestableSource)
}

const noop = () => {}
const logger = {
  isTraceEnabled: () => false,
  isDebugEnabled: () => false,
  isInfoEnabled: () => false,
  isWarnEnabled: () => false,
  isErrorEnabled: () => false,
  isFatalEnabled: () => false,
  trace: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const files = discoverFiles(opts)

  if (files.length === 0) {
    console.log('mutate-scan: no testable source files found. OK.')
    return 0
  }

  const instrumenter = new Instrumenter(logger)
  const result = await instrumenter.instrument(
    // `mutate: true` = consider the whole file (vs. a list of line ranges).
    files.map((name) => ({
      name,
      content: fs.readFileSync(path.join(ROOT, name), 'utf8'),
      mutate: true
    })),
    { plugins: null, excludedMutations: [], ignorers: [] }
  )

  const counts = new Map(files.map((f) => [f, 0]))
  for (const m of result.mutants) {
    const key = m.fileName.replace(/\\/g, '/')
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const over = rows.filter(([, n]) => n > opts.limit)
  const total = rows.reduce((s, [, n]) => s + n, 0)

  console.log(
    `mutate-scan: ${rows.length} file(s), ${total} mutation site(s), limit ${opts.limit}/file`
  )
  for (const [file, n] of rows) {
    console.log(`  ${n > opts.limit ? 'OVER ' : '     '}${String(n).padStart(5)}  ${file}`)
  }

  if (over.length) {
    console.error(
      `\nmutate-scan: ${over.length} file(s) exceed ${opts.limit} sites — split before handoff:`
    )
    for (const [file, n] of over) console.error(`  ${file}: ${n}`)
    return 1
  }
  return 0
}

main().then((code) => process.exit(code))
