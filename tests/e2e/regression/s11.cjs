const { chromium } = require('playwright')
const S = require('path').join(__dirname, 'fixtures') + '/'
const REAL = require('path').join(__dirname, 'fixtures', 'ak.txt')
let fails = 0
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
const pills = async (p) => (await p.locator('.madlibs').innerText()).replace(/\s+/g, ' ')
const chip = async (p, mob, text, opt) => {
  await p.locator('.pick-btn', { hasText: text }).first().click()
  await p.locator(mob ? '.sheet-opt' : '.pick-opt', { hasText: opt }).first().click()
}
;(async () => {
  const b = await chromium.launch()
  for (const [w, h, n, mob] of [[1440, 900, 'desktop', false], [390, 844, 'mobile', true]]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: mob, colorScheme: 'dark', timezoneId: 'Asia/Kolkata', locale: 'en-IN' })
    const p = await c.newPage(); const errs = []
    p.on('pageerror', (e) => errs.push(String(e)))
    await p.goto('http://localhost:4173/'); await p.waitForTimeout(900)
    const up = async (f) => { await p.setInputFiles('input[type=file]', f); await p.waitForTimeout(2600) }

    // 1. an AI PM at AI product companies
    await up(S + 'r-ai.txt')
    let t = await pills(p); console.log(n, 'AI PM   :', t.replace(/Pre-filled.*?adjust:/, '').slice(0, 150))
    ok(/Senior PM/.test(t) && /AI \/ ML/.test(t), n + ': AI PM -> Senior PM, AI / ML focus (the old method said Core / Generalist)')
    ok(/Scale-ups/.test(t), n + ': AI PM -> Scale-ups, read from funding-stage words')
    await p.locator('.why-picks summary').click(); await p.waitForTimeout(200)
    let why = (await p.locator('.why-picks').innerText()).replace(/\s+/g, ' ')
    console.log(n, 'why      :', why)
    ok(/Most of your work is in AI and machine learning/.test(why) && /growth-stage funding/.test(why), n + ': the reasons say what each pick was read from')

    // 2. a payments PM at known companies
    await up(S + 'r-fin.txt')
    t = await pills(p); console.log(n, 'payments:', t.replace(/Pre-filled.*?adjust:/, '').slice(0, 150))
    ok(/Fintech/.test(t) && /Scale-ups/.test(t), n + ': second upload re-fills: payments PM -> Fintech, Scale-ups (Razorpay, Paytm)')
    ok(!/AI \/ ML/.test(t), n + ': the first resume\'s picks did not stick (the old bug)')

    // 3. a QA engineer at a large IT services company
    await up(S + 'qa-long.txt')
    t = await pills(p); console.log(n, 'QA      :', t.replace(/Pre-filled.*?adjust:/, '').slice(0, 150))
    ok(/APM/.test(t) && /Enterprise/.test(t), n + ': QA at Infosys -> APM level, Enterprise company type')

    // 4. a pick the person changed by hand is kept on the next upload
    await chip(p, mob, 'Enterprise', 'Big Tech'); await p.waitForTimeout(200)
    t = await pills(p); ok(/Big Tech/.test(t), n + ': the person can change a pick')
    ok(!/Enterprise|Infosys/.test((await p.locator('.why-picks').innerText().catch(() => '')) || ''), n + ': the explanation for a changed pick is dropped, since it no longer matches')
    await up(S + 'r-fin.txt')
    t = await pills(p)
    ok(/Big Tech/.test(t) && /Fintech/.test(t) && /Senior PM/.test(t), n + ': a pick changed by hand is kept (Big Tech) while the others re-fill')

    // 5. a mixed-domain PM: honest about it (fresh page, nothing changed by hand)
    await p.goto('http://localhost:4173/'); await p.waitForTimeout(900)
    await up(REAL)
    t = await pills(p); console.log(n, 'mixed   :', t.replace(/Pre-filled.*?adjust:/, '').slice(0, 150))
    await p.evaluate(() => { const d = document.querySelector('.why-picks'); if (d) d.open = true }); await p.waitForTimeout(200)
    why = (await p.locator('.why-picks').innerText().catch(() => '')).replace(/\s+/g, ' ')
    console.log(n, 'why      :', why)
    ok(/Your work spans/.test(why) && /no single focus stands out/.test(why), n + ': a mixed-domain PM is told their work spans several domains, not forced into one')
    ok(/does not say what kind of companies|Read from your resume/.test(why), n + ': company type says whether it was read or guessed')

    const x = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    ok(x <= 0, n + ': no sideways scroll'); ok(errs.length === 0, n + ': no page errors ' + (errs[0] || ''))
    await p.locator('.madlibs').screenshot({ path: S + `s11-${n}.png` })
    await c.close()
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS'); await b.close()
})()
