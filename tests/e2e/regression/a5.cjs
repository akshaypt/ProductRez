const {chromium}=require('playwright')
const B='http://localhost:4173',PDF='/root/.claude/uploads/bc76b783-19f0-5191-a846-daea681793a0/3cb5f1c6-Akshay_Pramod_Teli_Resume.pdf'
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++}
;(async()=>{const b=await chromium.launch()
for(const [w,h,n,mob] of [[1280,800,'d',false],[390,844,'m',true]]){
const c=await b.newContext({viewport:{width:w,height:h},hasTouch:mob,colorScheme:'dark'});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)))
// signed-out /score goes to the landing page
await p.goto(B+'/score');await p.waitForTimeout(1500);ok(new URL(p.url()).pathname==='/','' +n+': signed-out /score sends people to the home page scanner')
// sign in (no resume first)
await p.getByRole('button',{name:/^Sign In$/}).first().click();await p.fill('input[type=email]','qa@test.dev');await p.getByRole('button',{name:/Continue/}).first().click();await p.waitForURL('**/score',{timeout:25000}).catch(()=>{});await p.waitForTimeout(1200)
if(await p.getByRole('button',{name:/^Start$/}).count())await p.getByRole('button',{name:/^Start$/}).click()
await p.goto(B+'/score');await p.waitForTimeout(1500)
ok(await p.locator('[data-testid=file-input]').count()===1&&(await p.locator('main').innerText()).includes('scoring is always free'),n+': first visit shows the upload screen and says scoring is free')
ok((await p.locator('main').innerText()).toLowerCase().includes('paste text')===false,n+': no paste option')
await p.setInputFiles('[data-testid=file-input]',PDF);await p.waitForTimeout(2500)
ok(await p.locator('select').count()===4,n+': level, focus, company and currency selects appear')
const vals=await p.locator('main select').evaluateAll(s=>s.map(x=>x.value));console.log(n,'prefilled:',vals)
await p.screenshot({path:`a5-${n}-1-upload.png`})
await p.getByRole('button',{name:/Review my resume/}).click();await p.waitForTimeout(800);await p.screenshot({path:`a5-${n}-2-running.png`})
await p.waitForSelector('[data-testid=report]',{timeout:15000});await p.waitForTimeout(1500)
const txt=await p.locator('main').innerText()
ok(/\b93\b/.test(txt),n+': app score matches the landing page (93)')
ok(await p.locator('.sd-paycard').count()===1&&txt.includes('What the market pays')&&txt.includes('Standing & career')&&await p.locator('.sd-radar').count()===1,n+': pay card, radar and standing tab shown')
ok(!/free score used|your first score is on us/i.test(txt),n+': no "free score" metering language')
await p.screenshot({path:`a5-${n}-3-dashboard.png`,fullPage:true})
// salary check works
await p.locator('.sd-field input').nth(0).fill('35');await p.locator('.sd-field input').nth(1).fill('55');await p.waitForTimeout(1600)
ok((await p.locator('.sd-verdicts').innerText()).match(/Underpaid|Decent|Good|Achievable|Stretch|Inflated|Easy|Fair|Top of Band/i)!==null,n+': salary check returns a verdict')
ok(/Saved to your account/.test(await p.locator('.sd-save').innerText()),n+': pay is saved to the account')
// reload keeps it
await p.reload();await p.waitForTimeout(2000);ok(await p.locator('[data-testid=report]').count()===1,n+': reload shows the saved result')
ok(await p.locator('.sd-field input').nth(0).inputValue()==='35'&&await p.locator('.sd-field input').nth(1).inputValue()==='55',n+': saved pay is back after a reload')
ok((await p.title()).startsWith('Resume Score'),n+': page title is "'+(await p.title())+'"')
// upload new replaces
await p.getByRole('button',{name:/New resume/}).click();await p.waitForTimeout(500)
ok((await p.locator('main').innerText()).includes('replaces'),n+': upload-new warns it replaces the saved one')
await p.getByRole('button',{name:/^Cancel$/}).click().catch(()=>{});await p.waitForTimeout(300)
// account
await p.goto(B+'/account');await p.waitForTimeout(1200)
ok((await p.locator('main').innerText()).includes('Saved resume')&&(await p.locator('main').innerText()).includes('Teli'),n+': Account shows the saved resume')
ok((await p.locator('main').innerText()).includes('hello@productrez.com'),n+': support email is not the placeholder')
await p.getByRole('button',{name:/Delete saved resume/}).click();await p.waitForTimeout(800)
ok((await p.locator('main').innerText()).includes('Nothing saved yet'),n+': saved resume can be deleted')
await p.goto(B+'/score');await p.waitForTimeout(1500);ok(await p.locator('[data-testid=file-input]').count()===1,n+': after deleting, Score asks for a new upload')
// logo goes to the app, sign out leaves
await p.goto(B+'/account');await p.waitForTimeout(800)
await p.getByRole('button',{name:/^Sign out$/}).click();await p.waitForTimeout(1200);ok(new URL(p.url()).pathname==='/','' +n+': sign out returns to the home page')
ok(errs.length===0,n+': no errors '+JSON.stringify(errs.slice(0,2)));await c.close()}
await b.close();console.log(fails?fails+' FAILED':'ALL PASSED')})()
