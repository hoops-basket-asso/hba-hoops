const { chromium } = require('playwright'); const fs=require('fs'); const D='out/';
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'});
  const fake=fs.readFileSync('tests/fake-firebase.js','utf8');
  await ctx.route(/gstatic\.com\/firebasejs\//, r=>r.fulfill({contentType:'application/javascript',body:'/* noop */'}));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat/, r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.route(/fonts\.googleapis|fonts\.gstatic/, r=>r.fulfill({contentType:'text/css',body:''}));
  const p=await ctx.newPage(); p.on('dialog',d=>d.accept()); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const E=(c,m)=>{ if(!c) errs.push(m); };
  const shot=async n=>{ await p.waitForTimeout(250); await p.screenshot({path:D+n+'.png',fullPage:true}); };
  await p.goto('http://127.0.0.1:8099/index.html'); await p.waitForTimeout(800);
  // accueil joueur : formulaire replié
  E(!(await p.$('#fbEmail')),'formulaire de connexion visible par défaut'); E(!!(await p.$('[data-act="show-login"]')),'bouton Accès bureau absent'); await shot('v1_home_viewer_locked');
  await p.click('[data-act="show-login"]'); await p.waitForTimeout(200); E(!!(await p.$('#fbEmail')),'formulaire non déplié');
  await p.click('[data-act="show-login"]',{timeout:1500}).catch(()=>{}); await p.waitForTimeout(150); await p.fill('#fbEmail','w.simbnag@gmail.com'); await p.fill('#fbPass','x'); await p.click('[data-act="fb-login"]'); await p.waitForTimeout(500);
  await p.setInputFiles('#impFile','tests/fixture-export.json'); await p.fill('#bureauEmails','w.simbnag@gmail.com'); await p.click('[data-act="fb-import"]'); await p.waitForTimeout(1500);
  // séance préparée aujourd'hui → carte en tête
  await p.evaluate(()=>{ const S=window.__hs.S; const prep=Object.values(S.sessions).find(x=>x.status==='setup'); const d=new Date(); prep.date=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); window.__hs.render(); }); await p.waitForTimeout(200);
  const first=await p.evaluate(()=>document.querySelector('#main .card').innerText); E(/aujourd'hui/.test(first)&&/Former les équipes/.test(first),'carte du jour absente en tête: '+first.slice(0,60)); await shot('v2_home_bureau_today');
  // légende repliée
  await p.click('[data-go="stats"]'); await p.waitForTimeout(300); await p.click('[data-period="season"]').catch(()=>{}); await p.waitForTimeout(200);
  E(!!(await p.$('#ladList')),'classement en lignes absent'); await shot('v3_stats'); await p.click('[data-act="rank-view"]'); await p.waitForTimeout(200); E(!!(await p.$('details.legend')) && !(await p.$('details.legend[open]')),'légende non repliée'); await p.click('[data-act="rank-view"]'); await p.waitForTimeout(200);
  // vue joueur : mes stats en premier
  await p.evaluate(()=>{ const S=window.__hs.S; S.me=Object.keys(S.players)[2]; S.unlocked=false; }); await p.click('[data-go="home"]'); await p.waitForTimeout(300);
  const cards=await p.evaluate(()=>[...document.querySelectorAll('#main .card h2')].map(h=>h.innerText).slice(0,6)); console.log('cartes joueur', cards); { const i=k=>cards.findIndex(c=>k.test(c)); E(i(/Ma dernière séance/)>=0&&i(/Ma dernière séance/)<i(/votre saison/)&&i(/votre saison/)<i(/Le collectif/),'accueil joueur : ordre des cartes '+cards.join('|')); }
  { const t=await p.evaluate(()=>document.querySelector('#myLast')?document.querySelector('#myLast').innerText:''); E(/NOTE DU JOUR/i.test(t)&&/MATCHS JOUÉS/i.test(t)&&/TEMPS DE JEU/i.test(t)&&/Mon équipe du jour/.test(t),'carte Ma dernière séance incomplète'); const c=await p.evaluate(()=>document.querySelector('#collectif').innerText); E(/ladder/i.test(c)&&/leaders/i.test(c),'carte collectif incomplète'); }
  await p.click('#collectif [data-act="rules"]'); await p.waitForTimeout(250); { const t=await p.evaluate(()=>(document.querySelector('.sheet')||{}).innerText||''); E(/Comment c'est calculé/.test(t)&&/Attaque 35 %/.test(t)&&/Défense 10 %/.test(t)&&/Régularité 20 %/.test(t),'page des règles absente ou incomplète'); } await p.click('.sheet [data-act="sheet-close"]').catch(()=>{}); await p.evaluate(()=>{ window.__hs.S.sheet=null; window.__hs.render(); }); await p.waitForTimeout(150);
  await p.evaluate(()=>{ window.__hs.S.me=null; window.__hs.render(); }); await p.waitForTimeout(200); E(!!(await p.$('#meSel'))&&!(await p.$('#myLast'))&&!!(await p.$('#collectif')),'accueil sans joueur identifié'); await p.evaluate(()=>{ const S=window.__hs.S; S.me=Object.keys(S.players)[2]; window.__hs.render(); }); await p.waitForTimeout(200); await shot('v4_home_viewer_me');
  await p.evaluate(()=>{ window.__hs.S.unlocked=true; window.__hs.S.me=null; });
  // live : hauteur avant le premier joueur
  await p.click('[data-go="home"]'); await p.waitForTimeout(200); await p.click('[data-act="open-prep"]'); await p.waitForTimeout(300); await p.click('[data-act="setup-step"][data-id="2"]'); await p.click('[data-act="auto-teams"]'); await p.click('[data-act="setup-step"][data-id="3"]'); await p.waitForTimeout(200); await p.click('[data-act="start-session"]'); await p.waitForTimeout(400); await p.click('[data-act="five-ok"][data-run="1"]'); await p.waitForTimeout(300);
  const y=await p.evaluate(()=>document.querySelector('.prow .pbtn').getBoundingClientRect().top); console.log('premier joueur à', Math.round(y),'px'); E(y<520,'premier joueur trop bas: '+y);
  E(!(await p.$('.strip.last')),'bloc dernières actions affiché à vide'); E(!(await p.$('[data-act="unlaunch"]')),'annuler le lancement encore dans le flux'); E(!!(await p.$('[data-act="live-more"]')),'menu ⋯ absent');
  await p.evaluate(()=>window.scrollTo(0,0)); await p.waitForTimeout(200); await p.screenshot({path:D+'v5_live.png'});
  await p.click('[data-act="live-more"]'); await p.waitForTimeout(350); E(!!(await p.$('[data-act="unlaunch"]')),'unlaunch absent du menu'); await p.screenshot({path:D+'v6_live_more.png'}); await p.click('[data-act="unlaunch"]'); await p.waitForTimeout(400);
  E(await p.evaluate(()=>Object.values(window.__hs.S.sessions).some(x=>x.status==='setup')&&!Object.values(window.__hs.S.sessions).some(x=>x.status==='live')&&!window.__hs.S.sheet),'annulation du lancement inopérante depuis le menu');
  console.log('errors',errs); await b.close(); process.exit(errs.length?1:0);
})().catch(e=>{ console.error(String(e).slice(0,500)); process.exit(1); });
