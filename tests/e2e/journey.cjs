// End-to-end journey in demo mode (no backend). Usage:
//   npm run build && npx vite preview --port 4173 &   then   npm run e2e
// Requires Playwright (`npm i -D playwright`) and, for the PDF upload step, `npm test` run once (it compiles tests/out/*.pdf).
let chromium
try { ({ chromium } = require('playwright')) } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')) }
const fs = require('fs')
const BASE = process.env.BASE_URL || 'http://localhost:4173'
let failed = false
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) failed = true }

;(async () => {
  const b = await chromium.launch()
  const p = await (await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true })).newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))

  // landing: live bullet X-ray works without an account
  await p.goto(BASE + '/')
  await p.fill('[data-testid=xray] textarea', 'Launched pricing for 12,000 accounts, cutting churn from 5.1% to 3.8% in two quarters')
  ok((await p.textContent('[data-testid=xray] p[aria-live]')).includes('Impact 3/3'), 'landing X-ray rates a strong bullet 3/3')

  // sign up, onboard, score
  await p.goto(BASE + '/score')
  await p.click('text=Sign in free')
  await p.fill('#em', 'e2e@example.com')
  await p.click('text=Continue')
  await p.click('text=Start')
  const pdf = 'tests/out/launchpad-strong.pdf'
  if (fs.existsSync(pdf)) {
    await p.setInputFiles('[data-testid=file-input]', pdf)
  } else {
    await p.click('text=Paste text')
    await p.fill('textarea[aria-label="Resume text"]', fs.readFileSync('tests/fixtures/strong.txt', 'utf8'))
  }
  await p.click('text=Review my resume')
  await p.waitForSelector('[data-testid=report]', { timeout: 20000 })
  ok(/Overall score \d+/.test(await p.getAttribute('.gauge', 'aria-label')), 'free score produced a report')

  // free quota + paywalls
  await p.reload()
  await p.waitForSelector('[data-testid=report]')
  ok(await p.isVisible('text=That was your free score'), 'free score is saved and flagged as used')
  for (const path of ['writer', 'jobs', 'learn']) {
    await p.goto(`${BASE}/${path}`)
    await p.waitForSelector('[data-testid=paywall]')
    ok(true, `/${path} is paywalled`)
  }

  // buy → unlock → writer → export
  await p.goto(BASE + '/pricing')
  await p.click('[data-testid=buy-lifetime]')
  await p.waitForURL('**/writer', { timeout: 8000 })
  await p.click('text=Load sample')
  await p.waitForSelector('[data-testid=resume-paper]')
  await p.click('[data-testid=export-btn]')
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-testid=dl-tex]')])
  const tex = fs.readFileSync(await dl.path(), 'utf8')
  ok(tex.includes('\\documentclass') && tex.includes('\\pdfgentounicode=1'), 'exports ATS-safe LaTeX')

  // jobs: only fresh listings, saved to pipeline
  await p.goto(BASE + '/jobs')
  await p.waitForSelector('.job')
  const stale = await p.locator('.job .chip').filter({ hasText: /^\s*\d{4}-\d{2}-\d{2}\s*$/ }).count()
  ok(stale === 0, 'no job older than yesterday is shown')
  await p.click('.job >> nth=0 >> text=Save')
  await p.click('text=/My pipeline/')
  ok((await p.locator('.mini-job').count()) === 1, 'job saved to pipeline')

  // learn
  await p.goto(BASE + '/learn')
  await p.waitForSelector('.res')
  await p.click('.path >> nth=0')
  await p.click('.res >> nth=0 >> text=Mark done')
  ok(await p.isVisible('.res.done'), 'resource marked done')

  ok(errs.length === 0, 'no runtime errors' + (errs.length ? `: ${errs.join('; ')}` : ''))
  await b.close()
  if (failed) process.exit(1)
})().catch((e) => { console.error('FAIL', e); process.exit(1) })
