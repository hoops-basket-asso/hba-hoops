// Journal après clôture : attribuer / retirer une passe sur un panier, supprimer un match via ✎ Résultats.
const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({viewport:{width:420,height:900},serviceWorkers:'block'});
  const fake=fs.readFileSync('tests/fake-firebase.js','utf8');
  await ctx.route(/gstatic\.com\/firebasejs\//, r=>r.fulfill({contentType:'application/javascript',body:'/* noop */'}));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat/, r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.route(/fonts\.googleapis|fonts\.gstatic/, r=>r.fulfill({contentType:'text/css',body:''}));
  const p=await ctx.newPage(); p.setDefaultTimeout(8000); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept()); const E=(c,m)=>{ if(!c) errs.push(m); };
  await p.goto('http://127.0.0.1:8099/index.html'); await p.waitForTimeout(800);
  await p.click('[data-act="show-login"]',{timeout:1500}).catch(()=>{}); await p.waitForTimeout(150); await p.fill('#fbEmail','w.simbnag@gmail.com'); await p.fill('#fbPass','x'); await p.click('[data-act="fb-login"]'); await p.waitForTimeout(500);
  await p.setInputFiles('#impFile','tests/fixture-export.json'); await p.fill('#bureauEmails','w.simbnag@gmail.com'); await p.click('[data-act="fb-import"]'); await p.waitForTimeout(1500);
  const sid=await p.evaluate(()=>Object.values(window.__hs.S.sessions).find(s=>s.status==='closed').id);
  // panier sans passe dans le premier match
  const tgt=await p.evaluate(sid=>{ const s=window.__hs.S.sessions[sid]; for(let mi=0;mi<s.matches.length;mi++){ const ev=s.matches[mi].events; for(let i=0;i<ev.length;i++){ if(ev[i].type==='pt'&&!(ev[i+1]&&ev[i+1].type==='ast')) return {mi,i,pid:ev[i].pid,team:ev[i].team}; } } return null; },sid); console.log('cible', tgt); E(!!tgt,'aucun panier sans passe');
  const mate=await p.evaluate(({sid,tgt})=>{ const s=window.__hs.S.sessions[sid]; const m=s.matches[tgt.mi]; const r=(m.roster&&m.roster[tgt.team===m.home?'home':'away'])||s.teams[tgt.team].players; return r.find(x=>x!==tgt.pid); },{sid,tgt});
  const astOf=async pid=>p.evaluate(({sid,pid})=>window.__hs.sessionStats(window.__hs.S.sessions[sid]).pl[pid].ast||0,{sid,pid});
  const a0=await astOf(mate);
  await p.evaluate(({sid,tgt})=>{ window.__hs.S.sid=sid; window.__hs.S.sheet={type:'editev',i:tgt.i,mi:tgt.mi}; window.__hs.render(); },{sid,tgt}); await p.waitForTimeout(350);
  E(!!(await p.$('[data-act="ev-ast"]')),'chips passeur absents');
  await p.click(`[data-act="ev-ast"][data-id="${mate}"]`); await p.waitForTimeout(300);
  const a1=await astOf(mate); console.log('passes', a0, '->', a1); E(a1===a0+1,'passe non ajoutée');
  const nx=await p.evaluate(({sid,tgt})=>window.__hs.S.sessions[sid].matches[tgt.mi].events[tgt.i+1],{sid,tgt}); E(nx&&nx.type==='ast'&&nx.pid===mate,'événement ast mal inséré');
  // changer de passeur puis retirer
  await p.evaluate(({sid,tgt})=>{ window.__hs.S.sheet={type:'editev',i:tgt.i,mi:tgt.mi}; window.__hs.render(); },{sid,tgt}); await p.waitForTimeout(350);
  const onChip=await p.$eval(`[data-act="ev-ast"][data-id="${mate}"]`,e=>e.classList.contains('on')); E(onChip,'passeur courant non surligné');
  await p.click('[data-act="ev-ast"][data-id=""]'); await p.waitForTimeout(300);
  const a2=await astOf(mate); E(a2===a0,'passe non retirée');
  const len=await p.evaluate(({sid,tgt})=>window.__hs.S.sessions[sid].matches[tgt.mi].events.length,{sid,tgt});
  // persisté ?
  const saved=await p.evaluate(({sid,tgt})=>{ const d=JSON.parse(localStorage.getItem('fakefs')); return d.sessions[sid].matches[tgt.mi].events.length; },{sid,tgt}); E(saved===len,'non persisté');
  // suppression d'un match via ✎ Résultats
  const n0=await p.evaluate(sid=>window.__hs.S.sessions[sid].matches.length,sid);
  await p.evaluate(sid=>{ window.__hs.S.sheet={type:'fixres',sid}; window.__hs.render(); },sid); await p.waitForTimeout(350);
  const lastN=await p.evaluate(sid=>window.__hs.S.sessions[sid].matches.slice(-1)[0].n,sid);
  await p.click(`[data-act="fix-del"][data-id="${lastN}"]`); await p.waitForTimeout(400);
  const n1=await p.evaluate(sid=>window.__hs.S.sessions[sid].matches.length,sid); console.log('matchs', n0, '->', n1); E(n1===n0-1,'match non supprimé');
  const corr=await p.evaluate(sid=>(window.__hs.S.sessions[sid].corrections||[]).slice(-1)[0],sid); E(corr&&/supprimé/.test(corr.what),'correction non journalisée');
  console.log('errors',errs); await b.close(); process.exit(errs.length?1:0);
})().catch(e=>{ console.error(String(e).slice(0,500)); process.exit(1); });
