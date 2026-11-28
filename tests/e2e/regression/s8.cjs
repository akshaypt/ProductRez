const { chromium } = require('playwright')
const S = require('path').join(__dirname, 'fixtures') + '/'
const REAL = require('path').join(__dirname, 'fixtures', 'ak.txt')
let fails = 0
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }

async function toScore(b, w, h, mob, file) {
  const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: mob, colorScheme: 'dark', timezoneId: 'Asia/Kolkata', locale: 'en-IN' })
  const p = await c.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e)))
  await p.goto('http://localhost:4173/'); await p.waitForTimeout(900)
  await p.setInputFiles('input[type=file]', file); await p.waitForTimeout(2500)
  const chips = (await p.locator('.madlibs').innerText()).replace(/\s+/g, ' ')
  await p.getByRole('button', { name: /Review My Resume/ }).click()
  await p.waitForURL('**/report', { timeout: 25000 }); await p.waitForTimeout(500)
  await p.getByRole('button', { name: /^Sign In$/ }).first().click()
  await p.fill('input[type=email]', 'a@b.co')
  await p.getByRole('button', { name: /Continue|Send/ }).first().click(); await p.waitForTimeout(2500)
  await p.goto('http://localhost:4173/score'); await p.waitForSelector('.sd', { timeout: 15000 }); await p.waitForTimeout(1800)
  return { c, p, errs, chips }
}

;(async () => {
  const b = await chromium.launch()
  for (const [w, h, n, mob] of [[1440, 900, 'desktop', false], [390, 844, 'mobile', true], [360, 740, 'small', true]]) {
    const { c, p, errs, chips } = await toScore(b, w, h, mob, S + 'qa-long.txt')
    console.log(n, 'chips:', chips.slice(0, 120))
    ok(/APM/.test(chips) && !/Lead/.test(chips), n + ': the level chip is prefilled as APM for an 11-year QA resume')
    const txt = await p.locator('.sd').innerText()
    ok(/Not a PM resume yet/.test(txt), n + ': the score pill says "Not a PM resume yet"')
    ok(/engineering or QA resume, not yet as a product management resume/.test(txt), n + ': the headline says so in plain words')
    ok(/entry-level PM/i.test(await p.locator('.sd-notice').innerText()), n + ': the pay card explains this is entry-level PM pay')
    const cohort = (await p.locator('.sd-paycard .sd-sub').innerText()).trim()
    ok(/^APM/.test(cohort), n + ': pay cohort is "' + cohort + '"')
    const med = (await p.locator('.sd-pay-med b').innerText()).trim()
    console.log(n, 'median:', med, '| range:', (await p.locator('.sd-big').innerText()).replace(/\s+/g, ' '))

    // your screenshot's numbers
    const i = p.locator('.sd-field input')
    await i.nth(0).fill('35'); await i.nth(1).fill('40'); await p.waitForTimeout(1500)
    const v = (await p.locator('.sd-verdicts').innerText()).replace(/\s+/g, ' ')
    console.log(n, 'verdicts:', v)
    ok(!/Underpaid/.test(v) && !/Inflated/.test(v), n + ': neither card uses "Underpaid" or "Inflated" for a non-PM job')
    ok(/entry-level PM pay/.test(v), n + ': current pay is compared with entry-level PM pay')
    const boxes = await p.locator('.sd-flag-chip').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, t: e.innerText.replace(/\s+/g, ' ') } }))
    console.log(n, 'flag pills:', JSON.stringify(boxes.map((r) => r.t)))
    ok(boxes.length === 1 && /35L/.test(boxes[0].t) && /40L/.test(boxes[0].t), n + ': two close pins share ONE pill with both amounts, not two stacked boxes')
    ok(boxes.every((r) => r.h <= 40), n + ': the pill is compact (' + boxes.map((r) => Math.round(r.h) + 'px').join(', ') + ' high)')
    ok(boxes.every((r) => r.x >= 0 && r.x + r.w <= w), n + ': the pill stays on screen')
    const flagsH = await p.locator('.sd-pay-flags').evaluate((e) => e.getBoundingClientRect().height)
    ok(flagsH <= 50, n + ': the flag area is compact (' + Math.round(flagsH) + 'px, was 116px)')
    const fitBox = await p.locator('.sd-pay-fit span').boundingBox()
    ok(fitBox && fitBox.x >= 0 && fitBox.x + fitBox.width <= w, n + ': the "Fits your resume" label is not cut off (' + (fitBox ? Math.round(fitBox.x) + ' to ' + Math.round(fitBox.x + fitBox.width) + ' of ' + w : 'missing') + ')')
    ok(/Above entry-level PM pay|Realistic for entry-level PM|Top of the entry-level range|Room to ask for more/.test(v), n + ': the ask verdict uses plain words for a non-PM resume')
    await p.locator('.sd-pay').screenshot({ path: S + `s8-${n}-pins.png` })
    await p.locator('.sd-paycard').screenshot({ path: S + `s8-${n}-paycard.png` })

    // explore a higher level
    await p.getByRole('button', { name: 'Senior', exact: true }).click(); await p.waitForTimeout(1200)
    ok(/^Senior PM/.test((await p.locator('.sd-paycard .sd-sub').innerText()).trim()), n + ': the level switcher changes the band to Senior PM')
    ok(/Senior PM/.test(await p.locator('.sd-notice').innerText()), n + ': the notice says you are exploring Senior PM pay')
    ok(await p.locator('.sd-dot').count() === 2, n + ': both dots are still drawn at the new level')
    await p.locator('.sd-pay').screenshot({ path: S + `s8-${n}-senior.png` })
    const x = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    ok(x <= 0, n + ': no sideways scroll')
    ok(errs.length === 0, n + ': no page errors ' + (errs[0] || ''))
    await c.close()
  }

  // a real PM resume must be untouched
  {
    const { c, p, errs } = await toScore(b, 1440, 900, false, REAL)
    const txt = await p.locator('.sd').innerText()
    ok(!/Not a PM resume yet/.test(txt) && await p.locator('.sd-notice').count() === 0, 'PM resume: no "not a PM resume" pill or notice')
    ok(/^Senior PM/.test((await p.locator('.sd-paycard .sd-sub').innerText()).trim()), 'PM resume: still priced as ' + (await p.locator('.sd-paycard .sd-sub').innerText()).trim())
    ok(/\b93\b/.test(txt), 'PM resume: score unchanged (93)')
    ok(errs.length === 0, 'PM resume: no page errors')
    await c.close()
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS')
  await b.close()
})()
