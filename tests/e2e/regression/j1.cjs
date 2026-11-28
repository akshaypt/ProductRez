const {chromium}=require('playwright')
const B='http://localhost:4173',PDF='/root/.claude/uploads/bc76b783-19f0-5191-a846-daea681793a0/3cb5f1c6-Akshay_Pramod_Teli_Resume.pdf'
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};const log=(...a)=>console.log(...a)
;(async()=>{const b=await chromium.launch()
for(const [w,h,n,mob] of [[1280,800,'d',false],[390,844,'m',true]]){
const c=await b.newContext({viewport:{width:w,height:h},hasTouch:mob,colorScheme:'dark'});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)))
await p.goto(B+'/');await p.waitForTimeout(1000)
await p.getByRole('button',{name:/^Sign In$/}).first().click();await p.fill('input[type=email]','qa@test.dev');await p.getByRole('button',{name:/Continue/}).first().click();await p.waitForTimeout(1500)
if(await p.getByRole('button',{name:/^Start$/}).count())await p.getByRole('button',{name:/^Start$/}).click()
// free user, no resume yet
await p.goto(B+'/jobs');await p.waitForTimeout(1500)
ok((await p.locator('main').innerText()).includes('Unlock your matched jobs'),n+': free user sees the paywall')
ok(await p.locator('text=Your top matches right now').count()===0,n+': no matches to preview before a resume is scored')
// score a resume
await p.goto(B+'/score');await p.waitForTimeout(1200);await p.setInputFiles('[data-testid=file-input]',PDF);await p.waitForTimeout(2200);await p.getByRole('button',{name:/Review my resume/}).click();await p.waitForSelector('[data-testid=report]',{timeout:15000});await p.waitForTimeout(800)
// free user with a resume: sees real top 3
await p.goto(B+'/jobs');await p.waitForTimeout(1800)
ok(await p.locator('text=Your top matches right now').count()===1,n+': free user now previews their top matches')
const peek=await p.locator('article.job').count();ok(peek===3,n+': exactly three previews ('+peek+')')
ok((await p.locator('main').innerText()).includes('Unlock to apply')&&await p.locator('a:has-text("Apply")').count()===0,n+': previews have no apply link')
log(n,'preview text:',(await p.locator('article.job').first().innerText()).replace(/\s+/g,' ').slice(0,200))
await p.screenshot({path:`j1-${n}-free.png`})
// buy lifetime
await p.goto(B+'/pricing');await p.waitForTimeout(800);await p.getByRole('button',{name:/Get Lifetime/}).click();await p.waitForTimeout(2300)
await p.goto(B+'/jobs');await p.waitForTimeout(2000)
const cards=await p.locator('article.job').count();ok(cards>10,n+': paid user sees the feed ('+cards+' roles)')
const chips=await p.locator('article.job .chip:has-text("% match")').allInnerTexts();ok(chips.length===cards,n+': every role shows a match score')
const scores=chips.map(x=>parseInt(x));ok(scores.every((s,i)=>i===0||scores[i-1]>=s),n+': sorted best match first ('+scores.slice(0,6).join(', ')+'…)')
ok((await p.locator('article.job').first().innerText()).includes('Missing:')||(await p.locator('article.job').first().innerText()).includes('covers every'),n+': shows what is missing')
ok(await p.locator('text=· new').count()>0,n+': recent roles are flagged new')
ok(await p.locator('article.job .chip:has-text("$"), article.job .chip:has-text("₹")').count()>0,n+': pay shows when posted')
await p.screenshot({path:`j1-${n}-paid.png`})
// filters
await p.getByLabel('PM focus').selectOption('ai_ml');await p.waitForTimeout(400);const ai=await p.locator('article.job').count();ok(ai>0&&ai<cards,n+': focus filter narrows ('+cards+' to '+ai+')')
await p.getByLabel('PM focus').selectOption('all')
await p.getByLabel('Sort').selectOption('new');await p.waitForTimeout(400);ok((await p.locator('article.job').first().innerText()).includes('· new'),n+': newest sort puts a new role first')
ok((await p.locator('main').innerText()).includes('Next update in'),n+': banner says next update, not "drop"')
ok(!/LinkedIn|2 days/.test(await p.locator('main').innerText()),n+': no stale LinkedIn or 2-day copy on the page')
const over=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);ok(over<=0,n+': no horizontal overflow ('+over+')')
ok(errs.length===0,n+': no errors '+JSON.stringify(errs.slice(0,2)));await c.close()}
await b.close();console.log(fails?fails+' FAILED':'ALL PASSED')})()
