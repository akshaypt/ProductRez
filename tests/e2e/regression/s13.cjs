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
const txt = async (p, sel) => (await p.locator(sel).first().innerText()).replace(/\s+/g, ' ')
;(async () => {
  const b = await chromium.launch()
  for (const [w, h, n, mob] of [[1440, 900, 'desktop', false], [390, 844, 'mobile', true]]) {
    const { c, p, errs } = await toScore(b, w, h, mob, S + 'qa-long.txt')
    // the line the user asked to remove
    ok(!/Only you can see it/.test(await p.locator('.sd-save').innerText()), n + ': the "Saved to your account. Only you can see it..." line is gone')
    // your level
    ok(/Pay range for a resume like yours/.test(await txt(p, '.sd-pay-top')), n + ': at your level the label says "Pay range for a resume like yours"')
    ok(await p.locator('.sd-pay-fit').count() === 1, n + ': at your level the green "Fits your resume" bar is shown')
    ok(await p.locator('.sd-you').count() === 1 && /you/i.test(await p.locator('.sd-lvl button[aria-pressed=true] .sd-you').innerText()), n + ': your level is marked "you" on the tabs')
    ok(/Compare pay by level/.test(await txt(p, '.sd-lvl-row')), n + ': the tabs say what they are for ("Compare pay by level")')
    const own = await txt(p, '.sd-pay-top'); console.log(n, 'own level :', own)
    // exploring
    await p.getByRole('button', { name: /^Senior/ }).click(); await p.waitForTimeout(1100)
    const top = await txt(p, '.sd-pay-top'); console.log(n, 'Senior    :', top)
    ok(/Typical Senior PM pay/.test(top), n + ': a higher level says "Typical Senior PM pay", not that your resume supports it')
    ok(!/resume like yours/.test(top), n + ': the "resume like yours" claim is not made for a level you are only exploring')
    ok(await p.locator('.sd-pay-fit').count() === 0, n + ': no "Fits your resume" bar when exploring')
    const note = await txt(p, '.sd-notice'); console.log(n, 'notice    :', note)
    ok(/not a range your resume supports today/.test(note) && /5 to 8 years/.test(note) && /none yet/.test(note), n + ': the notice says what the level usually asks for and what the resume shows')
    // back to own level
    await p.getByRole('button', { name: /^APM/ }).click(); await p.waitForTimeout(900)
    ok(await p.locator('.sd-pay-fit').count() === 1 && /Pay range for a resume like yours/.test(await txt(p, '.sd-pay-top')), n + ': switching back restores the claim and the bar')
    // saving still confirms
    const i = p.locator('.sd-field input'); await i.nth(0).fill('20'); await p.waitForTimeout(3200)
    ok(/Saved to your account/.test(await p.locator('.sd-save').innerText()), n + ': after typing, "Saved to your account" still confirms the save')
    const x = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    ok(x <= 0, n + ': no sideways scroll'); ok(errs.length === 0, n + ': no page errors ' + (errs[0] || ''))
    await p.getByRole('button', { name: /^Senior/ }).click(); await p.waitForTimeout(900)
    await p.locator('.sd-paycard').screenshot({ path: S + `s13-${n}-senior.png` })
    await c.close()
  }
  // a PM resume: its own level is the default, a lower level is "looking ahead"-free but still not a claim
  { const { c, p, errs } = await toScore(b, 1440, 900, false, REAL)
    const top = await txt(p, '.sd-pay-top'); console.log('PM own   :', top)
    ok(/Pay range for a resume like yours/.test(top) && await p.locator('.sd-pay-fit').count() === 1, 'PM resume: own level keeps the claim and the bar')
    await p.getByRole('button', { name: /^Lead/ }).click(); await p.waitForTimeout(1000)
    const lead = await txt(p, '.sd-notice'); console.log('PM Lead  :', lead)
    ok(/Typical Lead \/ Group PM pay/.test(await txt(p, '.sd-pay-top')) && /8 or more years/.test(lead) && /about 7\.\d/.test(lead), 'PM resume: exploring Lead shows what Lead asks for (8+ years) against their ' + (lead.match(/about [\d.]+/) || ['?'])[0])
    ok(errs.length === 0, 'PM resume: no page errors'); await c.close() }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS'); await b.close()
})()
