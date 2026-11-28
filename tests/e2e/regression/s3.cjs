const {chromium}=require('playwright')
const S='/tmp/claude-0/-home-user-ProductRez/bc76b783-19f0-5191-a846-daea681793a0/scratchpad/'
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++}
;(async()=>{const b=await chromium.launch()
for(const [w,h,n,mob] of [[390,844,'m',true],[360,740,'s',true],[820,1000,'t',false],[1440,900,'d',false]]){
 const c=await b.newContext({viewport:{width:w,height:h},hasTouch:mob,colorScheme:'dark'});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)))
 await p.goto('http://localhost:4173/');await p.waitForTimeout(900)
 await p.setInputFiles('input[type=file]',S+'r-mid.txt');await p.waitForTimeout(2500)
 await p.locator('.pick-btn',{hasText:'pick currency'}).click().then(()=>p.locator(mob?'.sheet-opt':'.pick-opt',{hasText:'USD'}).click()).catch(()=>{})
 await p.getByRole('button',{name:/Review My Resume/}).click();await p.waitForURL('**/report',{timeout:25000});await p.waitForTimeout(500)
 await p.getByRole('button',{name:/^Sign In$/}).first().click();await p.fill('input[type=email]','a@b.co');await p.getByRole('button',{name:/Continue|Send/}).first().click();await p.waitForTimeout(2500)
 await p.goto('http://localhost:4173/score');await p.waitForTimeout(1800)
 const inputs=p.locator('.sd-field input')
 // both amounts far below a US band: pins go off the chart on the same side
 await inputs.nth(0).fill('38');await inputs.nth(1).fill('52');await p.waitForTimeout(1400)
 const chips=await p.locator('.sd-flag-chip').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}}))
 let overlap=false;for(let i=0;i<chips.length;i++)for(let j=i+1;j<chips.length;j++){const a=chips[i],e=chips[j];if(a.x<e.x+e.w&&a.x+a.w>e.x&&a.y<e.y+e.h&&a.y+a.h>e.y)overlap=true}
 ok(chips.length>=1&&!overlap,`${n}: off-chart flags do not overlap (${chips.length} pill)`)
 ok(chips.every(a=>a.x>=0&&a.x+a.w<=w),`${n}: off-chart flags stay on screen`)
 await p.locator('.sd-pay').screenshot({path:S+`s3-${n}-edge.png`})
 // fixed amounts for sensible values (in-range) then check every tab for overflow
 await inputs.nth(0).fill('300');await inputs.nth(1).fill('420');await p.waitForTimeout(1200)
 await p.locator('.sd-pay').screenshot({path:S+`s3-${n}-inrange.png`})
 for(const t of ['Fix list','Bullets','Skills','Standing']){
  await p.getByRole('tab',{name:new RegExp(t)}).click();await p.waitForTimeout(500)
  const bad=await p.evaluate(()=>{const W=document.documentElement.clientWidth;const out=[];document.querySelectorAll('.sd *').forEach(el=>{const r=el.getBoundingClientRect();if(r.width>0&&r.right>W+1&&!el.closest('.sd-tabs'))out.push(el.className||el.tagName)});return {x:document.documentElement.scrollWidth-W,n:out.length,first:out.slice(0,3)}})
  ok(bad.x<=0&&bad.n===0,`${n}: ${t} tab fits the screen ${JSON.stringify(bad)}`)
 }
 await p.getByRole('tab',{name:/Standing/}).click();await p.waitForTimeout(400);await p.locator('.sd-panel').screenshot({path:S+`s3-${n}-standing.png`})
 ok(errs.length===0,`${n}: no page errors ${errs[0]||''}`)
 await c.close()}
console.log(fails?fails+' FAILED':'ALL PASS');await b.close()})()
