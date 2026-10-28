// Usage: pnpm check:arch        (node scripts/check-architecture.mjs, run from the project root, no dependencies)
//
// Architecture checks that complement ESLint (eslint.boundaries.js):
//   1. every internal import resolves to a file
//   2. layer table: shared -> shared; core -> shared (layouts: features' public API, mocks: `import type` only);
//      features -> shared / core / other features through index.ts; nothing imports router.tsx / main.tsx (except main -> router)
//   3. mocks are used only by features/*/api/**
//   4. no import cycles: between files (runtime imports) and between features (any import)
//   5. Zustand stores live in core/store or features/<name>/store; VITE_* env variables are read only in core/config/env.ts
//   6. feature layout: api/ components/ hooks/ store/ types/ utils/ views/ routes.ts index.ts; routes.ts imports stay light
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const problems = []
const fail = (rule, message) => problems.push(`[${rule}] ${message}`)

/* ---------- source scan ---------- */
const walk = (dir) =>
  fs.existsSync(path.join(ROOT, dir))
    ? fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]))
    : []
const files = walk('src').sort()
const fileSet = new Set(files)
const isCode = (f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts')
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')

const ALIASES = [['@core/', 'src/core/'], ['@shared/', 'src/shared/'], ['@features/', 'src/features/'], ['@/', 'src/']]
const IMPORT_RE = /(?:\b(import|export)\b([^'"`;]*?)\bfrom\s*|\bimport\s*\(\s*|^[ \t]*import\s*)(['"])((?:(?!\3)[^\n\\])+)\3/gm
const extractImports = (text) => {
  const out = []
  for (const m of text.matchAll(IMPORT_RE)) {
    const lineStart = text.lastIndexOf('\n', m.index) + 1
    const prefix = text.slice(lineStart, m.index).trim()
    if (prefix.startsWith('//') || prefix.startsWith('*') || prefix.startsWith('/*')) continue
    out.push({ spec: m[4], typeOnly: /^\s*type\b/.test(m[2] ?? '') })
  }
  return out
}
const resolve = (from, spec) => {
  let base
  if (spec.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec))
  else {
    const hit = ALIASES.find(([p]) => spec.startsWith(p))
    if (!hit) return null // npm package
    base = hit[1] + spec.slice(hit[0].length)
  }
  for (const ext of ['', '.ts', '.tsx', '.js', '.css', '.json', '/index.ts', '/index.tsx']) if (fileSet.has(base + ext)) return base + ext
  return undefined
}
const areaOf = (f) => {
  const p = f.split('/')
  if (p[1] === 'features' && p[2]) return `feature:${p[2]}`
  return p.length === 2 ? 'root' : p[1]
}
const isIndex = (f) => /^src\/features\/[^/]+\/index\.ts$/.test(f)
const isRoutes = (f) => /^src\/features\/[^/]+\/routes\.ts$/.test(f)

const edges = []
for (const file of files.filter(isCode))
  for (const imp of extractImports(read(file))) {
    const target = resolve(file, imp.spec)
    if (target === null) continue
    if (target === undefined) { fail('resolve', `${file}: '${imp.spec}' does not resolve to a file`); continue }
    edges.push({ file, target, spec: imp.spec, typeOnly: imp.typeOnly })
  }

/* ---------- layer table ---------- */
for (const { file, target, spec, typeOnly } of edges) {
  const from = areaOf(file)
  const to = areaOf(target)
  const toFeature = to.startsWith('feature:')
  const isEntry = target === 'src/router.tsx' || target === 'src/main.tsx'

  if (isEntry && !(file === 'src/main.tsx' && target === 'src/router.tsx')) fail('layers', `${file}: only main.tsx may import the router, nobody imports an entry point ('${spec}')`)
  if (from === 'shared' && to !== 'shared') fail('layers', `${file}: shared may only import shared (found ${to}: '${spec}')`)
  if (from === 'core' && toFeature && !typeOnly && !file.startsWith('src/core/layouts/')) fail('layers', `${file}: core may not import features (only core/layouts, and 'import type' in core/mocks): '${spec}'`)
  if (from === 'core' && toFeature && typeOnly && !file.startsWith('src/core/mocks/') && !file.startsWith('src/core/layouts/')) fail('layers', `${file}: only core/mocks and core/layouts may reference features: '${spec}'`)
  if (from.startsWith('feature:') && to === 'core' && /^src\/core\/(layouts|providers)\//.test(target)) fail('layers', `${file}: features must not import the app shell or providers ('${spec}')`)
  if (toFeature && to !== from) {
    // other code may only use a feature through its index.ts (the router also reads routes.ts)
    const allowed = isIndex(target) || (file === 'src/router.tsx' && isRoutes(target))
    if (!allowed) fail('deep-import', `${file}: use '@features/${to.slice(8)}' (index.ts) instead of '${spec}'`)
  }
  if (target.startsWith('src/core/mocks/') && !(file.startsWith('src/core/mocks/') || /^src\/features\/[^/]+\/api\//.test(file) || /\.test\.[tj]sx?$/.test(file)))
    fail('mocks', `${file}: only features/*/api/** and test files may import mocks ('${spec}')`)
  if (from === 'core' && /^src\/core\/(api|query|mocks)\//.test(file) && target.startsWith('src/core/store/')) fail('layers', `${file}: ${file.split('/')[2]} must not read global stores`)
  if (/^src\/(shared\/utils|core\/api|core\/query)\//.test(file) && target.startsWith('src/shared/components/')) fail('layers', `${file}: low-level modules must not import components ('${spec}')`)
  if (from.startsWith('feature:') && to.startsWith('feature:') && to === from && spec.startsWith('@features/')) fail('layers', `${file}: use a relative import inside the feature ('${spec}')`)
}

/* ---------- cycles ---------- */
const sccs = (nodes, adj) => {
  let counter = 0
  const index = new Map(), low = new Map(), onStack = new Set(), stack = [], out = []
  const visit = (v) => {
    index.set(v, counter); low.set(v, counter); counter++
    stack.push(v); onStack.add(v)
    for (const w of adj.get(v) ?? []) {
      if (!index.has(w)) { visit(w); low.set(v, Math.min(low.get(v), low.get(w))) }
      else if (onStack.has(w)) low.set(v, Math.min(low.get(v), index.get(w)))
    }
    if (low.get(v) === index.get(v)) {
      const comp = []
      let w
      do { w = stack.pop(); onStack.delete(w); comp.push(w) } while (w !== v)
      if (comp.length > 1 || (adj.get(v) ?? new Set()).has(v)) out.push(comp.sort())
    }
  }
  for (const v of nodes) if (!index.has(v)) visit(v)
  return out
}
const graph = (pick) => {
  const adj = new Map()
  for (const e of edges) {
    const [a, b] = pick(e)
    if (!a || !b || a === b) continue
    if (!adj.has(a)) adj.set(a, new Set())
    adj.get(a).add(b)
  }
  return adj
}
const fileAdj = graph((e) => (e.typeOnly ? [] : [e.file, e.target]))
for (const comp of sccs(files, fileAdj)) fail('cycle', `import cycle between files: ${comp.join(' <-> ')}`)
const featureOf = (f) => (areaOf(f).startsWith('feature:') ? areaOf(f).slice(8) : null)
const featureAdj = graph((e) => [featureOf(e.file), featureOf(e.target)])
for (const comp of sccs([...featureAdj.keys()], featureAdj)) fail('cycle', `features depend on each other in a loop: ${comp.join(' <-> ')}`)

/* ---------- placement of Zustand and env ---------- */
for (const file of files.filter(isCode)) {
  const text = read(file)
  if (/from\s+['"]zustand(\/[^'"]*)?['"]/.test(text) && !(file.startsWith('src/core/store/') || /^src\/features\/[^/]+\/store\//.test(file)))
    fail('zustand', `${file}: Zustand stores belong in src/core/store (global) or src/features/<name>/store (feature state)`)
  if (file !== 'src/core/config/env.ts' && /import\.meta\.env\.VITE_/.test(text)) fail('env', `${file}: read VITE_* variables only in src/core/config/env.ts`)
}

/* ---------- feature layout ---------- */
const ALLOWED = new Set(['api', 'components', 'hooks', 'store', 'types', 'utils', 'views', 'routes.ts', 'index.ts'])
const isTest = (f) => /\.test\.[tj]sx?$/.test(f)
const features = [...new Set(files.filter((f) => f.startsWith('src/features/')).map((f) => f.split('/')[2]))]
for (const feature of features) {
  const own = files.filter((f) => f.startsWith(`src/features/${feature}/`))
  for (const entry of new Set(own.filter((f) => !isTest(f)).map((f) => f.split('/')[3]))) if (!ALLOWED.has(entry)) fail('layout', `features/${feature}/${entry}: not part of the feature layout (${[...ALLOWED].join(', ')})`)
  for (const f of own.filter((x) => x.includes('/types/') && isCode(x) && !isTest(x) && !x.endsWith('.types.ts'))) fail('layout', `${f}: files in types/ are named <name>.types.ts`)
  if (own.some((f) => f.includes('/views/')) && !fileSet.has(`src/features/${feature}/routes.ts`)) fail('layout', `features/${feature} has views/ but no routes.ts`)
}
for (const file of files.filter(isRoutes))
  for (const imp of extractImports(read(file)))
    if (!(imp.spec === 'react-router' || imp.spec.startsWith('.') || imp.spec.startsWith('@core/router/')))
      fail('layout', `${file}: routes.ts may only import react-router, @core/router/* and its own feature ('${imp.spec}')`)
if (fs.existsSync(path.join(ROOT, 'src/store'))) fail('zustand', 'src/store/ must not exist: use src/core/store')

/* ---------- report ---------- */
console.log(`checked ${files.length} files, ${edges.length} internal imports, ${features.length} features`)
if (problems.length) {
  console.error(`\n${problems.length} architecture problem(s):\n${problems.map((p) => `  ${p}`).join('\n')}`)
  process.exit(1)
}
console.log('architecture OK: no cycles, layer table respected')
