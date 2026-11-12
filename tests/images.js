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
  // Images à partager : ladder de la semaine + résumé de séance, et impact « terrain / banc »
  await p.click('[data-go="stats"]'); await p.waitForTimeout(300); await p.click('[data-period="season"]').catch(()=>{}); await p.waitForTimeout(300);
  await p.click('[data-act="ladder-img"]'); await p.waitForTimeout(1500);
  E(await p.evaluate(()=>{ const i=document.querySelector('#ladImg img'); return !!(i&&i.naturalWidth===1080&&i.naturalHeight>1200&&i.naturalHeight<1700); }),'image ladder absente ou mal dimensionnée');
  const sum=await p.evaluate(async()=>{ const h=window.__hs; const s=Object.values(h.S.sessions).filter(x=>x.status==='closed').sort((a,b)=>a.date<b.date?1:-1)[0]; const c=await h.summaryImage(s); return [c.width,c.height]; });
  E(sum[0]===1080&&sum[1]>900&&sum[1]<3200,'image résumé mal dimensionnée '+sum);
  const lad=await p.evaluate(()=>{ const h=window.__hs; const L=h.ladderOf(h.seasonLadderSessions()); return {n:L.list.length,sorted:L.list.every((e,i,a)=>!i||a[i-1].note>=e.note),bounded:L.list.every(e=>e.note>=0&&e.note<=10.0001)}; });
  E(lad.sorted&&lad.bounded,'ladder non trié ou note hors bornes '+JSON.stringify(lad));
  // impact : écart terrain/banc par 10 min, jamais affiché sur une seule séance, ≈ sous 60 min de chaque côté
  const imp=await p.evaluate(()=>{ const h=window.__hs; const ag=h.aggregate(h.seasonLadderSessions()); const r=ag.pl.find(x=>x.onT>0&&x.offT>0); if(!r) return {skip:true};
    const v=h.impPerMatch(r); const exp=600000*(r.onPm/r.onT-r.offPm/r.offT); return {ok:Math.abs(v-exp)<1e-9,label:h.impLabel(r),reliable:h.impOk(r)}; });
  E(imp.skip||(imp.ok&&(imp.reliable||/≈/.test(imp.label))),'impact mal calculé '+JSON.stringify(imp));
  await p.click('[data-period="session"]'); await p.waitForTimeout(300); await p.click('[data-stats-seg="top"]').catch(()=>{}); await p.waitForTimeout(300);
  E(!/Impact/.test(await p.evaluate(()=>document.querySelector('#main').innerText)),'impact affiché sur une seule séance');
  console.log('ladder',lad,'résumé',sum,'impact',imp); console.log('errors',errs); await b.close(); process.exit(errs.length?1:0);
})().catch(e=>{ console.error(String(e).slice(0,600)); process.exit(1); });
