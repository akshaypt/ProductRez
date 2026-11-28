const {chromium}=require('playwright')
const PDF='/root/.claude/uploads/bc76b783-19f0-5191-a846-daea681793a0/3cb5f1c6-Akshay_Pramod_Teli_Resume.pdf'
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++}
;(async()=>{const b=await chromium.launch()
for(const [w,h,n,mob] of [[1440,900,'d',false],[390,844,'m',true]]){
const c=await b.newContext({viewport:{width:w,height:h},hasTouch:mob,colorScheme:'light'});const p=await c.newPage();const errs=[]
p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>m.type()==='error'&&errs.push(m.text().slice(0,140)))
const shot=async s=>p.screenshot({path:`g4-${n}-${s}.png`})
await p.goto('http://localhost:4173/');await p.waitForTimeout(1200);await shot('1-landing')
ok(await p.locator('h1:has-text("Stop Getting Ghosted")').count()===1,n+': landing renders')
await p.getByRole('button',{name:/Review My Resume/}).click();await p.waitForTimeout(400)
ok(await p.locator('.g-toast.g-show').count()===1,n+': review without a file shows the toast')
await p.setInputFiles('input[type=file]',PDF);await p.waitForTimeout(2500);await shot('2-loaded')
ok((await p.locator('.drop-stage').innerText()).includes('Teli_Resume.pdf loaded'),n+': file loads for real')
const pills=await p.locator('.pick-btn:not(.empty)').count();ok(pills===4,n+': pills pre-filled from the resume ('+pills+')')
console.log(n,'pills:',await p.locator('.madlibs').innerText().then(t=>t.replace(/\s+/g,' ')))
await p.getByRole('button',{name:/Review My Resume/}).click();await p.waitForTimeout(1200);await shot('3-scan')
ok(await p.locator('.scan-overlay.g-open').count()===1,n+': analysis overlay shows')
await p.waitForURL('**/report',{timeout:25000});await p.waitForTimeout(800);await shot('4-report-locked')
const score=await p.locator('.gauge-num, .gauge-center .gauge-num').first().innerText();console.log(n,'score',score)
ok(+score>=60&&+score<=100,n+': real score shown ('+score+')')
ok(await p.locator('.g-lock-card').count()===1,n+': rest of report is gated')
await p.getByRole('button',{name:/^Sign In$/}).first().click();await p.waitForTimeout(500);await shot('5-auth')
await p.fill('input[type=email]','a@b.co');await p.getByRole('button',{name:/Continue|Send/}).first().click();await p.waitForTimeout(1500);await shot('6-unlocked')
ok(await p.locator('.g-lock-card').count()===0&&await p.locator('text=Fix backlog').count()>0,n+': signing in unlocks the real report')
const over=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);ok(over<=0,n+': no horizontal overflow ('+over+')')
ok(errs.length===0,n+': no errors '+JSON.stringify(errs.slice(0,3)))
await c.close()}
await b.close();console.log(fails?fails+' FAILED':'ALL PASSED')})()
