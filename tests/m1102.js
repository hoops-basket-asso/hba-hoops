// 02/11 : bonus annulé après les lancers, cinq de départ avant chrono, arrêt du chrono sur panier en dernière minute,
// joueur du mois, cotisation en plusieurs versements.
const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({viewport:{width:420,height:900},serviceWorkers:'block'});
  const fake=fs.readFileSync('tests/fake-firebase.js','utf8');
  await ctx.route(/gstatic\.com\/firebasejs\//, r=>r.fulfill({contentType:'application/javascript',body:'/* noop */'}));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat/, r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.route(/fonts\.googleapis|fonts\.gstatic/, r=>r.fulfill({contentType:'text/css',body:''}));
  const p=await ctx.newPage(); p.setDefaultTimeout(8000); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept()); const E=(c,m)=>{ if(!c) errs.push(m); };
  await p.goto('http://127.0.0.1:8099/index.html'); await p.waitForTimeout(800);
  await p.click('[data-act="show-login"]',{timeout:1500}).catch(()=>{}); await p.waitForTimeout(150); await p.fill('#fbEmail','w.simbnag@gmail.com'); await p.fill('#fbPass','x'); await p.click('[data-act="fb-login"]'); await p.waitForTimeout(500);
  await p.setInputFiles('#impFile','tests/fixture-export.json'); await p.fill('#bureauEmails','w.simbnag@gmail.com'); await p.click('[data-act="fb-import"]'); await p.waitForTimeout(1500);

  // ---- 1. logique du bonus (matchState pur) ----
  const bonus=await p.evaluate(()=>{ const H=window.__hs; const s={format:'rotation',teams:{A:{players:['a1','a2','a3','a4','a5']},B:{players:['b1','b2','b3','b4','b5']}}};
    const mk=evs=>{ const m={n:1,home:'A',away:'B',lineup:{A:['a1','a2','a3','a4','a5'],B:['b1','b2','b3','b4','b5']},events:evs.map((e,i)=>({t:1000*(i*10),...e}))}; const st=H.matchState(m,s); return !!(st.bonus&&st.bonus.A); };
    const six=[1,2,3,4,5,6].map(i=>({type:'foul',team:'A',pid:'a1'}));
    const r={};
    r.after6=mk(six);
    r.oneFt=mk([...six,{type:'ft',team:'B',pid:'b1',made:true}]);
    r.twoFt=mk([...six,{type:'ft',team:'B',pid:'b1',made:true},{type:'ft',team:'B',pid:'b1',made:false}]);
    // and-one : panier juste avant la 6e faute (même seconde)
    const andOne=[1,2,3,4,5].map(()=>({type:'foul',team:'A',pid:'a1'})); const m1=[...andOne];
    const evA=[...m1.map((e,i)=>({...e,t:i*10000})),{type:'pt',team:'B',pid:'b2',v:2,t:60000},{type:'foul',team:'A',pid:'a2',t:61000}];
    const mm=x=>{ const m={n:1,home:'A',away:'B',lineup:{A:['a1','a2','a3','a4','a5'],B:['b1','b2','b3','b4','b5']},events:x}; const st=H.matchState(m,s); return !!(st.bonus&&st.bonus.A); };
    r.and1Before=mm(evA); r.and1After1=mm([...evA,{type:'ft',team:'B',pid:'b2',made:true,t:70000}]);
    // and-one saisi après la faute
    const evB=[...m1.map((e,i)=>({...e,t:i*10000})),{type:'foul',team:'A',pid:'a2',t:60000},{type:'pt',team:'B',pid:'b2',v:2,t:62000}];
    r.and1b=mm(evB); r.and1bAfter1=mm([...evB,{type:'ft',team:'B',pid:'b2',made:false,t:70000}]);
    // lancers non saisis, jeu repris : panier 30 s plus tard
    r.resumed=mm([...m1.map((e,i)=>({...e,t:i*10000})),{type:'foul',team:'A',pid:'a2',t:60000},{type:'pt',team:'A',pid:'a3',v:2,t:90000}]);
    return r; });
  console.log('bonus', bonus);
  E(bonus.after6===true,'bonus absent après 6 fautes'); E(bonus.oneFt===true,'bonus levé après 1 LF sur 2'); E(bonus.twoFt===false,'bonus non levé après 2 LF');
  E(bonus.and1Before===true&&bonus.and1After1===false,'and-one (panier avant faute) mal géré'); E(bonus.and1b===true&&bonus.and1bAfter1===false,'and-one (panier après faute) mal géré'); E(bonus.resumed===false,'bonus non levé à la reprise');

  // ---- 2. lancement : cinq de départ, chrono arrêté ----
  await p.click('[data-act="new-session"]'); await p.waitForTimeout(300);
  for(let i=0;i<15;i++){ await (await p.$$('[data-act="toggle-present"]'))[i].click(); }
  await p.click('[data-act="setup-step"][data-id="2"]'); await p.click('[data-act="auto-teams"]'); await p.click('[data-act="setup-step"][data-id="3"]'); await p.waitForTimeout(200); await p.click('[data-act="start-session"]'); await p.waitForTimeout(500);
  E(!!(await p.$('[data-act="five-ok"][data-run="1"]')),'feuille cinq de départ non ouverte au lancement');
  let run=await p.evaluate(()=>{ const s=window.__hs.curSession(); return window.__hs.liveMatch(s).running; }); E(run===false,'chrono lancé avant validation');
  await p.waitForTimeout(350); await p.click('[data-act="five-ok"]:not([data-run])'); await p.waitForTimeout(300);
  run=await p.evaluate(()=>window.__hs.liveMatch(window.__hs.curSession()).running); E(run===false,'valider sans lancer a lancé le chrono');
  // un remplacement ne lance pas le chrono
  await p.evaluate(()=>{ const s=window.__hs.curSession(); const m=window.__hs.liveMatch(s); const t=m.home; const bench=s.teams[t].players.find(x=>!m.lineup[t].includes(x)); if(bench) window.__hs.addEvent(s,m,{type:'sub',team:t,in:bench,out:m.lineup[t][0]}); });
  run=await p.evaluate(()=>window.__hs.liveMatch(window.__hs.curSession()).running); E(run===false,'remplacement a lancé le chrono');
  // chrono via ▶
  await p.click('[data-act="clock-toggle"]'); await p.waitForTimeout(200); run=await p.evaluate(()=>window.__hs.liveMatch(window.__hs.curSession()).running); E(run===true,'▶ ne lance pas');
  // ---- 3. dernière minute : un panier arrête le chrono ----
  const stop=await p.evaluate(()=>{ const s=window.__hs.curSession(); const m=window.__hs.liveMatch(s); const tot=window.__hs.remaining(m)+window.__hs.elapsed(m); m.elapsedMs=tot-40000; m.startedAt=Date.now(); m.running=true; const pid=m.lineup[m.home][1]; window.__hs.addEvent(s,m,{type:'pt',team:m.home,pid,v:2}); return {running:m.running,by:m.stoppedBy}; });
  console.log('dernière minute', stop); E(stop.running===false&&stop.by==='pt','panier en dernière minute ne stoppe pas le chrono');
  const early=await p.evaluate(()=>{ const s=window.__hs.curSession(); const m=window.__hs.liveMatch(s); m.elapsedMs=60000; m.startedAt=Date.now(); m.running=true; const pid=m.lineup[m.home][1]; window.__hs.addEvent(s,m,{type:'pt',team:m.home,pid,v:2}); return m.running; });
  E(early===true,'panier hors dernière minute a stoppé le chrono');
  // match suivant : la feuille s'ouvre aussi
  await p.evaluate(()=>{ const s=window.__hs.curSession(); const m=window.__hs.liveMatch(s); m.status='done'; m.endedAt=Date.now(); m.running=false; m.winner=m.home; window.__hs.render(); }); await p.waitForTimeout(200);
  await p.click('[data-act="start-match"]'); await p.waitForTimeout(400); E(!!(await p.$('[data-act="five-ok"][data-run="1"]')),'feuille cinq non ouverte au match suivant');
  await p.waitForTimeout(350); await p.screenshot({path:'out/m2_five.png'}); console.log('M1 fiveOk', await p.evaluate(()=>window.__hs.curSession().matches[0].fiveOk)); console.log('hit', await p.evaluate(()=>{ const b=document.querySelector('[data-act="five-ok"][data-run="1"]'); const r=b.getBoundingClientRect(); const el=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return el.outerHTML.slice(0,120)+' | S.sheetAt '+(Date.now()-window.__hs.S.sheetAt)+' lastTap '+JSON.stringify(window.__hs.S._lastTap); })); await p.click('[data-act="five-ok"][data-run="1"]'); await p.waitForTimeout(300); console.log('M2', await p.evaluate(()=>{ const m=window.__hs.liveMatch(window.__hs.curSession()); return m&&{n:m.n,fiveOk:m.fiveOk,running:m.running,sheet:window.__hs.S.sheet,ev:m.events.length}; })); run=await p.evaluate(()=>window.__hs.liveMatch(window.__hs.curSession()).running); E(run===true,'valider et lancer ne lance pas');

  // ---- 4. joueur du mois ----
  const ma=await p.evaluate(()=>window.__hs.monthAwards().map(m=>({k:m.k,n:m.n,done:m.done,el:m.eligible,win:m.win&&window.__hs.pname(m.win.r.id),minS:m.minS,minG:m.minG}))); console.log('mois', ma);
  // fabrique un mois passé complet : 4 séances clôturées en sept. 2026 à partir de la fixture
  const fab=await p.evaluate(()=>{ const S=window.__hs.S; const base=Object.values(S.sessions).filter(s=>s.status==='closed'&&s.matches.length>=5)[0]; if(!base) return 'nobase'; ['2026-09-06','2026-09-13','2026-09-20','2026-09-27'].forEach((d,i)=>{ const c=JSON.parse(JSON.stringify(base)); c.id='fab'+i; c.date=d; c.excluded=false; S.sessions[c.id]=c; }); S._cache={stats:{},badges:{}}; const m=window.__hs.monthAwards().find(x=>x.k==='2026-09'); return m&&{n:m.n,done:m.done,el:m.eligible,win:m.win&&window.__hs.pname(m.win.r.id),v:m.win&&m.win.v,minS:m.minS,minG:m.minG}; });
  console.log('septembre fabriqué', fab); E(fab&&fab.n===4&&fab.done&&fab.minS===3&&fab.minG===12,'seuils mensuels faux'); E(fab&&(fab.el===0||!!fab.win),'gagnant absent alors qu\'il y a des éligibles');
  await p.click('[data-go="stats"]'); await p.waitForTimeout(300); await p.click('[data-period="season"]').catch(()=>{}); await p.click('[data-stats-seg="top"]').catch(()=>{}); await p.waitForTimeout(300);
  E(!!(await p.$('#potmList')),'palmarès joueurs du mois absent');
  // image bilan avec les joueurs du mois
  await p.click('[data-act="season-img"]'); await p.waitForTimeout(1500); E(!!(await p.$('#seasonImg img')),'image bilan non générée');

  // ---- 5. cotisation en plusieurs versements ----
  await p.click('[data-go="bureau"]'); await p.waitForTimeout(150); await p.click('[data-bureau-seg="treasury"]'); await p.waitForTimeout(200); await p.click('[data-tre-seg="cot"]'); await p.waitForTimeout(300);
  const mid=await p.evaluate(()=>Object.values(window.__hs.S.players).find(x=>x.member&&x.active!==false).id);
  await p.fill('#cot-'+mid,'50'); await p.click(`[data-act="cot-mark"][data-id="${mid}"]`); await p.waitForTimeout(300);
  E(!!(await p.$(`[data-act="cot-part"][data-id="${mid}"]`)),'bouton + versement absent');
  p.removeAllListeners('dialog'); p.once('dialog',d=>d.accept('50')); await p.click(`[data-act="cot-part"][data-id="${mid}"]`); await p.waitForTimeout(300);
  const c=await p.evaluate(id=>window.__hs.S.treasury.cotis[id],mid); console.log('cotisation', c); E(c.amt===100&&c.parts.length===2,'versement non cumulé');
  const cs=await p.evaluate(()=>window.__hs.cashState()); E(cs.partial.some(x=>x.id===mid&&x.got===100),'reste dû non suivi');
  console.log('errors',errs); await b.close(); process.exit(errs.length?1:0);
})().catch(e=>{ console.error(String(e).slice(0,600)); process.exit(1); });
