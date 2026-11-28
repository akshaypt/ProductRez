const { chromium } = require('playwright')
const S = require('path').join(__dirname, 'fixtures') + '/'
let fails = 0
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
;(async () => {
  const b = await chromium.launch()
  for (const [w, h, n] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: n === 'mobile', colorScheme: 'dark', timezoneId: 'Asia/Kolkata', locale: 'en-IN' })
    const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)))
    // sign in, skip onboarding, go to the upload screen with no saved scan
    await p.goto('http://localhost:4173/pricing'); await p.waitForTimeout(1000)
    await p.getByRole('button', { name: /Sign in/i }).first().click().catch(() => {}); await p.waitForTimeout(300)
    if (await p.locator('input[type=email]').count()) { await p.fill('input[type=email]', 'qa@test.dev'); await p.getByRole('button', { name: /Continue/ }).first().click(); await p.waitForTimeout(1000) }
    if (await p.getByRole('button', { name: /^Start$/ }).count()) await p.getByRole('button', { name: /^Start$/ }).click()
    await p.goto('http://localhost:4173/score'); await p.waitForTimeout(1500)
    const up = async (f) => { await p.setInputFiles('input[data-testid=file-input]', f); await p.waitForTimeout(2600) }
    const vals = async () => p.locator('main select').evaluateAll((els) => els.map((e) => e.options[e.selectedIndex]?.text))
    await up(S + 'r-ai.txt')
    let v = await vals(); console.log(n, 'AI PM  :', JSON.stringify(v))
    ok(/Senior/.test(v[0]) && /AI/.test(v[1]) && /Scale/.test(v[2]), n + ': signed-in upload pre-fills level, focus and company type from an AI PM resume')
    ok(await p.locator('.why-picks').count() === 1, n + ': "Why these picks?" is shown')
    await up(S + 'qa-long.txt')
    v = await vals(); console.log(n, 'QA     :', JSON.stringify(v))
    ok(/APM/.test(v[0]) && /Enterprise/.test(v[2]), n + ': a second upload re-fills (QA at Infosys -> APM, Enterprise)')
    await p.evaluate(() => { const d = document.querySelector('.why-picks'); if (d) d.open = true }); await p.waitForTimeout(200)
    ok(/Infosys/.test(await p.locator('.why-picks').innerText()), n + ': the explanation names the employer it read')
    const x = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    ok(x <= 0, n + ': no sideways scroll'); ok(errs.length === 0, n + ': no page errors ' + (errs[0] || ''))
    await p.screenshot({ path: S + `s12-${n}.png` })
    await c.close()
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS'); await b.close()
})()
