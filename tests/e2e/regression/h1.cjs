const {chromium}=require('playwright')
const PDF='/root/.claude/uploads/bc76b783-19f0-5191-a846-daea681793a0/3cb5f1c6-Akshay_Pramod_Teli_Resume.pdf'
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++}
;(async()=>{const b=await chromium.launch()
for(const [w,h,n,mob] of [[1280,800,'desk',false],[390,844,'mob',true]]){
// A: scored first, then sign in
let c=await b.newContext({viewport:{width:w,height:h},hasTouch:mob});let p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)))
await p.goto('http://localhost:4173/');await p.waitForTimeout(1200)
await p.setInputFiles('input[type=file]',PDF);await p.waitForTimeout(2500)
await p.getByRole('button',{name:/Review My Resume/}).click();await p.waitForURL('**/report',{timeout:25000});await p.waitForTimeout(600)
await p.getByRole('button',{name:/^Sign In$/}).first().click();await p.waitForTimeout(400)
await p.fill('input[type=email]','a@b.co');await p.getByRole('button',{name:/Continue/}).first().click();await p.waitForTimeout(1500)
await p.getByRole('button',{name:/Continue to ProductRez/}).click();await p.waitForURL('**/score',{timeout:25000});await p.waitForTimeout(1200)
ok(await p.locator('[aria-label="Personalise ProductRez"]').count()===0,n+': scored first, then signed in: no onboarding modal')
const prefs=await p.evaluate(()=>JSON.parse(localStorage.getItem('pr.prefs')||'null'));ok(prefs&&prefs.onboarded===true&&prefs.stage==='senior',n+': setup completed from the resume (stage '+(prefs&&prefs.stage)+', region '+(prefs&&prefs.region)+')')
const imp=await p.evaluate(()=>JSON.parse(localStorage.getItem('pr.writer.import')||'null'));ok(imp&&imp.basics&&/Akshay/.test(imp.basics.name||''),n+': resume handed to the Writer ('+(imp&&imp.basics&&imp.basics.name)+')')
ok(await p.evaluate(()=>localStorage.getItem('pr.handoff'))==='null','' +n+': hand-off deleted after use')
ok(errs.length===0,n+': no errors '+JSON.stringify(errs.slice(0,2)));await c.close()
// B: sign in without any resume: onboarding still shows
c=await b.newContext({viewport:{width:w,height:h},hasTouch:mob});p=await c.newPage()
await p.goto('http://localhost:4173/');await p.waitForTimeout(1000)
await p.getByRole('button',{name:/^Sign In$/}).first().click();await p.fill('input[type=email]','c@d.co');await p.getByRole('button',{name:/Continue/}).first().click();await p.waitForURL('**/score',{timeout:25000});await p.waitForTimeout(1200)
ok(await p.locator('[aria-label="Personalise ProductRez"]').count()===1,n+': signing in with no resume still shows onboarding');await c.close()}
await b.close();console.log(fails?fails+' FAILED':'ALL PASSED')})()
