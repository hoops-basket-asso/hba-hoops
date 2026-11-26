// Le point du mois (bureau) : participations à régler, soldes réels des comptes, écart avec l'application, résumé pour le bureau.
// Et la date prévue du solde du pack, qui déplace la sortie sur la courbe de la caisse.
const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({viewport:{width:420,height:900},serviceWorkers:'block'});
  const fake=fs.readFileSync('tests/fake-firebase.js','utf8');
  await ctx.route(/gstatic\.com\/firebasejs\//, r=>r.fulfill({contentType:'application/javascript',body:'/* noop */'}));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat/, r=>r.fulfill({contentType:'application/javascript',body:fake}));
  // l'horloge de la page est décalée au dimanche 29/11/2026 15h : le point de novembre est « à faire »
  await ctx.addInitScript(()=>{ const RD=Date; const off=new RD('2026-11-29T15:00:00').getTime()-RD.now(); class D extends RD{ constructor(...a){ if(a.length) super(...a); else super(RD.now()+off); } static now(){ return RD.now()+off; } } window.Date=D; });
  await ctx.addInitScript(()=>{ try{ localStorage.setItem('hs-fold',JSON.stringify(['tcash','tpack','tproj','tledg'])); }catch(e){} window.__sh=[]; Object.defineProperty(navigator,'share',{configurable:true,value:d=>{ window.__sh.push(d); return Promise.resolve(); }}); });
  const p=await ctx.newPage(); p.setDefaultTimeout(8000); const errs=[]; p.on('pageerror',e=>{ errs.push(e.message); if(process.env.DBG) console.log('PAGEERR',e.message); }); p.on('console',m=>{ if(process.env.DBG) console.log('CONSOLE',m.text().slice(0,300)); }); p.on('dialog',d=>d.accept());
  const E=(c,m)=>{ if(!c) errs.push(m); };
  await p.goto('http://127.0.0.1:8099/index.html'); await p.waitForTimeout(800);
  await p.click('[data-act="show-login"]',{timeout:1500}).catch(()=>{}); await p.waitForTimeout(150); await p.fill('#fbEmail','claude.test@example.org'); await p.fill('#fbPass','x'); await p.click('[data-act="fb-login"]'); await p.waitForTimeout(500);
  await p.setInputFiles('#impFile','tests/fixture-export.json'); await p.fill('#bureauEmails','claude.test@example.org'); await p.click('[data-act="fb-import"]'); await p.waitForTimeout(1500);
  // quand faire le point : du 24 au 10 du mois suivant
  const pm=await p.evaluate(()=>['2026-11-23','2026-11-24','2026-12-10','2026-12-11','2027-01-05'].map(d=>window.__hs.pointMonth(d)));
  E(JSON.stringify(pm)===JSON.stringify([null,'2026-11','2026-11',null,'2026-12']),'période du point : '+JSON.stringify(pm));
  // le bandeau sur l'accueil bureau
  await p.click('[data-go="home"]'); await p.waitForTimeout(300); E(await p.$('#pointTodo'),'accueil bureau : bandeau « le point est prêt » absent');
  const f0=await p.evaluate(()=>{ const f=window.__hs.pointFacts('2026-11'); return {nDue:f.nDue,due:f.due.map(o=>({pid:o.pid,n:o.due.length})),app:f.app,decl:f.decl.length}; }); console.log('à régler',f0.nDue,'en caisse',f0.app);
  E(f0.nDue>0,'jeu d\'essai : aucune participation à régler, le test ne vérifie rien');
  // « envoyer le lien » : un message court avec le lien direct
  await p.click('[data-act="mp-send"]'); await p.waitForTimeout(200); let sh=await p.evaluate(()=>window.__sh.pop()); E(sh&&/point=2026-11$/.test(sh.url)&&/3 minutes/.test(sh.text),'lien du point mal formé : '+JSON.stringify(sh));
  await p.click('#pointTodo [data-act="mp-open"]'); await p.waitForSelector('#mpSheet');
  // 1. relancer puis marquer payé
  const first=f0.due[0]; await p.click(`#mpSheet [data-act="mp-remind"][data-id="${first.pid}"]`); await p.waitForTimeout(200); sh=await p.evaluate(()=>window.__sh.pop()); E(sh&&/petit rappel/.test(sh.text)&&/€/.test(sh.text),'message de relance : '+JSON.stringify(sh));
  await p.click(`#mpSheet [data-act="mp-paid"][data-id="${first.pid}"]`); await p.waitForTimeout(400);
  const f1=await p.evaluate(()=>{ const f=window.__hs.pointFacts('2026-11'); return {nDue:f.nDue,app:f.app}; }); E(f1.nDue===f0.nDue-first.n,'« Payé » : attendu '+(f0.nDue-first.n)+' restantes, lu '+f1.nDue); E(Math.abs(f1.app-(f0.app+12*first.n))<0.01,'« Payé » : la caisse doit monter de '+12*first.n+' €, '+f0.app+' → '+f1.app);
  E(await p.$('#mpSheet'),'la feuille doit rester ouverte après « Payé »');
  // 3. les comptes : sans soldes, pas de validation ; écart > 50 € sans explication, pas de validation
  await p.click('[data-act="mp-validate"]'); await p.waitForTimeout(450); E(await p.$('#mpSheet'),'validation sans soldes acceptée');
  const q=Math.round((f1.app+70-200)*100)/100; await p.fill('#mpQ',String(q).replace('.',',')); await p.fill('#mpP','200'); await p.waitForTimeout(150);
  E(/écart de \+70/.test(await p.textContent('#mpGap')),'écart en direct : '+await p.textContent('#mpGap'));
  await p.click('[data-act="mp-validate"]'); await p.waitForTimeout(450); E(await p.$('#mpSheet'),'écart de 70 € validé sans explication');
  await p.fill('#mpNote','virement du 28 pas encore saisi'); await p.waitForTimeout(450); await p.click('[data-act="mp-validate"]'); await p.waitForTimeout(500); E(!(await p.$('#mpSheet')),'la feuille doit se fermer après validation');
  const pt=await p.evaluate(()=>((window.__hs.S.treasury.points||{}).months||{})['2026-11']); E(pt&&pt.gap===70&&pt.p===200&&pt.by==='Claude'&&pt.note,'point enregistré : '+JSON.stringify(pt));
  sh=await p.evaluate(()=>window.__sh.pop()); E(sh&&/validé par Claude/.test(sh.text)&&/écart de \+70 €/.test(sh.text)&&/virement du 28/.test(sh.text)&&/point=2026-11/.test(sh.text),'résumé bureau : '+JSON.stringify(sh));
  // après validation : plus de bandeau « à faire », et pas de bandeau « validé » pour celui qui vient de valider
  await p.click('[data-go="home"]'); await p.waitForTimeout(300); E(!(await p.$('#pointTodo')),'bandeau « à faire » encore là après validation'); E(!(await p.$('#pointDone')),'bandeau « validé » montré à son auteur');
  // un autre membre du bureau, lui, le voit
  await p.evaluate(()=>{ const h=window.__hs; const d=JSON.parse(JSON.stringify(h.S.treasury.points)); d.months['2026-11'].by='Stéphane'; h.S.treasury.points=d; localStorage.removeItem('hs-point-vu'); }); await p.click('[data-go="stats"]'); await p.click('[data-go="home"]'); await p.waitForTimeout(300);
  E(await p.$('#pointDone'),'bandeau « point validé » absent pour les autres membres du bureau'); await p.click('[data-act="mp-seen"]').catch(()=>{}); await p.waitForTimeout(200); E(!(await p.$('#pointDone')),'« Vu » ne masque pas le bandeau');
  // lien direct : ?point=2026-11 ouvre la feuille
  await p.goto('http://127.0.0.1:8099/index.html?point=2026-11'); await p.waitForSelector('#mpSheet',{timeout:6000}).catch(()=>errs.push('le lien ?point= n\'ouvre pas la feuille')); E((await p.inputValue('#mpP').catch(()=>''))==='200','le point déjà validé doit revenir pré-rempli');
  await p.click('#mpSheet [data-act="sheet-close"]').catch(()=>{});
  // solde du pack prévu début janvier : la sortie se place à cette date sur la courbe
  await p.goto('http://127.0.0.1:8099/index.html'); await p.waitForTimeout(800); await p.click('[data-go="bureau"]'); await p.waitForTimeout(200); await p.click('[data-bureau-seg="treasury"]'); await p.waitForTimeout(300);
  const due=await p.evaluate(()=>window.__hs.cashState().packDue);
  if(due>0){ const before=await p.textContent('#cashCard'); await p.click('[data-act="pack-edit"]'); await p.waitForTimeout(200); await p.fill('#pkD','2027-01-05'); await p.click('[data-act="pack-save"]'); await p.waitForTimeout(400); const after=await p.textContent('#cashCard');
    E(/prévu le 5 janv/.test(after),'tuile « À payer » sans la date prévue'); const m=after.match(/(\d+ \S+)\.? · Solde pack/); E(m&&/10 janv/.test(m[1]),'solde du pack attendu le dimanche 10 janv., lu '+(m&&m[1])); const end=t=>(t.match(/Fin de saison prévue : ([^,]+)/)||[])[1]; E(end(before)===end(after),'la prévision de fin de saison ne doit pas changer : '+end(before)+' → '+end(after)); }
  else errs.push('jeu d\'essai : pack déjà soldé, la date prévue n\'est pas testée');
  console.log('errors',errs); await b.close(); if(errs.length) process.exit(1); })().catch(e=>{ console.error(e); process.exit(1); });
