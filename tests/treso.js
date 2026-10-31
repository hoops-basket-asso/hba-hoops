// Trésorerie : caisse, pack 40 dimanches + offerts, projection, enveloppes, mouvements.
const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({viewport:{width:420,height:900},deviceScaleFactor:2,serviceWorkers:'block'});
  const fake=fs.readFileSync('tests/fake-firebase.js','utf8');
  await ctx.route(/gstatic\.com\/firebasejs\//, r=>r.fulfill({contentType:'application/javascript',body:'/* noop */'}));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat/, r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.route(/fonts\.googleapis|fonts\.gstatic/, r=>r.fulfill({contentType:'text/css',body:''}));
  const p=await ctx.newPage(); p.setDefaultTimeout(8000); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  const E=(c,m)=>{ if(!c) errs.push(m); };
  await p.goto('http://127.0.0.1:8099/index.html'); await p.waitForTimeout(800);
  await p.fill('#fbEmail','w.simbnag@gmail.com'); await p.fill('#fbPass','x'); await p.click('[data-act="fb-login"]'); await p.waitForTimeout(500);
  await p.setInputFiles('#impFile','tests/fixture-export.json'); await p.fill('#bureauEmails','w.simbnag@gmail.com'); await p.click('[data-act="fb-import"]'); await p.waitForTimeout(1500);
  await p.click('[data-go="bureau"]'); await p.waitForTimeout(200); await p.click('[data-bureau-seg="treasury"]'); await p.waitForTimeout(300);
  const txt=async()=>p.evaluate(()=>document.querySelector('#main').innerText);
  let t=await txt(); E(/La caisse/.test(t)&&/Le pack d'heures/.test(t)&&/Projection fin de saison/.test(t)&&/Mouvements/.test(t),'cartes manquantes');
  const cs0=await p.evaluate(()=>window.__hs.cashState()); console.log('caisse init', cs0.balance, 'cot', cs0.cotEur, 'part', cs0.partEur, 'packDue', cs0.packDue);
  // solde de départ
  await p.click('[data-act="opening-edit"]'); await p.waitForTimeout(300); await p.fill('#opDate','2026-09-22'); await p.fill('#opAmt','871,97'); await p.click('[data-act="opening-save"]'); await p.waitForTimeout(400);
  // mouvement : 1er virement Hoops
  await p.fill('#lgDate','2026-10-15'); await p.fill('#lgAmt','4500'); await p.fill('#lgLabel','1er virement Hoops Factory (60 %)'); await p.selectOption('#lgCat','pack_out'); await p.click('[data-act="ledger-add"]'); await p.waitForTimeout(400);
  const cs=await p.evaluate(()=>window.__hs.cashState()); console.log('caisse', cs);
  E(Math.abs(cs.balance-(871.97+cs.cotEur+cs.partEur-4500))<0.01,'solde faux: '+cs.balance); E(cs.packDue===3000,'reste dû faux: '+cs.packDue); E(cs.packPaid===4500,'pack payé faux');
  t=await txt(); E(/Reste à payer au Hoops/i.test(t)&&/3.000.€/.test(t),'reste dû non affiché');
  // persistance via fake db
  const saved=await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('fakefs')); return d.treasury&&d.treasury.ledger; }); E(saved&&saved.items&&saved.items.length===1&&saved.opening&&saved.opening.amt===871.97,'ledger non persisté');
  // suppression
  await p.click('[data-act="ledger-del"]'); await p.waitForTimeout(300); const cs2=await p.evaluate(()=>window.__hs.cashState()); E(cs2.packPaid===0,'suppression mouvement échouée');
  await p.fill('#lgDate','2026-10-15'); await p.fill('#lgAmt','4 500'); await p.fill('#lgLabel','1er virement Hoops Factory'); await p.selectOption('#lgCat','pack_out'); await p.click('[data-act="ledger-add"]'); await p.waitForTimeout(300);
  // enveloppes
  await p.click('[data-act="budget-edit"]'); await p.waitForTimeout(300); await p.fill('#bbBbq','1500'); await p.fill('#bbMem','600'); await p.fill('#bbEq','150'); await p.click('[data-act="budget-save"]'); await p.waitForTimeout(400);
  t=await txt(); E(/BBQ d'été/.test(t)&&/900 €/.test(t),'enveloppe BBQ nette (900) absente'); E(/Apport au pack/.test(t),'enveloppe pack N+1 absente');
  // pack 40 dimanches + offerts : marquer 42 dimanches tenus dans le calendrier
  await p.evaluate(()=>{ const S=window.__hs.S; const pk={...(S.treasury.pack||{}),hours:80,cost:7500,weeks:50}; S.treasury.pack=pk; });
  const sund=await p.evaluate(()=>window.__hs.sundays()); console.log('dimanches saison', sund.length, sund[0], sund[sund.length-1]);
  await p.evaluate(sund=>{ const days={}; sund.slice(0,43).forEach((d,i)=>{ days[d]={h:2,at:d}; }); window.__hs.saveCalendar(days); },sund); await p.waitForTimeout(300);
  const hu=await p.evaluate(()=>window.__hs.hoursUsed()); console.log('heures', {used:hu.used,packDays:hu.packDays,offered:hu.offered,held:hu.held});
  E(hu.packDays===40&&hu.offered===3&&hu.used===80,'comptage pack/offerts faux: '+JSON.stringify({used:hu.used,packDays:hu.packDays,offered:hu.offered}));
  t=await txt(); E(/3 offerts par le Hoops/.test(t),'offerts non affichés');
  // dimanche offert manuel au milieu de la saison
  await p.evaluate(sund=>{ const days={}; sund.slice(0,10).forEach(d=>{ days[d]={h:2,at:d}; }); days[sund[5]]={h:2,free:true,at:sund[5]}; window.__hs.saveCalendar(days); },sund); await p.waitForTimeout(300);
  const hu2=await p.evaluate(()=>window.__hs.hoursUsed()); E(hu2.packDays===9&&hu2.offered===1&&hu2.used===18,'offert manuel non compté: '+JSON.stringify({used:hu2.used,packDays:hu2.packDays,offered:hu2.offered}));
  // calendrier : cycle tenue → +1h → offert → pas de séance → à venir
  await p.click('[data-tre-seg="cal"]'); await p.waitForTimeout(300); const d0=sund[12]; const st=async()=>p.evaluate(d=>{ const i=window.__hs.dayInfo(d); return i?(i.h===0?'off':i.free?'free':i.h>2?'extra':'held'):'todo'; },d0);
  const seq=[await st()]; for(let i=0;i<5;i++){ await p.click(`[data-act="cal-cycle"][data-id="${d0}"]`).catch(()=>{}); await p.waitForTimeout(150); seq.push(await st()); } console.log('cycle', seq.join(' → '));
  E(seq.join(',')==='todo,held,extra,free,off,todo','cycle calendrier faux');
  await p.click('[data-tre-seg="over"]'); await p.waitForTimeout(300); await p.screenshot({path:'out/treso_over.png',fullPage:true});
  console.log('errors',errs); await b.close(); process.exit(errs.length?1:0);
})().catch(e=>{ console.error(String(e).slice(0,600)); process.exit(1); });
