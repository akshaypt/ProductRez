const {chromium}=require('playwright')
const PDF='/root/.claude/uploads/bc76b783-19f0-5191-a846-daea681793a0/3cb5f1c6-Akshay_Pramod_Teli_Resume.pdf'
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++}
;(async()=>{const b=await chromium.launch()
for(const [w,h,n,mob] of [[1280,800,'desk',false],[390,844,'mob',true]]){
const c=await b.newContext({viewport:{width:w,height:h},hasTouch:mob});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)))
await p.goto('http://localhost:4173/');await p.waitForTimeout(1200)
await p.setInputFiles('input[type=file]',PDF);await p.waitForTimeout(2500)
await p.getByRole('button',{name:/Review My Resume/}).click();await p.waitForURL('**/report',{timeout:25000});await p.waitForTimeout(600)
await p.getByRole('button',{name:/^Sign In$/}).first().click();await p.waitForTimeout(400)
ok(await p.locator('text=will be saved to your account').count()===1,n+': sign-in dialog says the check will be saved')
await p.fill('input[type=email]','a@b.co');await p.getByRole('button',{name:/Continue/}).first().click();await p.waitForTimeout(2000)
const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('pr.demo.latestScan')||'null'))
ok(saved&&saved.report&&saved.report.overall===93&&/Teli/.test(saved.fileName),n+': latest scan saved to the account ('+(saved&&saved.fileName)+', '+(saved&&saved.report&&saved.report.overall)+')')
// refresh on /report: a signed-in user gets the saved check back
await p.reload();await p.waitForTimeout(2500)
ok(p.url().includes('/report')&&await p.locator('.gauge-num').count()>0,n+': refreshing the report page restores it from the account')
// Score page opens straight onto the saved result
await p.goto('http://localhost:4173/score');await p.waitForTimeout(2200)
ok(await p.locator('[data-testid=report]').count()===1,n+': Score page opens on the saved result')
// a second upload replaces the first
await p.goto('http://localhost:4173/');await p.waitForTimeout(1500)
await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('pr.demo.latestScan'));s.fileName='older.pdf';localStorage.setItem('pr.demo.latestScan',JSON.stringify(s))})
await p.setInputFiles('input[type=file]',PDF);await p.waitForTimeout(2500);await p.getByRole('button',{name:/Review My Resume/}).click();await p.waitForURL('**/report',{timeout:25000});await p.waitForTimeout(500)
ok(errs.length===0,n+': no errors '+JSON.stringify(errs.slice(0,2)));await c.close()}
await b.close();console.log(fails?fails+' FAILED':'ALL PASSED')})()
