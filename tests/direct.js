// Le direct (direct.html) : rediffusion accélérée du jeu d'essai du 22/11. Vérifie que la page tourne sans erreur et que le score affiché suit les actions.
const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:390,height:844}}); await ctx.route(/gstatic\.com\/firebasejs/, r=>r.fulfill({contentType:'application/javascript',body:'/* noop */'}));
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8099/direct.html?src=tests/fixture-2211.json&vitesse=200'); await p.waitForTimeout(1200);
  if(!(await p.$('#board'))) errs.push('tableau de score absent');
  // on attend la fin du 1er match : écran de victoire, score final 8–7 pour l'équipe à l'extérieur
  await p.waitForSelector('#stage .endc',{timeout:40000}).catch(()=>errs.push('écran de fin de match jamais affiché'));
  const t=await p.textContent('#stage').catch(()=>'' ); if(!/Victoire/.test(t)||!/8 – 7/.test(t)||!/Meilleur marqueur/.test(t)) errs.push('écran de fin incomplet : '+t.slice(0,120));
  const r=await p.evaluate(()=>{ const D=window.__direct; return {feed:D.feed.length,lead:document.querySelectorAll('#lead .lc').length,teams:document.querySelectorAll('#teams .tp').length,done:D.st.done}; });
  if(r.feed<5||r.lead<2||r.teams!==3||r.done<1) errs.push('fil, leaders ou équipes incomplets : '+JSON.stringify(r));
  // une source hors du site est refusée
  const p2=await ctx.newPage(); await p2.goto('http://127.0.0.1:8099/direct.html?src=https://exemple.org/x.json'); await p2.waitForTimeout(800); if(await p2.$('#board')) errs.push('source externe acceptée');
  // ---- vrai direct (fausse base) : différé de 3 s, correction de la table avant affichage, clôture ----
  const fake=require('fs').readFileSync('tests/fake-firebase.js','utf8'); const c3=await b.newContext({viewport:{width:390,height:844}});
  await c3.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat/, r=>r.fulfill({contentType:'application/javascript',body:fake})); await c3.route(/gstatic\.com\/firebasejs\/.*firestore-compat/, r=>r.fulfill({contentType:'application/javascript',body:'/* noop */'}));
  await c3.addInitScript(()=>{ const t=Date.now(); const s={id:'s1',date:'2026-11-29',status:'live',format:'rotation',present:['a1','b1'],teams:{A:{name:'Noir',color:'noir',players:['a1']},B:{name:'Vert',color:'vert',players:['b1']}},matches:[{n:1,home:'A',away:'B',status:'live',running:true,createdAt:t-60000,lineup:{A:['a1'],B:['b1']},roster:{home:['a1'],away:['b1']},events:[{type:'pt',team:'A',pid:'a1',v:2,el:20000,t:t-30000}]}]};
    if(!localStorage.getItem('fakefs')) localStorage.setItem('fakefs',JSON.stringify({players:{a1:{id:'a1',name:'Alpha A.'},b1:{id:'b1',name:'Bravo B.'}},sessions:{s1:s},config:{main:{minutes:9}}})); });
  const p3=await c3.newPage(); p3.on('pageerror',e=>errs.push('direct '+e.message)); await p3.goto('http://127.0.0.1:8099/direct.html?delai=3'); await p3.waitForTimeout(1500);
  const sc=()=>p3.evaluate(()=>[...document.querySelectorAll('.tm .sc')].map(e=>e.textContent).join('-'));
  if(await sc()!=='2-0') errs.push('direct : score de départ '+await sc()); if(!/EN DIRECT/.test(await p3.textContent('#live'))) errs.push('direct : badge « en direct » absent');
  const add=ev=>p3.evaluate(ev=>{ const fs=firebase.firestore(); return fs.doc('sessions/s1').get().then(sn=>{ const s=sn.data(); if(ev==='undo') s.matches[0].events.pop(); else if(ev==='close'){ s.status='closed'; s.matches[0].status='done'; s.matches[0].endedAt=Date.now(); s.matches[0].winner='B'; } else s.matches[0].events.push({...ev,t:Date.now(),el:40000}); return fs.doc('sessions/s1').set(s); }); },ev);
  await add({type:'pt',team:'B',pid:'b1',v:3}); await p3.waitForTimeout(1200); if(await sc()!=='2-0') errs.push('direct : le panier s\'affiche sans attendre le différé');
  await p3.waitForTimeout(3300); if(await sc()!=='2-3') errs.push('direct : panier à 3 points non affiché après le différé : '+await sc()); if(!/3 points/i.test(await p3.textContent('#feed'))) errs.push('direct : fil sans le panier à 3 points');
  // une erreur corrigée par la table dans le délai ne s'affiche jamais
  await add({type:'pt',team:'A',pid:'a1',v:3}); await p3.waitForTimeout(800); await add('undo'); await p3.waitForTimeout(4200); if(await sc()!=='2-3') errs.push('direct : une saisie annulée dans le délai a été affichée : '+await sc());
  await add('close'); await p3.waitForSelector('#stage .endc',{timeout:9000}).catch(()=>errs.push('direct : pas d\'écran de fin')); await p3.waitForTimeout(6500);
  if(!/Séance terminée/.test(await p3.textContent('#stage'))) errs.push('direct : écran « séance terminée » absent : '+(await p3.textContent('#stage')).slice(0,80));
  console.log('errors',errs); await b.close(); if(errs.length) process.exit(1); })().catch(e=>{ console.error(e); process.exit(1); });
