#!/usr/bin/env node
// CRAP (Change Risk Anti-Patterns) score per function for testable modules.
//
//   CRAP(m) = comp(m)^2 * (1 - cov(m))^3 + comp(m)
//
// comp = cyclomatic complexity (computed from the TypeScript AST);
// cov  = fraction (0..1) of the function's statements covered by the normal
//        (non-property) unit suite, read from coverage/coverage-final.json.
//
// Usage:
//   node scripts/crap.mjs [--threshold N] [--strict] [file ...]
//
// Run `npm run coverage` first for accurate scores. With no coverage data,
// coverage is treated as 0% and the tool warns. Exits non-zero when any
// function exceeds the threshold (default 6) and coverage data is present, or
// always when --strict.
import fs from 'node:fs'
import path from 'node:path'

import ts from 'typescript'

import { isTestableSource } from './lib/testable.mjs'

const ROOT = process.cwd()

function parseArgs(argv) {
  const opts = { threshold: 6, strict: false, files: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--threshold') opts.threshold = Number(argv[++i])
    else if (a === '--strict') opts.strict = true
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

function discoverFiles(opts) {
  let rels
  if (opts.files.length) {
    rels = opts.files.map((f) => path.relative(ROOT, path.resolve(ROOT, f)))
  } else {
    const srcDir = path.join(ROOT, 'src')
    rels = fs.existsSync(srcDir) ? walk(srcDir, []).map((f) => path.relative(ROOT, f)) : []
  }
  return rels.map((p) => p.replace(/\\/g, '/')).filter(isTestableSource)
}

const isFunctionLike = (node) =>
  ts.isFunctionDeclaration(node) ||
  ts.isFunctionExpression(node) ||
  ts.isArrowFunction(node) ||
  ts.isMethodDeclaration(node) ||
  ts.isConstructorDeclaration(node) ||
  ts.isGetAccessor(node) ||
  ts.isSetAccessor(node)

function functionName(node) {
  if (node.name && ts.isIdentifier(node.name)) return node.name.text
  if (ts.isConstructorDeclaration(node)) return 'constructor'
  const p = node.parent
  if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text
  if (p && ts.isPropertyAssignment(p) && p.name && ts.isIdentifier(p.name)) return p.name.text
  if (p && ts.isPropertyDeclaration(p) && p.name && ts.isIdentifier(p.name)) return p.name.text
  return '(anonymous)'
}

// Cyclomatic complexity of a single function, not descending into nested
// functions (each nested function is scored separately).
function complexityOf(fnNode) {
  let c = 1
  const visit = (node) => {
    if (node !== fnNode && isFunctionLike(node)) return
    switch (node.kind) {
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.CaseClause:
      case ts.SyntaxKind.CatchClause:
      case ts.SyntaxKind.ConditionalExpression:
        c++
        break
      case ts.SyntaxKind.BinaryExpression: {
        const op = node.operatorToken.kind
        if (
          op === ts.SyntaxKind.AmpersandAmpersandToken ||
          op === ts.SyntaxKind.BarBarToken ||
          op === ts.SyntaxKind.QuestionQuestionToken
        )
          c++
        break
      }
    }
    ts.forEachChild(node, visit)
  }
  ts.forEachChild(fnNode, visit)
  return c
}

function collectFunctions(file) {
  const sf = ts.createSourceFile(
    file,
    fs.readFileSync(path.join(ROOT, file), 'utf8'),
    ts.ScriptTarget.Latest,
    true
  )
  const fns = []
  const collect = (node) => {
    if (isFunctionLike(node)) {
      const startLine = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
      const endLine = sf.getLineAndCharacterOfPosition(node.getEnd()).line + 1
      fns.push({ name: functionName(node), startLine, endLine, complexity: complexityOf(node) })
    }
    ts.forEachChild(node, collect)
  }
  collect(sf)
  return fns
}

function loadCoverage() {
  const p = path.join(ROOT, 'coverage', 'coverage-final.json')
  if (!fs.existsSync(p)) return null
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

// Fraction of a function's statements that are covered, from Istanbul-format
// coverage data, matched to the function by line span.
function coverageForFunction(fileCov, fn) {
  if (!fileCov) return 0
  const stmtMap = fileCov.statementMap ?? {}
  const hits = fileCov.s ?? {}
  let total = 0
  let covered = 0
  for (const id of Object.keys(stmtMap)) {
    const line = stmtMap[id].start.line
    if (line >= fn.startLine && line <= fn.endLine) {
      total++
      if ((hits[id] ?? 0) > 0) covered++
    }
  }
  if (total > 0) return covered / total
  // Fall back to the function-hit map when no statements fall inside the span.
  const fnMap = fileCov.fnMap ?? {}
  const fHits = fileCov.f ?? {}
  for (const id of Object.keys(fnMap)) {
    const loc = fnMap[id].decl?.start ?? fnMap[id].loc?.start
    if (loc && loc.line === fn.startLine) return (fHits[id] ?? 0) > 0 ? 1 : 0
  }
  return 0
}

function crap(comp, cov) {
  return comp * comp * Math.pow(1 - cov, 3) + comp
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  const files = discoverFiles(opts)
  const coverage = loadCoverage()

  const covByFile = new Map()
  if (coverage) {
    for (const key of Object.keys(coverage)) {
      covByFile.set(path.resolve(key).replace(/\\/g, '/'), coverage[key])
    }
  }

  const rows = []
  for (const file of files) {
    const abs = path.resolve(ROOT, file).replace(/\\/g, '/')
    const fileCov = covByFile.get(abs) ?? null
    for (const fn of collectFunctions(file)) {
      const cov = coverageForFunction(fileCov, fn)
      rows.push({
        file,
        fn: fn.name,
        line: fn.startLine,
        comp: fn.complexity,
        cov,
        crap: crap(fn.complexity, cov)
      })
    }
  }

  if (rows.length === 0) {
    console.log('crap: no testable functions found. OK.')
    return 0
  }

  if (!coverage) {
    console.warn('crap: coverage/coverage-final.json not found — treating coverage as 0%.')
    console.warn('crap: run `npm run coverage` for accurate scores.\n')
  }

  rows.sort((a, b) => b.crap - a.crap)
  console.log(`crap: ${rows.length} function(s), threshold ${opts.threshold}`)
  console.log('  CRAP   COMP   COV%   FUNCTION')
  for (const r of rows) {
    const flag = r.crap > opts.threshold ? '!' : ' '
    console.log(
      `${flag} ${r.crap.toFixed(1).padStart(6)} ${String(r.comp).padStart(5)} ${(r.cov * 100).toFixed(0).padStart(5)}   ${r.file}:${r.line} ${r.fn}`
    )
  }

  const over = rows.filter((r) => r.crap > opts.threshold)
  if (over.length) {
    console.error(`\ncrap: ${over.length} function(s) exceed CRAP ${opts.threshold}.`)
    if (coverage || opts.strict) return 1
    console.error('crap: not failing (no coverage data); add tests then re-run with coverage.')
  }
  return 0
}

process.exit(main())
