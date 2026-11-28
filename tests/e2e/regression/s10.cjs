const { chromium } = require('playwright')
const S = require('path').join(__dirname, 'fixtures') + '/'
const REAL = require('path').join(__dirname, 'fixtures', 'ak.txt')
let fails = 0
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
async function toScore(b, w, h, mob, file) {
  const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: mob, colorScheme: 'dark', timezoneId: 'Asia/Kolkata', locale: 'en-IN' })
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)))
  await p.goto('http://localhost:4173/'); await p.waitForTimeout(900)
  await p.setInputFiles('input[type=file]', file); await p.waitForTimeout(2500)
  await p.getByRole('button', { name: /Review My Resume/ }).click(); await p.waitForURL('**/report', { timeout: 25000 }); await p.waitForTimeout(500)
  await p.getByRole('button', { name: /^Sign In$/ }).first().click(); await p.fill('input[type=email]', 'a@b.co')
  await p.getByRole('button', { name: /Continue|Send/ }).first().click(); await p.waitForTimeout(2500)
  await p.goto('http://localhost:4173/score'); await p.waitForSelector('.sd', { timeout: 15000 }); await p.waitForTimeout(1800)
  return { c, p, errs }
}
async function state(p, cur, exp, name, w) {
  const i = p.locator('.sd-field input')
  await i.nth(0).fill(cur); await i.nth(1).fill(exp); await p.waitForTimeout(1300)
  const chips = await p.locator('.sd-flag-chip').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, t: e.innerText.replace(/\s+/g, ' ') } }))
  let overlap = false
  for (let a = 0; a < chips.length; a++) for (let b = a + 1; b < chips.length; b++) { const A = chips[a], B = chips[b]; if (A.x < B.x + B.w && A.x + A.w > B.x && A.y < B.y + B.h && A.y + A.h > B.y) overlap = true }
  console.log(name, '->', JSON.stringify(chips.map((c) => c.t)))
  ok(!overlap, name + ': nothing overlaps')
  ok(chips.every((c) => c.x >= 0 && c.x + c.w <= w && c.h <= 40), name + ': pills compact and on screen')
  await p.locator('.sd-pay').screenshot({ path: S + `s10-${name.replace(/[^a-z0-9]+/gi, '-')}.png` })
  return chips
}
;(async () => {
  const b = await chromium.launch()
  for (const [w, h, n, mob] of [[1440, 900, 'desktop', false], [390, 844, 'mobile', true]]) {
    // your case: a QA resume, ₹35L now and ₹40L wanted, both above the entry-level band
    const { c, p, errs } = await toScore(b, w, h, mob, S + 'qa-long.txt')
    let ch = await state(p, '35', '40', `${n} both above the band`, w)
    ok(ch.length === 1 && /35L/.test(ch[0].t) && /40L/.test(ch[0].t) && /→/.test(ch[0].t), n + ': ONE pill, "₹35L → ₹40L"')
    ok(await p.locator('.sd-dot').count() === 2, n + ': both dots are drawn')
    const dots = await p.locator('.sd-dot').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().x))
    ok(Math.abs(dots[0] - dots[1]) >= 8, n + ': the two dots are nudged apart so both can be seen (' + Math.round(Math.abs(dots[0] - dots[1])) + 'px)')
    // one value only
    ch = await state(p, '14', '', `${n} one pin`, w)
    ok(ch.length === 1 && /You now/.test(ch[0].t), n + ': a single pin keeps its "You now" label')
    // inside the band and far apart: separate pills with labels
    await p.getByRole('button', { name: 'Lead', exact: true }).click(); await p.waitForTimeout(900)
    ch = await state(p, '45', '110', `${n} far apart`, w)
    ok(ch.length === 2 && /You now/.test(ch[0].t) && /You want/.test(ch[1].t), n + ': pins far apart get their own labelled pills')
    // close together, inside the band
    ch = await state(p, '66', '72', `${n} close in band`, w)
    ok(ch.length === 1 && /→/.test(ch[0].t), n + ': close pins in the band share one pill')
    const x = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    ok(x <= 0, n + ': no sideways scroll'); ok(errs.length === 0, n + ': no page errors ' + (errs[0] || ''))
    await c.close()
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS'); await b.close()
})()
