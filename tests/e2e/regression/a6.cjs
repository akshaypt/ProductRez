const {chromium}=require('playwright')
const B='http://localhost:4173';let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};const log=(...a)=>console.log(...a)
;(async()=>{const b=await chromium.launch()
for(const [w,h,n,mob] of [[1280,800,'d',false],[390,844,'m',true]]){
const c=await b.newContext({viewport:{width:w,height:h},hasTouch:mob,colorScheme:'dark'});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)))
await p.goto(B+'/');await p.waitForTimeout(1000)
await p.getByRole('button',{name:/^Sign In$/}).first().click();await p.fill('input[type=email]','qa@test.dev');await p.getByRole('button',{name:/Continue/}).first().click();await p.waitForTimeout(1500)
if(await p.getByRole('button',{name:/^Start$/}).count())await p.getByRole('button',{name:/^Start$/}).click()
// pricing: 1 month then extend
await p.goto(B+'/pricing');await p.waitForTimeout(800);await p.getByRole('button',{name:/Get 1 month/}).click();await p.waitForTimeout(2200)
await p.goto(B+'/account');await p.waitForTimeout(800);log(n,'plan card:',(await p.locator('main .card').first().innerText()).replace(/\s+/g,' '))
await p.goto(B+'/pricing');await p.waitForTimeout(800);log(n,'pricing after buying 1 month buttons:',(await p.locator('main button').allInnerTexts()).filter(Boolean).slice(0,5))
// JOBS
await p.goto(B+'/jobs');await p.waitForTimeout(1500)
const before=await p.locator('[data-testid=job], .job').count()
await p.getByRole('button',{name:/^India$/}).click();await p.waitForTimeout(500);const india=await p.locator('[data-testid=job], .job').count()
ok(india>0&&india<before,n+': market filter narrows the list ('+before+' to '+india+')')
await p.getByRole('button',{name:/^All$/}).click();await p.waitForTimeout(300)
await p.getByPlaceholder(/Search title/).fill('zzzzqq');await p.waitForTimeout(500);const none=await p.locator('[data-testid=job], .job').count()
ok(none===0,n+': search with no match shows zero rows');log(n,'empty state text:',(await p.locator('main').innerText()).replace(/\s+/g,' ').slice(-200))
await p.getByPlaceholder(/Search title/).fill('');await p.waitForTimeout(300)
await p.getByRole('button',{name:/^Save$/}).first().click();await p.waitForTimeout(500)
ok((await p.getByRole('button',{name:/My pipeline/}).innerText()).includes('(1)'),n+': saving a job updates the pipeline count')
await p.getByRole('button',{name:/My pipeline/}).click();await p.waitForTimeout(600);log(n,'pipeline view:',(await p.locator('main').innerText()).replace(/\s+/g,' ').slice(0,300))
const apply=await p.locator('a:has-text("Apply")').first().getAttribute('href').catch(()=>null);const tgt=await p.locator('a:has-text("Apply")').first().getAttribute('target').catch(()=>null);log(n,'apply link:',apply&&apply.slice(0,50),'target',tgt)
// LEARN
await p.goto(B+'/learn');await p.waitForTimeout(1500)
await p.getByRole('button',{name:/Mark done/}).first().click();await p.waitForTimeout(500)
log(n,'learn after mark done:',(await p.locator('main').innerText()).replace(/\s+/g,' ').match(/\d+%/g)?.slice(0,3))
await p.reload();await p.waitForTimeout(1500);log(n,'progress persists after reload:',(await p.locator('.res.done').count()))
// command palette
if(!mob){await p.keyboard.press('Control+k');await p.waitForTimeout(500);ok(await p.locator('.cmdk').count()>0,n+': Ctrl+K opens the command palette');await p.keyboard.type('jobs');await p.keyboard.press('Enter');await p.waitForTimeout(800);ok(p.url().includes('/jobs'),n+': palette navigates')}
// onboarding returning: reload keeps prefs
log(n,'errors',[...new Set(errs)].slice(0,3));await c.close()}
await b.close();console.log(fails?fails+' FAILED':'ALL PASSED')})()
