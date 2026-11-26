// Participations non réglées : un mois après le plus ancien impayé (au plus tôt à partir du 22/11/2026) et après relance du bureau, l'inscription est bloquée. Tout se lève au paiement.
const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({viewport:{width:420,height:900},serviceWorkers:'block'});
  const fake=fs.readFileSync('tests/fake-firebase.js','utf8');
  await ctx.route(/gstatic\.com\/firebasejs\//, r=>r.fulfill({contentType:'application/javascript',body:'/* noop */'}));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat/, r=>r.fulfill({contentType:'application/javascript',body:fake}));
  // horloge réglable depuis le test : window.__day('2026-12-10')
  await ctx.addInitScript(()=>{ const RD=Date; let off=new RD('2026-12-10T15:00:00').getTime()-RD.now(); class D extends RD{ constructor(...a){ if(a.length) super(...a); else super(RD.now()+off); } static now(){ return RD.now()+off; } } window.Date=D; window.__day=d=>{ off=new RD(d+'T15:00:00').getTime()-RD.now(); }; });
  await ctx.addInitScript(()=>{ window.__sh=[]; Object.defineProperty(navigator,'share',{configurable:true,value:d=>{ window.__sh.push(d); return Promise.resolve(); }}); });
  const p=await ctx.newPage(); p.setDefaultTimeout(8000); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept()); const E=(c,m)=>{ if(!c) errs.push(m); };
  await p.goto('http://127.0.0.1:8099/index.html'); await p.waitForTimeout(800);
  await p.click('[data-act="show-login"]',{timeout:1500}).catch(()=>{}); await p.waitForTimeout(150); await p.fill('#fbEmail','claude.test@example.org'); await p.fill('#fbPass','x'); await p.click('[data-act="fb-login"]'); await p.waitForTimeout(500);
  await p.setInputFiles('#impFile','tests/fixture-export.json'); await p.fill('#bureauEmails','claude.test@example.org'); await p.click('[data-act="fb-import"]'); await p.waitForTimeout(1500);
  // le calcul d'un mois
  const am=await p.evaluate(()=>['2026-11-22','2026-12-05','2027-01-31','2026-12-31'].map(window.__hs.addMonth)); E(JSON.stringify(am)===JSON.stringify(['2026-12-22','2027-01-05','2027-02-28','2027-01-31']),'un mois plus tard : '+JSON.stringify(am));
  // jeu d'essai : des impayés d'octobre, donc antérieurs à la règle → le mois court à partir du 22/11
  const d0=await p.evaluate(()=>Object.values(window.__hs.duesAll())); E(d0.length>0,'jeu d\'essai sans impayé : le test ne vérifie rien'); const who=d0[0].pid;
  E(d0.every(x=>x.limit==='2026-12-22'&&!x.late&&!x.blocked),'10/12 : impayés d\'avant la règle, échéance attendue le 22/12, personne en retard : '+JSON.stringify(d0));
  // 22/12 : dernier jour, pas encore en retard. 23/12 : en retard, mais sans relance pas de blocage
  await p.evaluate(()=>window.__day('2026-12-22')); E(await p.evaluate(()=>Object.values(window.__hs.duesAll()).every(x=>!x.late)),'22/12 : le mois n\'est pas encore dépassé');
  await p.evaluate(()=>window.__day('2026-12-24')); const d1=await p.evaluate(()=>Object.values(window.__hs.duesAll())); E(d1.every(x=>x.late&&!x.reminded&&!x.blocked),'24/12 sans relance : en retard mais pas bloqué : '+JSON.stringify(d1));
  await p.click('[data-go="home"]'); await p.waitForTimeout(300); E(await p.$('#duesLate')&&!(await p.$('#duesBlocked')),'accueil bureau : attendu « relance à faire », pas de blocage');
  // une relance annulée (partage abandonné) n'est pas notée
  await p.evaluate(()=>{ Object.defineProperty(navigator,'share',{configurable:true,value:()=>Promise.reject(Object.assign(new Error('x'),{name:'AbortError'}))}); const h=window.__hs; h.S.sheet={type:'mpoint',ym:'2026-12'}; h.render(); }); await p.waitForSelector('#mpSheet'); await p.click(`#mpSheet [data-act="mp-remind"][data-id="${who}"]`); await p.waitForTimeout(300);
  E(await p.evaluate(w=>!window.__hs.duesAll()[w].reminded,who),'une relance abandonnée ne doit pas être notée');
  // la relance part : le joueur est bloqué
  await p.evaluate(()=>{ Object.defineProperty(navigator,'share',{configurable:true,value:d=>{ window.__sh.push(d); return Promise.resolve(); }}); }); await p.waitForTimeout(450); await p.click(`#mpSheet [data-act="mp-remind"][data-id="${who}"]`); await p.waitForTimeout(400);
  const d2=await p.evaluate(w=>window.__hs.duesAll()[w],who); E(d2.reminded&&d2.blocked&&d2.remindDay==='2026-12-24','après relance : bloqué attendu : '+JSON.stringify(d2)); E(/Inscription bloquée/.test(await p.textContent('#mpSheet')),'la feuille du point doit indiquer le blocage');
  E(await p.evaluate(()=>{ const r=(window.__hs.S.treasury.dues||{}).remind||{}; const x=Object.values(r)[0]; return !!x&&!!x.at&&!!x.by; }),'la relance doit être horodatée et nominative');
  await p.evaluate(()=>{ window.__hs.S.sheet=null; window.__hs.render(); }); await p.click('[data-go="home"]'); await p.waitForTimeout(300); const al=await p.textContent('#duesBlocked').catch(()=>''); const nm=await p.evaluate(w=>window.__hs.S.players[w].name,who); E(al.includes(nm),'accueil bureau : le nom du joueur bloqué doit apparaître : '+al);
  // inscription impossible à la préparation
  await p.evaluate(()=>{ const h=window.__hs; Object.keys(h.S.sessions).forEach(id=>{ if(h.S.sessions[id].status==='setup') delete h.S.sessions[id]; }); h.render(); }); await p.click('[data-act="new-session"]'); await p.waitForSelector('[data-act="toggle-present"]');
  await p.click(`[data-act="toggle-present"][data-id="${who}"]`); await p.waitForTimeout(250); E(await p.evaluate(w=>!window.__hs.S.setup.present.includes(w),who),'un joueur bloqué ne doit pas pouvoir être inscrit'); E(/inscription bloquée/.test(await p.textContent('.toast').catch(()=>'')),'le message doit dire pourquoi');
  const other=d1.find(x=>x.pid!==who); if(other){ await p.waitForTimeout(450); await p.click(`[data-act="toggle-present"][data-id="${other.pid}"]`); await p.waitForTimeout(250); E(await p.evaluate(w=>window.__hs.S.setup.present.includes(w),other.pid),'sans relance, un joueur en retard reste inscriptible'); }
  // le fait du mois, sans nom
  const facts=await p.evaluate(()=>window.__hs.editionAuto('2026-12').facts.join(' | ')); E(/1 inscription bloquée pour participations non réglées/.test(facts)&&!facts.includes(nm),'fait du mois attendu sans nom : '+facts);
  // il paye : tout se lève
  await p.evaluate(w=>{ const h=window.__hs; h.duesAll()[w]; h.S.sheet={type:'mpoint',ym:'2026-12'}; h.S.view='home'; h.S.setup=null; h.render(); },who); await p.waitForSelector('#mpSheet'); await p.click(`#mpSheet [data-act="mp-paid"][data-id="${who}"]`); await p.waitForTimeout(500);
  E(await p.evaluate(w=>!window.__hs.duesAll()[w],who),'après paiement, plus aucun blocage');
  // un membre non connecté au bureau ne voit rien
  E(await p.evaluate(()=>{ const h=window.__hs; const u=h.S.unlocked; h.S.unlocked=false; const n=Object.keys(h.duesAll()).length, a=h.duesAlert(); h.S.unlocked=u; return n===0&&a===''; }),'hors bureau : aucune alerte, aucun nom');
  console.log('errors',errs); await b.close(); process.exit(errs.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
