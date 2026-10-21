const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({viewport:{width:420,height:900},serviceWorkers:'block'});
  const fake=fs.readFileSync('/tmp/fake-firebase.js','utf8');
  await ctx.route(/gstatic\.com\/firebasejs\//, r=>r.fulfill({contentType:'application/javascript',body:'/* noop */'}));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat/, r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.route(/fonts\.googleapis|fonts\.gstatic/, r=>r.fulfill({contentType:'text/css',body:''}));
  const p=await ctx.newPage(); p.setDefaultTimeout(8000); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.goto('http://127.0.0.1:8099/index.html'); await p.waitForTimeout(800);
  await p.fill('#fbEmail','w.simbnag@gmail.com'); await p.fill('#fbPass','x'); await p.click('[data-act="fb-login"]'); await p.waitForTimeout(500);
  await p.setInputFiles('#impFile',process.env.EXP||'tests/fixture-export.json'); await p.fill('#bureauEmails','w.simbnag@gmail.com'); await p.click('[data-act="fb-import"]'); await p.waitForTimeout(1500);
  const agg=()=>p.evaluate(()=>{ const ag=window.__hs.aggregate(Object.values(window.__hs.S.sessions).filter(s=>s.status==='closed'&&!s.excluded)); return Object.fromEntries(ag.pl.map(r=>[window.__hs.pname(r.id),{pts:r.pts,gp:r.gp,s:r.sessions}])); });
  const before=await agg(); console.log('before Wil FK', before['Wil FK']);
  // create target player
  await p.evaluate(()=>{ window.__hs.S.players['wk1']={id:'wk1',name:'Wilfried K.',member:false,active:true,createdAt:Date.now()}; });
  await p.evaluate(()=>{ window.__hs.S.sheet={type:'pedit',pid:'p20'}; window.__hs.render(); }); await p.waitForTimeout(200);
  const has=await p.$('#mergeInto'); if(!has) errs.push('no merge select'); else { await p.click('details summary'); await p.waitForTimeout(100); await p.selectOption('#mergeInto','wk1'); await p.click('[data-act="merge-player"]'); await p.waitForTimeout(800); }
  const after=await agg(); console.log('after Wilfried K.', after['Wilfried K.'], 'Wil FK still?', !!after['Wil FK']);
  if(!after['Wilfried K.']||after['Wilfried K.'].pts!==before['Wil FK'].pts||after['Wilfried K.'].s!==before['Wil FK'].s) errs.push('merge stats mismatch');
  const left=await p.evaluate(()=>!!window.__hs.S.players['p20']); if(left) errs.push('source not deleted');
  const chk=await p.evaluate(()=>{ const out=[]; Object.values(window.__hs.S.sessions).forEach(s=>{ const txt=JSON.stringify(s); if(txt.includes('"p20"')) out.push(s.date); }); return out; }); console.log('sessions still referencing p20', chk); if(chk.length) errs.push('p20 still referenced');
  const saved=await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('fakefs')); return {p20:!!d.players.p20, wk:d.players.wk1&&d.players.wk1.aliases, sess:Object.values(d.sessions).filter(s=>JSON.stringify(s).includes('"p20"')).length}; }); console.log('db', saved);
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(String(e).slice(0,500));process.exit(1);});
