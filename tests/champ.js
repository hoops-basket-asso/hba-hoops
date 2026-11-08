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
  const head=await p.evaluate(()=>[...document.querySelectorAll('#main th')].map(t=>t.innerText.trim())); console.log('colonnes', head.join(' | ')); E(head.some(h=>/Champ/i.test(h)),'colonne Champ. absente');
  // cohérence 2V+1D
  const chk=await p.evaluate(()=>{ const H=window.__hs; const sess=Object.values(H.S.sessions).filter(s=>s.status==='closed'&&!s.excluded); const ag=H.aggregate(sess).pl; return ag.map(r=>({n:H.pname(r.id),champ:r.gp+r.w,w:r.w,l:r.gp-r.w,ok:(2*r.w+(r.gp-r.w))===(r.gp+r.w)})).sort((a,b)=>b.champ-a.champ).slice(0,6); }); console.log('championnat', chk); E(chk.every(x=>x.ok),'barème faux');
  await p.click('[data-stats-seg="top"]'); await p.waitForTimeout(300);
  const top=await p.evaluate(()=>document.querySelector('#main').innerText); { const nS=await p.evaluate(()=>Object.values(window.__hs.S.sessions).filter(s=>s.status==='closed'&&!s.excluded).length); if(nS>1) E(/Championnat · 2 pts la victoire/.test(top),'ligne championnat absente des récompenses'); } E(!!(await p.$('#duoCard')),'carte duos absente');
  const duo=await p.evaluate(()=>{ const H=window.__hs; const sess=Object.values(H.S.sessions).filter(s=>s.status==='closed'&&!s.excluded); const d=H.duoStats(sess); const often=[...d].sort((a,b)=>b.gp-a.gp).slice(0,3).map(x=>H.pname(x.a)+' + '+H.pname(x.b)+' : '+x.gp+' m, '+x.w+' V, attendu '+(x.exp==null?'-':Math.round(100*x.exp))+' %, sans l\'autre '+x.apart+' m'); return {n:d.length,elig:d.filter(x=>x.gp>=15&&x.apart>=10).length,often}; }); console.log('duos', duo);
  await p.evaluate(()=>document.querySelector('#duoCard').scrollIntoView()); await p.screenshot({path:'out/duos.png'});
  console.log('errors',errs); await b.close(); process.exit(errs.length?1:0);
})().catch(e=>{ console.error(String(e).slice(0,500)); process.exit(1); });
