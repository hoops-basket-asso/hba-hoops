// Championnat (2 pts V / 1 pt D) et duos, sur la vraie base du 08/11 si présente, sinon la fixture.
const { chromium } = require('playwright'); const fs=require('fs');
const SRC=process.argv[2]||'tests/fixture-export.json';
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'});
  const fake=fs.readFileSync('tests/fake-firebase.js','utf8');
  await ctx.route(/gstatic\.com\/firebasejs\//, r=>r.fulfill({contentType:'application/javascript',body:'/* noop */'}));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat/, r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.route(/fonts\.googleapis|fonts\.gstatic/, r=>r.fulfill({contentType:'text/css',body:''}));
  const p=await ctx.newPage(); p.setDefaultTimeout(8000); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept()); const E=(c,m)=>{ if(!c) errs.push(m); };
  await p.goto('http://127.0.0.1:8099/index.html'); await p.waitForTimeout(800);
  await p.click('[data-act="show-login"]').catch(()=>{}); await p.waitForTimeout(150); await p.fill('#fbEmail','w.simbnag@gmail.com'); await p.fill('#fbPass','x'); await p.click('[data-act="fb-login"]'); await p.waitForTimeout(500);
  await p.setInputFiles('#impFile',SRC); await p.fill('#bureauEmails','w.simbnag@gmail.com'); await p.click('[data-act="fb-import"]'); await p.waitForTimeout(2500);
  await p.click('[data-go="stats"]'); await p.waitForTimeout(300); await p.click('[data-period="season"]').catch(()=>{}); await p.waitForTimeout(300);
  // nouveau classement en lignes : un n° 1 en tête, une ligne par joueur classé, puis le tableau complet à la demande
  { const lad=await p.evaluate(()=>{ const h=window.__hs; const L=h.ladderOf(h.seasonLadderSessions()); return {hero:document.querySelectorAll('#ladList .hero').length,rows:document.querySelectorAll('#ladList>.lrow').length,n:L.list.length,first:(document.querySelector('#ladList .hero .nm')||{}).innerText,top:L.list[0]?h.pname(L.list[0].r.id):null,table:document.querySelectorAll('#main th').length}; }); console.log('ladder en lignes',lad); E(lad.n===0||(lad.hero===1&&lad.rows===lad.n-1&&lad.first===lad.top&&lad.table===0),'classement en lignes incohérent '+JSON.stringify(lad)); }
  await p.click('[data-act="rank-view"]'); await p.waitForTimeout(200);
  const head=await p.evaluate(()=>[...document.querySelectorAll('#main th')].map(t=>t.innerText.trim())); console.log('colonnes', head.join(' | ')); E(head.some(h=>/Champ/i.test(h)),'colonne Champ. absente');
  // cohérence 2V+1D
  const chk=await p.evaluate(()=>{ const H=window.__hs; const sess=Object.values(H.S.sessions).filter(s=>s.status==='closed'&&!s.excluded); const ag=H.aggregate(sess).pl; return ag.map(r=>({n:H.pname(r.id),chp:Math.round(10*r.chp)/10,max:r.gp+r.w,min:Math.round(r.min/60000),gp:r.gp,idx:Math.round(10*H.mvpScore(r)/r.gp)/10,ok:r.chp<=r.gp+r.w+1e-9&&r.chp>=0})).sort((a,b)=>b.chp-a.chp).slice(0,8); }); console.log('championnat', chk); E(chk.every(x=>x.ok),'championnat hors bornes');
  const order=await p.evaluate(()=>[...document.querySelectorAll('#main tbody tr')].slice(0,6).map(tr=>tr.querySelector('.name').innerText.replace(/\s+/g,' ').trim())); console.log('ladder (tri par défaut)', order);
  E(head.some(h=>/Note/i.test(h))&&head.some(h=>/^Min/i.test(h)),'colonnes Note/Min absentes');
  await p.click('[data-stats-seg="top"]'); await p.waitForTimeout(300);
  const top=await p.evaluate(()=>document.querySelector('#main').innerText); { const nS=await p.evaluate(()=>Object.values(window.__hs.S.sessions).filter(s=>s.status==='closed'&&!s.excluded).length); if(nS>1){ E(/Champion de la saison/.test(top)&&/Iron Man/.test(top),'champion / Iron Man absents des awards'); E(/Leaders au cumul/.test(top)&&!/Récompenses sur la période/.test(top),'leaders au cumul / doublon'); E(!!(await p.$('#duoCard')),'carte duos absente'); } }
  const duo=await p.evaluate(()=>{ const H=window.__hs; const sess=Object.values(H.S.sessions).filter(s=>s.status==='closed'&&!s.excluded); const d=H.duoStats(sess); const often=[...d].sort((a,b)=>b.gp-a.gp).slice(0,3).map(x=>H.pname(x.a)+' + '+H.pname(x.b)+' : '+x.gp+' m, '+x.w+' V, attendu '+(x.exp==null?'-':Math.round(100*x.exp))+' %, sans l\'autre '+x.apart+' m'); return {n:d.length,elig:d.filter(x=>x.gp>=15&&x.apart>=10).length,often}; }); console.log('duos', duo);
  if(await p.$('#duoCard')){ await p.evaluate(()=>document.querySelector('#duoCard').scrollIntoView()); await p.screenshot({path:'out/duos.png'}); }
  console.log('errors',errs); await b.close(); process.exit(errs.length?1:0);
})().catch(e=>{ console.error(String(e).slice(0,500)); process.exit(1); });
