// Nouvelles fonctions "vie de l'asso" : liste WhatsApp, doublons, check-list de clôture, sauvegarde auto,
// prochaine séance, fiche partageable (?joueur=), point d'équilibre, image de bilan de saison.
// Prérequis : python3 -m http.server 8099 à la racine du dépôt.
const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({viewport:{width:420,height:900},serviceWorkers:'block',acceptDownloads:true});
  const fake=fs.readFileSync('tests/fake-firebase.js','utf8');
  await ctx.route(/gstatic\.com\/firebasejs\//, r=>r.fulfill({contentType:'application/javascript',body:'/* noop */'}));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat/, r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.route(/fonts\.googleapis|fonts\.gstatic/, r=>r.fulfill({contentType:'text/css',body:''}));
  const p=await ctx.newPage(); p.setDefaultTimeout(8000); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  const E=(c,m)=>{ if(!c) errs.push(m); };
  await p.goto('http://127.0.0.1:8099/index.html'); await p.waitForTimeout(800);
  await p.fill('#fbEmail','w.simbnag@gmail.com'); await p.fill('#fbPass','x'); await p.click('[data-act="fb-login"]'); await p.waitForTimeout(500);
  await p.setInputFiles('#impFile','tests/fixture-export.json'); await p.fill('#bureauEmails','w.simbnag@gmail.com'); await p.click('[data-act="fb-import"]'); await p.waitForTimeout(1500);
  const names=await p.evaluate(()=>Object.values(window.__hs.S.players).filter(p=>p.active!==false).map(p=>p.name));
  console.log('joueurs', names.length, names.slice(0,5));

  // ---- 1. prochaine séance (auto = prochain dimanche) ----
  const nextTxt=await p.evaluate(()=>{ const c=document.querySelector('#nextCard'); return c&&c.innerText; }); console.log('next card:', (nextTxt||'').replace(/\n/g,' | ').slice(0,120));
  E(nextTxt&&/Prochaine séance/.test(nextTxt),'carte prochaine séance absente');
  // bureau édite : annulée
  await p.click('[data-act="next-edit"]'); await p.waitForTimeout(300); E(!!(await p.$('#nxDate')),'formulaire prochaine séance absent');
  const nextSunday=await p.evaluate(()=>{ const d=new Date(); d.setDate(d.getDate()+((7-d.getDay())%7)); return d.toISOString().slice(0,10); });
  await p.fill('#nxDate',nextSunday); await p.selectOption('#nxStatus','cancelled'); await p.fill('#nxNote','Gymnase fermé'); await p.click('[data-act="next-save"]'); await p.waitForTimeout(400);
  const nextTxt2=await p.evaluate(()=>{ const c=document.querySelector('#nextCard'); return c&&c.innerText; }); E(/Annulée/.test(nextTxt2||'')&&/Gymnase fermé/.test(nextTxt2||''),'annulation non affichée: '+nextTxt2);
  // retour à confirmée pour la suite
  await p.click('[data-act="next-edit"]'); await p.waitForTimeout(300); await p.selectOption('#nxStatus','ok'); await p.fill('#nxNote',''); await p.click('[data-act="next-save"]'); await p.waitForTimeout(300);

  // ---- 2. alerte sauvegarde en retard, puis export manuel qui la lève ----
  let home=await p.evaluate(()=>document.body.innerText); E(/Sauvegarde JSON en retard/.test(home),'alerte sauvegarde absente');
  const dl1=p.waitForEvent('download',{timeout:5000}).catch(()=>null); await p.click('[data-act="fb-export"]'); const d1=await dl1; await p.waitForTimeout(500); console.log('export manuel ->', d1&&d1.suggestedFilename());
  home=await p.evaluate(()=>document.body.innerText); E(!/Sauvegarde JSON en retard/.test(home),'alerte sauvegarde toujours là après export');

  // ---- 3. liste WhatsApp ----
  await p.click('[data-act="new-session"]'); await p.waitForTimeout(300);
  // roster réaliste ajouté pour tester le rapprochement (prénom + initiale, surnom, ancien nom)
  await p.evaluate(()=>{ const S=window.__hs.S; const add=(id,name,extra)=>{ window.__hs.savePlayer({id,name,member:false,active:true,createdAt:Date.now(),...(extra||{})}); }; add('t_wk','Wilfried K.',{aliases:['Wil FK']}); add('t_lk','Lionel Henri K.'); add('t_lm','Lionel M.',{nick:'Libou'}); add('t_gs','Gilles S.'); add('t_bl','Blériot'); add('t_js','James D.'); });
  const logic=await p.evaluate(()=>['Wilfried K ✅','1. Wil FK','Libou','lionel m','Lionel','Gilles','Blériot (payé)','blériot','james d','Liste dimanche 11h','Karen Z'].map(x=>{ const r=window.__hs.matchPasteName(x.replace(/^\d+\.\s*/,'')); return x+' => '+r.kind+(r.pid?':'+window.__hs.pname(r.pid):'')+(r.cands?':'+r.cands.length:''); }));
  console.log(logic);
  const want=['ok:Wilfried K.','ok:Wilfried K.','ok:Lionel M.','ok:Lionel M.','ambiguous:2','ok:Gilles S.','ok:Blériot','ok:Blériot','ok:James D.','header','unknown:0'];
  logic.forEach((l,i)=>{ const got=l.split(' => ')[1]; E(got===want[i],'rapprochement '+l+' (attendu '+want[i]+')'); });
  const pick=names.slice(0,8);
  const wa=['Liste dimanche 11h Hoops Factory','1. '+pick[0]+' ✅','2- '+pick[1],'3) '+pick[2].toLowerCase()+' (payé)','4. Libou','5. '+pick[4]+' ✅','6. '+pick[4],'7. Zébulon Inconnu','8. Wil FK','Extras : '].join('\n');
  await p.click('[data-act="paste-list"]'); await p.waitForTimeout(300); await p.fill('#pasteTxt',wa); await p.click('[data-act="paste-parse"]'); await p.waitForTimeout(300);
  const rows=await p.evaluate(()=>window.__hs.S.sheet.rows.map(r=>r.kind+':'+r.raw.slice(0,18)+(r.pid?'->'+window.__hs.pname(r.pid):''))); console.log('lecture', rows);
  const kinds=await p.evaluate(()=>window.__hs.S.sheet.rows.map(r=>r.kind));
  E(kinds[0]==='header','ligne 1 (en-tête) non ignorée: '+kinds[0]); E(kinds[1]==='ok'&&kinds[2]==='ok'&&kinds[3]==='ok'&&kinds[4]==='ok'&&kinds[5]==='ok'&&kinds[8]==='ok','noms non reconnus: '+kinds.join(','));
  E(kinds[6]==='dup','doublon non détecté'); E(kinds[7]==='unknown','inconnu non détecté'); E(kinds[9]==='header','"Extras :" non ignoré');
  await p.selectOption('[data-paste-i="7"]','__new'); await p.click('[data-act="paste-apply"]'); await p.waitForTimeout(400);
  const present=await p.evaluate(()=>window.__hs.S.setup.present.map(window.__hs.pname)); console.log('présents', present);
  E(present.includes(pick[0])&&present.includes(pick[1])&&present.includes(pick[2])&&present.includes('Lionel M.')&&present.includes(pick[4])&&present.includes('Wilfried K.'),'présents manquants');
  E(present.includes('Zébulon Inconnu'),'nouveau joueur non créé'); E(present.filter(x=>x===pick[4]).length===1,'présent en double');
  const first=n=>n.split(' ')[0];

  // ---- 4. doublon à la création ----
  await p.fill('#pq','Wilfried'); await p.click('[data-act="add-player-inline"]'); await p.waitForTimeout(300);
  E(!!(await p.$('#dupeWarn')),'avertissement doublon absent (inline)');
  await p.click('[data-act="sheet-close"] button[data-act="sheet-close"]').catch(()=>{}); await p.evaluate(()=>{ window.__hs.S.sheet=null; window.__hs.render(); }); await p.waitForTimeout(200);
  await p.evaluate(()=>{ window.__hs.S.setup.q=''; window.__hs.S.sheet={type:'pedit'}; window.__hs.render(); }); await p.waitForTimeout(320);
  await p.fill('#pename','GILLES S'); await p.click('[data-act="save-player"]'); await p.waitForTimeout(300);
  E(!!(await p.$('#dupeWarn')),'avertissement doublon absent (fiche)');
  const nBefore=await p.evaluate(()=>Object.keys(window.__hs.S.players).length);
  await p.click('[data-act="save-player"][data-force="1"]'); await p.waitForTimeout(300);
  const nAfter=await p.evaluate(()=>Object.keys(window.__hs.S.players).length); E(nAfter===nBefore+1,'création forcée échouée');
  // nom vraiment nouveau : pas d'avertissement
  await p.evaluate(()=>{ window.__hs.S.sheet={type:'pedit'}; window.__hs.render(); }); await p.waitForTimeout(320); await p.fill('#pename','Xq Wz'); await p.click('[data-act="save-player"]'); await p.waitForTimeout(300);
  E(!(await p.$('#dupeWarn'))&&!(await p.$('#pename')),'faux positif doublon');

  // ---- 5. check-list de clôture ----
  await p.evaluate(()=>{ const S=window.__hs.S; const ids=Object.keys(S.players).filter(id=>!id.startsWith('t_')); S.setup.present=ids.slice(0,9); window.__hs.render(); }); await p.waitForTimeout(200); await p.click('[data-act="setup-step"][data-id="2"]'); await p.waitForTimeout(200); await p.click('[data-act="auto-teams"]'); await p.click('[data-act="setup-step"][data-id="3"]'); await p.waitForTimeout(200); await p.click('[data-act="start-session"]'); await p.waitForTimeout(500);
  const sm=await p.$('[data-act="start-match"]'); if(sm){ await sm.click(); await p.waitForTimeout(300); }
  // un panier puis fin de match
  for(let i=0;i<6;i++){ const q=await p.$$('.prow:not(.bench) [data-q="pt2"]'); await q[0].click(); await p.waitForTimeout(380); await p.click('[data-act="ast-pick"][data-id=""]',{timeout:800}).catch(()=>{}); await p.waitForTimeout(120); const win=await p.$('[data-win]'); if(win){ await win.click(); await p.waitForTimeout(300); break; } }
  E(!!(await p.$('[data-act="close-session"]')),'match non terminé (pas de bouton clôturer)');
  await p.click('[data-act="close-session"]'); await p.waitForTimeout(300);
  const chk=await p.evaluate(()=>{ const c=document.querySelector('#closeCheck'); return c&&c.innerText; }); console.log('check-list:', (chk||'').replace(/\n/g,' | '));
  E(chk&&/5 majeur/.test(chk)&&/Participations/.test(chk)&&/sauvegarde JSON/i.test(chk),'check-list incomplète');
  E(/Clôturer quand même/.test(await p.evaluate(()=>document.querySelector('.sheet').innerText)),'bouton clôturer quand même absent');
  const dl2=p.waitForEvent('download',{timeout:6000}).catch(()=>null); await p.click('[data-act="close-session-confirm"]'); const d2=await dl2; await p.waitForTimeout(800);
  console.log('sauvegarde auto ->', d2&&d2.suggestedFilename()); E(!!d2&&/hba-sauvegarde-/.test(d2.suggestedFilename()),'sauvegarde auto non téléchargée');
  const lb=await p.evaluate(()=>window.__hs.S.config.lastBackupAt); E(!!lb,'lastBackupAt non enregistré');

  // ---- 6. point d'équilibre ----
  await p.click('[data-go="bureau"]'); await p.waitForTimeout(200); await p.click('[data-bureau-seg="treasury"]'); await p.waitForTimeout(300);
  const be=await p.evaluate(()=>{ const c=document.querySelector('#projCard'); return c&&c.innerText; }); console.log('équilibre:', (be||'').replace(/\n/g,' | ').slice(0,200));
  E(be&&/Participations \/ séance/i.test(be)&&/Excédent prévu/i.test(be),'carte point d\'équilibre absente');

  // ---- 7. image bilan de saison ----
  await p.click('[data-go="stats"]'); await p.waitForTimeout(300); await p.click('[data-period="season"]').catch(()=>{}); await p.waitForTimeout(300); await p.click('[data-stats-seg="top"]').catch(()=>{}); await p.waitForTimeout(300);
  const si=await p.$('[data-act="season-img"]'); E(!!si,'bouton image bilan absent'); if(si){ await si.click(); await p.waitForTimeout(1500); const img=await p.$('#seasonImg img'); E(!!img,'image bilan non générée'); if(img){ const sz=await img.evaluate(i=>[i.naturalWidth,i.naturalHeight]); console.log('bilan image', sz); E(sz[0]===1080&&sz[1]>600,'image bilan vide'); await p.screenshot({path:'out/season_img.png',fullPage:false}); } }

  // ---- 8. fiche partageable ----
  const pid=await p.evaluate(()=>Object.keys(window.__hs.S.players)[0]);
  await p.evaluate(id=>{ window.__hs.S.sheet={type:'detail',pid:id}; window.__hs.render(); },pid); await p.waitForTimeout(320);
  E(!!(await p.$('[data-act="player-share"]')),'bouton partager absent');
  await p.evaluate(()=>{ window.__copied=null; navigator.clipboard.writeText=async t=>{ window.__copied=t; }; delete navigator.share; });
  await p.click('[data-act="player-share"]'); await p.waitForTimeout(300); const copied=await p.evaluate(()=>window.__copied); console.log('lien copié', copied); E(copied&&copied.includes('?joueur='+pid),'lien de fiche incorrect');
  const p2=await ctx.newPage(); p2.on('pageerror',e=>errs.push('p2 '+e.message)); await p2.goto('http://127.0.0.1:8099/index.html?joueur='+pid); await p2.waitForTimeout(1500);
  const sheetTxt=await p2.evaluate(()=>{ const s=document.querySelector('.sheet'); return s&&s.innerText.slice(0,80); }); console.log('ouverture ?joueur= ->', sheetTxt);
  E(sheetTxt&&sheetTxt.includes(await p.evaluate(id=>window.__hs.pname(id),pid)),'fiche non ouverte via ?joueur=');
  console.log('errors',errs); await b.close(); process.exit(errs.length?1:0);
})().catch(e=>{ console.error(String(e).slice(0,600)); process.exit(1); });
