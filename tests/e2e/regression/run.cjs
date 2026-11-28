// Runs every browser regression suite against a built app and prints one summary.
// Usage: npm run build && npx vite preview --port 4173 &   then   node tests/e2e/regression/run.cjs
const { spawnSync } = require('child_process')
const path = require('path')
const suites = ['g4', 'h1', 'h2', 'a5', 'a6', 'a7', 'j1', 'k6', 's3', 's8', 's10', 's11', 's12', 's13']
const failed = []
for (const s of suites) {
  const r = spawnSync('node', [path.join(__dirname, s + '.cjs')], { encoding: 'utf8', timeout: 300000 })
  const out = (r.stdout || '') + (r.stderr || '')
  const pass = /ALL PASS/.test(out) && r.status === 0
  console.log((pass ? 'PASS ' : 'FAIL ') + s)
  if (!pass) { failed.push(s); console.log(out.split('\n').filter((l) => /FAIL|Error/.test(l)).slice(0, 8).join('\n')) }
}
console.log(failed.length ? `\n${failed.length} suite(s) failed: ${failed.join(', ')}` : '\nALL SUITES PASS')
process.exit(failed.length ? 1 : 0)
