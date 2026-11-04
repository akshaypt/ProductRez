// Responsive regression check (demo mode). Usage: npm run build && npx vite preview --port 4173 &  then  npm run e2e:responsive
let chromium
try { ({ chromium } = require('playwright')) } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')) }
const BASE = process.env.BASE_URL || 'http://localhost:4173'
const SIZES = [[320, 568], [360, 740], [390, 844], [768, 1024], [1280, 800]]
const ROUTES = ['/', '/methodology', '/privacy', '/terms', '/score', '/pricing']
let failed = false
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) failed = true }
;(async () => {
  const b = await chromium.launch()
  for (const [w, h] of SIZES) {
    const p = await (await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900, isMobile: w < 900 })).newPage()
    const errs = []; p.on('pageerror', (e) => errs.push(e.message))
    for (const r of ROUTES) {
      await p.goto(BASE + r, { waitUntil: 'networkidle' }); await p.waitForTimeout(400)
      const clipped = await p.evaluate(() => {
        const W = document.documentElement.clientWidth
        return [...document.querySelectorAll('main *, header *')].filter((e) => { const c = getComputedStyle(e); const r = e.getBoundingClientRect(); return c.position !== 'fixed' && c.display !== 'none' && r.width > 0 && r.right > W + 1 && !e.closest('[aria-hidden=true],.story-card,.aw-tabs,.car,.paper-wrap,.seg') }).length
      })
      ok(clipped === 0, `${w}px ${r}: nothing wider than the screen`)
    }
    if (w < 860) {
      await p.goto(BASE + '/', { waitUntil: 'networkidle' })
      await p.click('.rz-burger'); ok(await p.locator('.rz-sheet').isVisible(), `${w}px: mobile menu opens`)
      await p.click('.rz-sheet >> text=Pricing'); await p.waitForTimeout(300); ok((await p.locator('.rz-sheet').count()) === 0, `${w}px: menu closes after navigating`)
    }
    ok(errs.length === 0, `${w}px: no runtime errors`)
  }
  await b.close(); if (failed) process.exit(1)
})().catch((e) => { console.error('FAIL', e); process.exit(1) })
