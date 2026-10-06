const { chromium } = require('playwright'); const fs=require('fs'); fs.mkdirSync('out',{recursive:true});
(async()=>{
  const b=await chromium.launch({...(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{})}); const ctx=await b.newContext({viewport:{width:420,height:900}});
  const fake=fs.readFileSync('./tests/fake-firebase.js','utf8');
  await ctx.route(/gstatic\.com\/firebasejs\//, r=>r.fulfill({contentType:'application/javascript',body:'/* noop */'}));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat/, r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.route(/fonts\.googleapis|fonts\.gstatic/, r=>r.fulfill({contentType:'text/css',body:''}));
  await ctx.route(/sw\.js$/, r=>r.fulfill({status:404,body:''}));
  const p=await ctx.newPage(); p.setDefaultTimeout(8000); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const URL='http://127.0.0.1:8099/index.html';
  await p.goto(URL); await p.waitForTimeout(800);
  const pill=await p.textContent('#modePill'); console.log('viewer pill',pill, 'login form', !!(await p.$('#fbEmail')), 'treasury tab', !!(await p.$('[data-go="treasury"]')));
  // bootstrap login
  await p.fill('#fbEmail','w.simbnag@gmail.com'); await p.fill('#fbPass','x'); await p.click('[data-act="fb-login"]'); await p.waitForTimeout(500);
  console.log('after login: import card', !!(await p.$('#impFile')), 'role', await p.evaluate(()=>FB.role));
  await p.setInputFiles('#impFile','./tests/fixture-export.json'); await p.fill('#bureauEmails','w.simbnag@gmail.com\nclaude@example.com\nstephane@example.com');
  await p.click('[data-act="fb-import"]'); await p.waitForTimeout(1500);
  const st=await p.evaluate(()=>({role:FB.role,players:Object.keys(window.__hs.S.players).length,sessions:Object.keys(window.__hs.S.sessions).length,unlocked:window.__hs.S.unlocked}));
  const sanc=await p.evaluate(()=>Object.keys(window.__hs.S.sanctions).length); console.log('sanctions visible after import',sanc); if(sanc!==6) errs.push('sanctions not loaded');
  console.log('after import',st, 'pill', await p.textContent('#modePill'));
  await p.screenshot({path:'./out/fb_home.png'});
  // stats of imported session
  await p.click('[data-go="stats"]'); await p.waitForTimeout(400); await p.click('[data-stats-seg="teams"]'); await p.waitForTimeout(200); const t=await p.textContent('#main'); console.log('stats has Hervé', /Hervé/.test(t), 'approx', /approximatif/.test(t));
  // start a new session as bureau
  await p.click('[data-go="home"]'); await p.click('[data-act="new-session"]'); await p.waitForTimeout(200);
  for(let i=0;i<12;i++){ await (await p.$$('[data-act="toggle-present"]'))[i].click(); }
  await p.click('[data-act="auto-teams"]'); await p.click('[data-act="start-session"]'); await p.waitForTimeout(400);
  const sid=await p.evaluate(()=>window.__hs.S.sid); console.log('live sid',sid);
  // create scorer link
  await p.click('[data-act="scorer-links"]'); await p.waitForTimeout(300); await p.fill('#scLabel','Karen'); await p.click('[data-act="scorer-create"]'); await p.waitForTimeout(400);
  const url=await p.evaluate(()=>window.__hs.S.sheet&&window.__hs.S.sheet.newUrl); console.log('scorer url',url); await p.screenshot({path:'./out/fb_link.png'});
  await p.click('[data-act="sheet-close"] button[data-act="sheet-close"]').catch(()=>{});
  // logout bureau
  await p.click('[data-go="home"]'); await p.waitForTimeout(200); await p.click('[data-act="lock"]'); await p.waitForTimeout(300); console.log('after logout pill', await p.textContent('#modePill'));
  // scorer page
  const p2=await ctx.newPage(); p2.setDefaultTimeout(8000); p2.on('pageerror',e=>errs.push('p2:'+e.message));
  await p2.goto(url.replace(/^.*index\.html/,URL)); await p2.waitForTimeout(900);
  const s2=await p2.evaluate(()=>({role:FB.role,scorer:window.__hs.S.scorer,view:window.__hs.S.view,sid:window.__hs.S.sid,tabs:document.querySelectorAll('#tabs button').length}));
  console.log('scorer page',s2,'pill',await p2.textContent('#modePill'), 'quick buttons', (await p2.$$('[data-q="pt2"]')).length, 'close button hidden', !(await p2.$('[data-act="close-session"]')));
  await (await p2.$$('[data-q="pt2"]'))[0].click(); await p2.waitForTimeout(300); await p2.click('[data-act="ast-pick"][data-id=""]'); await p2.waitForTimeout(400);
  const saved=await p2.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('fakefs')); const s=Object.values(d.sessions).find(x=>x.status==='live'); return {events:s.matches[0].events.length, token:s.scorerToken}; }); console.log('scorer write',saved);
  await p2.screenshot({path:'./out/fb_scorer.png'});
  // viewer sees the live score (p is viewer now)
  await p.waitForTimeout(500); await p.click('[data-act="open-live"]').catch(()=>{}); await p.waitForTimeout(300); const vt=await p.textContent('#main'); console.log('viewer sees live', /Match 1/.test(vt));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(String(e).slice(0,600));process.exit(1);});
