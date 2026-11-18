// Match à 100 : formule conseillée selon les présents, chrono de temps de jeu, cinq à chaque quart-temps, collective, passage en cours de séance
const { chromium } = require('playwright'); const APP=process.env.APP||'src/app.html';
(async()=>{
  const b=await chromium.launch({...(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{})}); const p=await b.newPage({viewport:{width:400,height:900}});
  let html=require('fs').readFileSync(APP,'utf8'); html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+html+'</body></html>';
  const errs=[], E=(c,m)=>{ if(!c) errs.push(m); }; p.on('pageerror',e=>errs.push(e.message));
  await p.setContent(html,{waitUntil:'load'}); await p.waitForTimeout(400);
  await p.click('[data-go="players"]'); await p.click('[data-act="import-players"]'); await p.fill('#impTxt',Array.from({length:18},(_,i)=>'J'+(i+1)).join('\n')); await p.click('[data-act="import-confirm"]'); await p.waitForTimeout(200);
  const setup=async n=>{ await p.click('[data-go="home"]'); await p.click('[data-act="new-session"]'); await p.waitForTimeout(100); for(let i=0;i<n;i++){ await (await p.$$('[data-act="toggle-present"]'))[i].click(); } await p.click('[data-act="setup-step"][data-id="2"]'); await p.waitForTimeout(100); };
  // 13 présents : match à 100 conseillé et choisi d'office
  await setup(13);
  E(await p.$eval('.fmtc.on',e=>e.dataset.id)==='cent','13 présents : match à 100 non choisi d\'office');
  E(/conseillé · 13 présents/.test(await p.$eval('.fmtc[data-id="cent"]',e=>e.innerText)),'pastille « conseillé » absente');
  await p.click('[data-act="auto-teams"]'); await p.waitForTimeout(100);
  await p.click('[data-act="setup-step"][data-id="3"]'); await p.waitForTimeout(150);
  E(await p.$eval('.lvpick .lvb.on',e=>e.dataset.id).catch(()=>'absent')==='0','niveau de saisie : « Simple » doit être choisi par défaut');
  await p.click('.lvpick [data-act="rich-lvl"][data-id="1"]'); await p.waitForTimeout(450); E(await p.$eval('.lvpick .lvb.on',e=>e.dataset.id).catch(()=>'absent')==='1','niveau de saisie : le choix « Tirs » ne s\'affiche pas');
  await p.click('[data-act="start-session"]'); await p.waitForTimeout(300);
  E(await p.evaluate(()=>{ const s=window.__hs.curSession(); return s.rich===true&&s.richReb===false; }),'la séance lancée au niveau Tirs doit porter rich sans rebonds');
  E(!!(await p.$('[data-act="five-ok"][data-run="1"]')),'cinq de départ non proposé au lancement');
  await p.click('[data-act="five-ok"][data-run="1"]'); await p.waitForTimeout(1300);
  const c1=await p.$eval('#clock',e=>e.textContent); E(c1!=='00:00'&&/^\d\d:\d\d$/.test(c1),'chrono qui ne tourne pas : '+c1);
  // fautes : toast collective à la 5e, bonus continu à partir de la 6e
  const r=await p.evaluate(()=>{ const h=window.__hs; const s=Object.values(h.S.sessions).find(x=>x.status==='live'); const m=s.matches[s.matches.length-1]; const t=m.home; const pid=m.lineup[t][0];
    for(let i=0;i<5;i++) h.addEvent(s,m,{type:'foul',pid,team:t}); const t5=document.body.innerText.includes('Collective');
    h.addEvent(s,m,{type:'foul',pid,team:t}); const b6=!!h.matchState(m,s).bonus[t]; h.addEvent(s,m,{type:'foul',pid,team:t}); const b7=!!h.matchState(m,s).bonus[t];
    // score jusqu'à 25 : fin du QT1, cinq de départ pour le QT2
    const o=m.away; for(let i=0;i<13;i++) h.addEvent(s,m,{type:'pt',v:2,pid:m.lineup[o][0],team:o});
    const q2=s.matches[s.matches.length-1]; return {t5,b6,b7,q:q2.quarter,tgt:q2.target,sheet:h.S.sheet&&h.S.sheet.type,min:Object.values(h.sessionStats(s).pl).some(x=>x.min>0)}; });
  await p.evaluate(()=>window.__hs.render()); await p.waitForTimeout(100);
  E(r.b6&&r.b7,'bonus 2 LF absent à la 6e/7e faute'); E(r.q===2&&r.tgt===50,'QT2 non lancé à 25 points'); E(r.sheet==='five','pas de cinq de départ au QT2'); E(r.min,'aucune minute comptée en match à 100');
  // 17 présents : rotation conseillée
  await p.evaluate(()=>{ const h=window.__hs; const s=Object.values(h.S.sessions).find(x=>x.status==='live'); s.status='closed'; h.saveSession(s); h.S.sheet=null; h.render(); });
  await setup(17); E(await p.$eval('.fmtc.on',e=>e.dataset.id)==='rotation','17 présents : rotation non choisie');
  // séance lancée en rotation avec 2 équipes, puis passée en match à 100
  await p.click('[data-act="fmt"][data-id="rotation"]'); await p.waitForTimeout(80);
  const conv=await p.evaluate(()=>{ const h=window.__hs; const st=h.S.setup; st.nteams=2; const ids=st.present; ['A','B','C','D'].forEach(t=>{ if(st.teams[t]) st.teams[t].players=[]; }); ids.forEach((id,i)=>st.teams[i%2?'B':'A'].players.push(id)); h.render(); return st.teams.A.players.length; });
  await p.click('[data-act="setup-step"][data-id="3"]'); await p.click('[data-act="start-session"]'); await p.waitForTimeout(300); await p.click('[data-act="five-ok"][data-run="1"]').catch(()=>{});
  const res=await p.evaluate(()=>{ const h=window.__hs; const s=Object.values(h.S.sessions).find(x=>x.status==='live'); const m=s.matches[0];
    for(let i=0;i<6;i++) h.addEvent(s,m,{type:'pt',v:2,pid:m.lineup[m.home][0],team:m.home}); h.endMatch(s,m,m.home); h.startMatch(s,'A','B'); const m2=s.matches[1]; h.addEvent(s,m2,{type:'pt',v:3,pid:m2.lineup.B[0],team:'B'});
    h.S.sheet={type:'livemore'}; h.render(); const btn=!!document.querySelector('[data-act="to-cent"]'); window.confirm=()=>true; document.querySelector('[data-act="to-cent"]').click();
    const lv=s.matches[1]; return {btn,fmt:s.format,q1:s.matches[0].quarter,q2:lv.quarter,cum:lv.cum,tgt:lv.target,rule:lv.foulRule,board:document.querySelector('.board').innerText}; });
  E(res.btn,'bouton « passer en match à 100 » absent'); E(res.fmt==='cent'&&res.q1===1&&res.q2===2&&res.tgt===50&&res.rule==='continuous','conversion incorrecte '+JSON.stringify(res));
  E((res.cum.A||0)+(res.cum.B||0)===12,'cumul après conversion faux '+JSON.stringify(res.cum)); E(/QT 2\/4/.test(res.board),'tableau non converti');
  console.log('conv',conv,JSON.stringify({...res,board:undefined}),'errors',errs); await b.close(); process.exit(errs.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
