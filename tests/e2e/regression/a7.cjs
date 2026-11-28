const {chromium}=require('playwright')
const B='http://localhost:4173';let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++}
;(async()=>{const b=await chromium.launch()
const c=await b.newContext({viewport:{width:390,height:844},hasTouch:true,colorScheme:'dark'});const p=await c.newPage()
await p.goto(B+'/');await p.waitForTimeout(1000)
await p.getByRole('button',{name:/^Sign In$/}).first().click();await p.fill('input[type=email]','qa@test.dev');await p.getByRole('button',{name:/Continue/}).first().click();await p.waitForTimeout(1500)
if(await p.getByRole('button',{name:/^Start$/}).count())await p.getByRole('button',{name:/^Start$/}).click()
for(const [r,t] of [['/score','Resume Score'],['/writer','Resume Writer'],['/jobs','Fresh Jobs'],['/learn','Learn'],['/pricing','Plans'],['/account','Account']]){await p.goto(B+r);await p.waitForTimeout(900);ok((await p.title())===t+' | ProductRez','title for '+r+': '+(await p.title()))}
await p.goto(B+'/account');await p.waitForTimeout(900)
const small=await p.evaluate(()=>[...document.querySelectorAll('main a,main button')].filter(e=>e.offsetParent&&e.getBoundingClientRect().height<38).map(e=>(e.innerText||'').trim().slice(0,20)+'('+Math.round(e.getBoundingClientRect().height)+')'))
ok(small.length===0,'account tap targets all >=38px on phone '+JSON.stringify(small))
await p.keyboard.press('Tab');ok(await p.locator('.skip-link:focus').count()===1,'skip link is the first tab stop')
await p.goto(B+'/pricing');await p.waitForTimeout(900);ok((await p.locator('main').innerText()).includes('Get Lifetime'),'pricing for a free user still says Get')
// logo goes to the app
await p.locator('.topbar a[aria-label="ProductRez home"]').click();await p.waitForTimeout(800);ok(new URL(p.url()).pathname==='/score','logo goes to the app, not the marketing page')
// signed-out gate
const c2=await b.newContext({viewport:{width:1280,height:800}});const q=await c2.newPage()
for(const r of ['/writer','/jobs','/learn','/account']){await q.goto(B+r);await q.waitForTimeout(1200);ok(new URL(q.url()).pathname==='/',r+' signed out goes to the home page')}
await q.goto(B+'/pricing');await q.waitForTimeout(1000);ok(new URL(q.url()).pathname==='/pricing','pricing stays public')
await b.close();console.log(fails?fails+' FAILED':'ALL PASSED')})()
