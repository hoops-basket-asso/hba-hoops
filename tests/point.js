// Le point du mois (bureau) : participations à régler, soldes réels des comptes, écart avec l'application, résumé pour le bureau.
// Et la date prévue du solde du pack, qui déplace la sortie sur la courbe de la caisse.
const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({viewport:{width:420,height:900},serviceWorkers:'block'});
  const fake=fs.readFileSync('tests/fake-firebase.js','utf8');
  await ctx.route(/gstatic\.com\/firebasejs\//, r=>r.fulfill({contentType:'application/javascript',body:'/* noop */'}));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat/, r=>r.fulfill({contentType:'application/javascript',body:fake}));
  // l'horloge de la page est décalée au samedi 31/10/2026 15h : le point d'octobre est « à faire »
  await ctx.addInitScript(()=>{ const RD=Date; const off=new RD('2026-10-31T15:00:00').getTime()-RD.now(); class D extends RD{ constructor(...a){ if(a.length) super(...a); else super(RD.now()+off); } static now(){ return RD.now()+off; } } window.Date=D; });
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
  const f0=await p.evaluate(()=>{ const f=window.__hs.pointFacts('2026-10'); return {nDue:f.nDue,due:f.due.map(o=>({pid:o.pid,n:o.due.length})),app:f.app,decl:f.decl.length}; }); console.log('à régler',f0.nDue,'en caisse',f0.app);
  E(f0.nDue>0,'jeu d\'essai : aucune participation à régler, le test ne vérifie rien');
  // « envoyer le lien » : un message court avec le lien direct
  await p.click('[data-act="mp-send"]'); await p.waitForTimeout(200); let sh=await p.evaluate(()=>window.__sh.pop()); E(sh&&/point=2026-10$/.test(sh.url)&&/3 minutes/.test(sh.text),'lien du point mal formé : '+JSON.stringify(sh));
  await p.click('#pointTodo [data-act="mp-open"]'); await p.waitForSelector('#mpSheet');
  // 1. relancer puis marquer payé
  const first=f0.due[0]; await p.click(`#mpSheet [data-act="mp-remind"][data-id="${first.pid}"]`); await p.waitForTimeout(200); sh=await p.evaluate(()=>window.__sh.pop()); E(sh&&/petit rappel/.test(sh.text)&&/€/.test(sh.text),'message de relance : '+JSON.stringify(sh));
  await p.click(`#mpSheet [data-act="mp-paid"][data-id="${first.pid}"]`); await p.waitForTimeout(400);
  const f1=await p.evaluate(()=>{ const f=window.__hs.pointFacts('2026-10'); return {nDue:f.nDue,app:f.app}; }); E(f1.nDue===f0.nDue-first.n,'« Payé » : attendu '+(f0.nDue-first.n)+' restantes, lu '+f1.nDue); E(Math.abs(f1.app-(f0.app+12*first.n))<0.01,'« Payé » : la caisse doit monter de '+12*first.n+' €, '+f0.app+' → '+f1.app);
  E(await p.$('#mpSheet'),'la feuille doit rester ouverte après « Payé »');
  // 3. les comptes : sans soldes, pas de validation ; écart > 50 € sans explication, pas de validation
  await p.click('[data-act="mp-validate"]'); await p.waitForTimeout(450); E(await p.$('#mpSheet'),'validation sans soldes acceptée');
  const q=Math.round((f1.app+70-200)*100)/100; await p.fill('#mpQ',String(q).replace('.',',')); await p.fill('#mpP','200'); await p.waitForTimeout(150);
  E(/écart de \+70/.test(await p.textContent('#mpGap')),'écart en direct : '+await p.textContent('#mpGap'));
  await p.click('[data-act="mp-validate"]'); await p.waitForTimeout(450); E(await p.$('#mpSheet'),'écart de 70 € validé sans explication');
  await p.fill('#mpNote','virement du 28 pas encore saisi'); await p.waitForTimeout(450); await p.click('[data-act="mp-validate"]'); await p.waitForSelector('#mdSheet',{timeout:4000}).catch(()=>errs.push('pas de confirmation après la validation du point'));
  const pt=await p.evaluate(()=>((window.__hs.S.treasury.points||{}).months||{})['2026-10']); E(pt&&pt.gap===70&&pt.p===200&&pt.by==='Claude'&&pt.byId==='claude.test@example.org'&&pt.note,'point enregistré : '+JSON.stringify(pt));
  await p.click('[data-act="mp-tell"]'); await p.waitForTimeout(200); sh=await p.evaluate(()=>window.__sh.pop()); E(sh&&/comptes relevés|validé par Claude/.test(sh.text)&&/écart de \+70 €/.test(sh.text)&&/virement du 28/.test(sh.text)&&/point=2026-10/.test(sh.text),'résumé bureau : '+JSON.stringify(sh));
  // ---- le point du président : l'image et le message sont déjà remplis ----
  await p.waitForTimeout(400); await p.click('#mdSheet [data-act="me-open"]'); await p.waitForSelector('#meSheet'); await p.waitForSelector('#edImg img',{timeout:8000}).catch(()=>errs.push('aperçu de l\'image absent'));
  const e0=await p.evaluate(()=>{ const h=window.__hs; const ed=h.editionOf('2026-10'); const cs=h.cashState(); return {cash:ed.cash,due:ed.due,toN1:ed.toN1,fc:h.forecast(cs).toN1,app:ed.a.appCash,packDue:cs.packDue,nS:ed.a.nS,avg:ed.a.avg,pres:ed.a.pres.map(q=>q.n),txt:h.editionText(ed),status:ed.status,diffs:ed.diffs.length,gestion:ed.gestion,facts:ed.facts}; });
  E(e0.cash===pt.total,'en caisse : le point du président doit reprendre le total relevé ('+pt.total+'), lu '+e0.cash); E(e0.due===e0.packDue,'reste dû : '+e0.due+' ≠ '+e0.packDue); E(Math.abs(e0.toN1-(e0.fc+70))<0.01,'prévision : celle de la trésorerie décalée de l\'écart relevé (+70), lu '+e0.toN1+' pour '+e0.fc);
  E(e0.nS>0&&Math.abs(e0.avg-e0.pres.reduce((a,b)=>a+b,0)/e0.nS)<1e-9,'présences : moyenne incohérente'); E(e0.diffs===0&&!e0.status,'une proposition neuve ne doit montrer aucun écart ni statut');
  E(/Le point d'octobre/.test(e0.txt)&&/Caisse : /.test(e0.txt)&&/Présences : /.test(e0.txt)&&e0.txt.length<900,'message WhatsApp : '+e0.txt); E(/dû au Hoops/.test(e0.gestion),'gestion : ligne du solde du pack absente');
  E(/Proposition/.test(await p.textContent('#meSheet .pill')),'statut attendu « Proposition »');
  // modifier un chiffre : l'écart avec l'appli est signalé, puis envoi au bureau
  await p.click('#meSheet details.fold summary'); await p.waitForTimeout(200); await p.fill('#edCash',String(e0.cash+100)); await p.fill('#edFacts','Naissance chez un adhérent, félicitations.'); await p.click('[data-act="me-refresh"]'); await p.waitForTimeout(900);
  E(/vous indiquez/.test(await p.textContent('#edDiff'))&&/à accorder/.test(await p.textContent('#edDiff')),'écart de 100 € non signalé : '+await p.textContent('#edDiff')); E(/Naissance/.test(await p.textContent('#edTxt')),'le message ne suit pas les faits modifiés');
  await p.waitForTimeout(450); await p.click('[data-act="me-send"]'); await p.waitForTimeout(500); sh=await p.evaluate(()=>window.__sh.pop()); E(sh&&/prêt à relire/.test(sh.text)&&/À accorder : En caisse/.test(sh.text)&&/point=2026-10$/.test(sh.url),'envoi au bureau : '+JSON.stringify(sh));
  let ed=await p.evaluate(()=>window.__hs.points()['2026-10'].ed); E(ed&&ed.status==='sent'&&ed.cash===e0.cash+100&&ed.byId==='claude.test@example.org','édition envoyée : '+JSON.stringify(ed));
  E(!(await p.$('[data-act="me-ok"]'))&&!(await p.$('[data-act="me-share"]')),'l\'auteur ne peut ni valider ni partager sa propre édition');
  await p.click('#meSheet [data-act="sheet-close"]'); await p.click('[data-go="home"]'); await p.waitForTimeout(300); E(!(await p.$('#pointTodo')),'bandeau affiché à l\'auteur alors qu\'il attend le bureau');
  // un autre membre du bureau : bandeau « attend une validation », il valide, puis partage
  await p.evaluate(()=>{ const h=window.__hs; h.S.fbEmail='stephane.test@example.org'; }); await p.click('[data-go="stats"]'); await p.click('[data-go="home"]'); await p.waitForTimeout(300);
  E((await p.getAttribute('#pointTodo','data-stage').catch(()=>null))==='validate','bandeau « attend une validation » absent pour un autre membre du bureau'); E(!(await p.$('#pointDone')),'deux bandeaux pour le même mois');
  await p.click('#pointTodo [data-act="me-open"]'); await p.waitForSelector('#meSheet'); await p.waitForSelector('#edImg img'); await p.waitForTimeout(450); await p.click('[data-act="me-ok"]'); await p.waitForTimeout(500);
  ed=await p.evaluate(()=>window.__hs.points()['2026-10'].ed); E(ed.status==='ok'&&ed.okById==='stephane.test@example.org'&&ed.cash===e0.cash+100,'validation : '+JSON.stringify(ed));
  await p.evaluate(()=>{ Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true}); }); await p.waitForSelector('[data-act="me-share"]'); await p.waitForTimeout(450); await p.click('[data-act="me-share"]'); await p.waitForTimeout(1500); if(process.env.DBG) console.log('TOAST',await p.evaluate(()=>[(document.querySelector('.toast')||{}).textContent,typeof navigator.canShare,window.__sh.length]));
  sh=await p.evaluate(()=>{ const d=window.__sh.pop(); return d&&{n:(d.files||[]).length,type:d.files&&d.files[0]&&d.files[0].type,size:d.files&&d.files[0]&&d.files[0].size,text:d.text}; }); E(sh&&sh.n===1&&sh.type==='image/png'&&sh.size>20000&&/Le point d'octobre/.test(sh.text)&&/Naissance/.test(sh.text),'partage au groupe : '+JSON.stringify(sh&&{...sh,text:(sh.text||'').slice(0,60)}));
  E(await p.evaluate(()=>!!window.__hs.points()['2026-10'].ed.sharedAt),'le partage n\'est pas enregistré'); await p.click('#meSheet [data-act="sheet-close"]').catch(()=>{}); await p.click('[data-go="home"]'); await p.waitForTimeout(300); E(!(await p.$('#pointTodo')),'bandeau encore là après le partage');
  await p.evaluate(()=>{ window.__hs.S.fbEmail='claude.test@example.org'; });
  // lien direct : ?point=2026-10 ouvre la feuille
  await p.goto('http://127.0.0.1:8099/index.html?point=2026-10'); await p.waitForSelector('#meSheet',{timeout:6000}).catch(()=>errs.push('le lien ?point= doit ouvrir le point du président quand les soldes sont déjà relevés')); await p.click('#meSheet [data-act="sheet-close"]').catch(()=>{});
  // solde du pack prévu début janvier : la sortie se place à cette date sur la courbe
  await p.goto('http://127.0.0.1:8099/index.html'); await p.waitForTimeout(800); await p.click('[data-go="bureau"]'); await p.waitForTimeout(200); await p.click('[data-bureau-seg="treasury"]'); await p.waitForTimeout(300);
  const due=await p.evaluate(()=>window.__hs.cashState().packDue);
  if(due>0){ const before=await p.textContent('#cashCard'); await p.click('[data-act="pack-edit"]'); await p.waitForTimeout(200); await p.fill('#pkD','2027-01-05'); await p.click('[data-act="pack-save"]'); await p.waitForTimeout(400); const after=await p.textContent('#cashCard');
    E(/prévu le 5 janv/.test(after),'tuile « À payer » sans la date prévue'); const m=after.match(/(\d+ \S+)\.? · Solde pack/); E(m&&/10 janv/.test(m[1]),'solde du pack attendu le dimanche 10 janv., lu '+(m&&m[1])); const end=t=>(t.match(/Fin de saison prévue : ([^,]+)/)||[])[1]; E(end(before)===end(after),'la prévision de fin de saison ne doit pas changer : '+end(before)+' → '+end(after)); }
  else errs.push('jeu d\'essai : pack déjà soldé, la date prévue n\'est pas testée');
  // cotisation close (don, départ) : le reste n'est plus attendu, ni dans la caisse à venir ni dans le point du président
  { const mid=await p.evaluate(()=>{ const h=window.__hs; const m=Object.values(h.S.players).find(x=>x.member&&x.active!==false&&!x.newMember); return m.id; });
    await p.click('[data-tre-seg="cot"]'); await p.waitForTimeout(300); await p.fill('#cot-'+mid,'160'); await p.click(`[data-act="cot-mark"][data-id="${mid}"]`); await p.waitForTimeout(500);
    const c0=await p.evaluate(()=>{ const c=window.__hs.cashState(); return {left:c.cotLeft,partial:c.partial.length,n:c.cotN}; }); E(c0.partial===1,'cotisation partielle non détectée');
    await p.click(`[data-act="cot-close"][data-id="${mid}"]`); await p.waitForTimeout(500); const c1=await p.evaluate(()=>{ const h=window.__hs; const c=h.cashState(); return {left:c.cotLeft,partial:c.partial.length,n:c.cotN,g:h.editionAuto('2026-10').gestion.join(' ')}; });
    E(c1.partial===0&&Math.abs(c0.left-c1.left-140)<0.01&&c1.n===c0.n,'« Clore » : le reste (140 €) doit sortir des cotisations à rentrer, '+JSON.stringify([c0,c1])); E(/à recouvrer \(/.test(c1.g)&&!/Merci/.test(c1.g),'ligne des participations : '+c1.g);
    E(/close à ce montant/.test(await p.textContent('#main')),'la ligne ne dit pas que la cotisation est close'); await p.waitForTimeout(450); await p.click(`[data-act="cot-close"][data-id="${mid}"]`); await p.waitForTimeout(500);
    E(await p.evaluate(()=>window.__hs.cashState().partial.length)===1,'« Rouvrir » ne rétablit pas le montant attendu'); }
  console.log('errors',errs); await b.close(); if(errs.length) process.exit(1); })().catch(e=>{ console.error(e); process.exit(1); });
