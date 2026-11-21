// Chrono d'attaque partagé : notre calcul doit donner les mêmes valeurs que le contrat commun avec les applis Android et iPhone.
// tests/contrat/attack-clock.json vient du dépôt hba-ios (HoopsCore/Tests/.../web-attack-clock.json) : douze états de référence.
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p=await b.newPage({viewport:{width:400,height:900}}); p.setDefaultTimeout(5000);
  let html=require('fs').readFileSync(process.env.APP||'src/app.html','utf8');
  html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+html+'</body></html>';
  const errs=[]; const E=(c,m)=>{ if(!c) errs.push(m); }; p.on('pageerror',e=>errs.push(e.message));
  await p.setContent(html,{waitUntil:'load'}); await p.waitForTimeout(400);
  const cases=JSON.parse(require('fs').readFileSync('tests/contrat/attack-clock.json','utf8'));
  const out=await p.evaluate(cases=>{ const h=window.__hs; const real=Date.now; const res=[]; for(const c of cases){ Date.now=()=>c.now; h.S.config.minutes=c.minutes; const r=h.shotLeft(JSON.parse(JSON.stringify(c.match)),{format:c.format}); res.push({name:c.name,got:r,expected:c.expected}); } Date.now=real; return res; },cases);
  for(const r of out) E(r.got===r.expected,`contrat ${r.name} : attendu ${r.expected}, obtenu ${r.got}`);
  E(out.length===12,'douze états de référence attendus');
  // écriture : une commande 14 s puis l'arrêt écrivent les champs du contrat
  const w=await p.evaluate(()=>{ const h=window.__hs; h.S.config.minutes=9; const m={n:1,status:'live',elapsedMs:500000,running:false,startedAt:null}; h.setShot(m,14000); const a={d:m.shotDuration,o:m.shotOrigin,l:m.lastMinute,x:m.shotExpired,left:h.shotLeft(m,{format:'rotation'})}; h.setShot(m,null); return {a,b:{d:m.shotDuration,o:m.shotOrigin,l:m.lastMinute,left:h.shotLeft(m,{format:'rotation'})}}; });
  E(w.a.d===14000&&w.a.o===500000&&w.a.l===true&&w.a.x===false&&w.a.left===14000,'commande 14 s : champs inattendus '+JSON.stringify(w.a));
  E(w.b.d===undefined&&w.b.o===undefined&&w.b.l===true&&w.b.left===null,'arrêt : champs inattendus '+JSON.stringify(w.b));
  console.log('errors',errs); await b.close(); process.exit(errs.length?1:0);
})();
