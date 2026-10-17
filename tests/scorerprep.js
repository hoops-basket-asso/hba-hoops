const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({viewport:{width:420,height:900},serviceWorkers:'block'});
  const fake=fs.readFileSync('/tmp/fake-firebase.js','utf8');
  await ctx.route(/gstatic\.com\/firebasejs\//, r=>r.fulfill({contentType:'application/javascript',body:'/* noop */'}));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat/, r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.route(/fonts\.googleapis|fonts\.gstatic/, r=>r.fulfill({contentType:'text/css',body:''}));
  const p=await ctx.newPage(); p.setDefaultTimeout(8000); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  const URL='http://127.0.0.1:8099/index.html'; await p.goto(URL); await p.waitForTimeout(800);
  await p.fill('#fbEmail','w.simbnag@gmail.com'); await p.fill('#fbPass','x'); await p.click('[data-act="fb-login"]'); await p.waitForTimeout(500);
  await p.setInputFiles('#impFile','/home/claude/hba-hoops/tests/fixture-export.json'); await p.fill('#bureauEmails','w.simbnag@gmail.com'); await p.click('[data-act="fb-import"]'); await p.waitForTimeout(1500);
  // prepare next session (future date) and save the list
  await p.click('[data-go="home"]'); await p.click('[data-act="new-session"]'); await p.waitForTimeout(200);
  await p.evaluate(()=>{ const d=new Date(); d.setDate(d.getDate()+1); window.__hs.S.setup.date=d.toISOString().slice(0,10); });
  for(let i=0;i<10;i++){ await (await p.$$('[data-act="toggle-present"]'))[i].click(); }
  await p.click('[data-act="save-prep"]'); await p.waitForTimeout(300);
  const prepId=await p.evaluate(()=>Object.values(window.__hs.S.sessions).filter(s=>s.status==='setup').sort((a,b)=>a.date<b.date?1:-1)[0].id); console.log('prep',prepId);
  // scorer link from the home card
  const lb=await p.$('[data-act="scorer-links"][data-id="'+prepId+'"]'); if(!lb) errs.push('no link button on prep card'); else { await lb.click(); await p.waitForTimeout(300); await p.fill('#scLabel','Karen'); await p.click('[data-act="scorer-create"]'); await p.waitForTimeout(400); }
  const url=await p.evaluate(()=>window.__hs.S.sheet&&window.__hs.S.sheet.newUrl); console.log('url',url);
  const exp=await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('fakefs')); const t=Object.values(d.scorerTokens||{})[0]; return t&&t.expires; }); console.log('expires',exp);
  const expMs=await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('fakefs')); const t=Object.values(d.scorerTokens||{})[0]; const e=t.expires; return e&&(e.seconds?e.seconds*1000:(e.__ts||e._ms||e)); });
  if(!(expMs>Date.now()+20*3600*1000)) errs.push('expiry not on session day: '+exp);
  await p.click('.sheet button[data-act="sheet-close"]'); await p.waitForTimeout(200); await p.click('[data-go="home"]'); await p.waitForTimeout(200); await p.click('[data-act="lock"]'); await p.waitForTimeout(300);
  // scorer opens before launch
  const p2=await ctx.newPage(); p2.setDefaultTimeout(8000); p2.on('pageerror',e=>errs.push('p2:'+e.message));
  await p2.goto(url.replace(/^.*index\.html/,URL)); await p2.waitForTimeout(900);
  let t=await p2.textContent('#main'); console.log('scorer sees prep', /Séance préparée/.test(t), 'launch btn', !!(await p2.$('[data-act="open-prep"]')), 'new player btn hidden', !(await p2.$('[data-act="add-player-inline"]')));
  await p2.click('[data-act="open-prep"]'); await p2.waitForTimeout(200); console.log('wizard view', await p2.evaluate(()=>window.__hs.S.view), 'nouveau hidden', !(await p2.$('[data-act="add-player-inline"]')));
  await p2.click('[data-act="setup-step"][data-id="2"]'); await p2.click('[data-act="auto-teams"]'); await p2.click('[data-act="setup-step"][data-id="3"]'); await p2.click('[data-act="start-session"]'); await p2.waitForTimeout(500);
  const st=await p2.evaluate(()=>({view:window.__hs.S.view,status:window.__hs.curSession().status,sid:window.__hs.S.sid})); console.log('after launch by scorer',st); if(st.status!=='live'||st.sid!==prepId) errs.push('scorer launch failed');
  await (await p2.$$('[data-q="pt2"]'))[0].click(); await p2.waitForTimeout(300); await p2.click('[data-act="ast-pick"][data-id=""]'); await p2.waitForTimeout(400);
  const saved=await p2.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('fakefs')); const s=Object.values(d.sessions).find(x=>x.status==='live'); return {events:s.matches[0].events.length, token:s.scorerToken}; }); console.log('scorer write',saved); if(!saved.token) errs.push('no scorer token on write');
  await p2.screenshot({path:'out/sp_live.png'});
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(String(e).slice(0,600));process.exit(1);});
