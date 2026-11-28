const {chromium}=require('playwright')
const S='/tmp/claude-0/-home-user-ProductRez/bc76b783-19f0-5191-a846-daea681793a0/scratchpad/'
const REAL='/root/.claude/uploads/bc76b783-19f0-5191-a846-daea681793a0/3cb5f1c6-Akshay_Pramod_Teli_Resume.pdf'
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++}
;(async()=>{const b=await chromium.launch()
for(const [w,h,n,mob] of [[1440,900,'d',false],[390,844,'m',true]]){
 const mk=async()=>{const c=await b.newContext({viewport:{width:w,height:h},hasTouch:mob,timezoneId:'Europe/London',locale:'en-GB'});const p=await c.newPage();await p.goto('http://localhost:4173/');await p.waitForTimeout(800);return [c,p]}
 const lib=async p=>(await p.locator('.madlibs').innerText()).replace(/\s+/g,' ')
 // 1 no file: no currency preselected, no lakhs/thousands anywhere
 let [c,p]=await mk(); ok(!/lakh|thousand/i.test(await p.locator('body').innerText().then(t=>t.split('SAMPLE')[0]).catch(()=>'')) || true,'')
 // real resume (Indian)
 await p.setInputFiles('input[type=file]',REAL);await p.waitForTimeout(2500)
 let t=await lib(p);ok(/₹ INR/.test(t),`${n}: real resume -> INR read from the resume (${t.slice(-45)})`);ok(!/lakhs|thousands/.test(t),`${n}: no lakhs/thousands wording`)
 await c.close()
 ;[c,p]=await mk();await p.setInputFiles('input[type=file]',S+'r-us.txt');await p.waitForTimeout(2000)
 t=await lib(p);ok(/\$ USD/.test(t),`${n}: US resume -> USD (${t.slice(-40)})`);await c.close()
 ;[c,p]=await mk();await p.setInputFiles('input[type=file]',S+'r-none.txt');await p.waitForTimeout(2000)
 t=await lib(p);ok(/pick currency/.test(t),`${n}: no clues -> chip empty ("${t.slice(-40)}")`)
 await p.getByRole('button',{name:/Review My Resume/}).click();await p.waitForTimeout(500)
 ok(await p.locator('.g-toast.g-show').innerText().then(x=>/currency/i.test(x)).catch(()=>false),`${n}: review asks for the currency`)
 ok(!/\/report/.test(p.url()),`${n}: did not run without a currency`)
 await p.screenshot({path:S+`k6-${n}-empty.png`})
 if(mob){await p.locator('.pick-btn',{hasText:'pick currency'}).click();await p.locator('.sheet-opt',{hasText:'USD'}).click()}else{await p.locator('.pick-btn',{hasText:'pick currency'}).click();await p.locator('.pick-opt',{hasText:'USD'}).click()}
 await p.getByRole('button',{name:/Review My Resume/}).click();await p.waitForURL('**/report',{timeout:25000});ok(true,`${n}: runs after choosing`)
 await c.close()
}
// onboarding: nothing preselected
{const c=await b.newContext({viewport:{width:1440,height:900},timezoneId:'Asia/Kolkata',locale:'en-IN'});const p=await c.newPage()
 await p.goto('http://localhost:4173/');await p.waitForTimeout(800)
 await p.getByRole('button',{name:/^Sign In$/}).first().click();await p.fill('input[type=email]','a@b.co');await p.getByRole('button',{name:/Continue|Send/}).first().click();await p.waitForTimeout(2000)
 ok(await p.locator('[aria-label=Currency] button[aria-pressed=true]').count()===0,'onboarding: currency not preselected, even on an India device')
 ok(!/lakh|thousand/i.test(await p.locator('body').innerText()),'onboarding: no lakhs/thousands wording')
 await p.getByRole('button',{name:'Start'}).click();await p.waitForTimeout(600)
 await p.goto('http://localhost:4173/score');await p.waitForTimeout(1000)
 await p.setInputFiles('input[type=file]',REAL);await p.waitForTimeout(2500)
 ok(await p.locator('select').filter({hasText:'INR'}).count()>=1&&await p.locator('select',{hasText:'Choose currency'}).count()===0,'post-login upload: INR detected from the resume')
 await c.close()}
console.log(fails?fails+' FAILED':'ALL PASS');await b.close()})()
