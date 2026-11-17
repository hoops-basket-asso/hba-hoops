// Fiabilité de la saisie : ajout d'un joueur depuis la table, présents sans action à la clôture, alerte chrono arrêté
const { chromium } = require('playwright'); const APP=process.env.APP||'src/app.html';
(async()=>{
  const b=await chromium.launch({...(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{})}); const p=await b.newPage({viewport:{width:400,height:900}});
  let html=require('fs').readFileSync(APP,'utf8'); html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+html+'</body></html>';
  const errs=[], E=(c,m)=>{ if(!c) errs.push(m); }; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.setContent(html,{waitUntil:'load'}); await p.waitForTimeout(400);
  await p.click('[data-go="players"]'); await p.click('[data-act="import-players"]'); await p.fill('#impTxt',Array.from({length:20},(_,i)=>'J'+(i+1)).join('\n')); await p.click('[data-act="import-confirm"]'); await p.waitForTimeout(200);
  await p.click('[data-go="home"]'); await p.click('[data-act="new-session"]'); await p.waitForTimeout(100); for(let i=0;i<17;i++){ await (await p.$$('[data-act="toggle-present"]'))[i].click(); }
  await p.click('[data-act="setup-step"][data-id="2"]'); await p.click('[data-act="fmt"][data-id="rotation"]'); await p.click('[data-act="auto-teams"]'); await p.click('[data-act="setup-step"][data-id="3"]'); await p.click('[data-act="start-session"]'); await p.waitForTimeout(300);
  await p.click('[data-act="five-ok"][data-run="1"]'); await p.waitForTimeout(200);
  // bouton d'ajout sous chaque équipe, liste de noms proposée
  E((await p.$$('.court .addp')).length===2,'bouton « ajouter un joueur » absent sous les équipes');
  await p.click('.court .addp'); await p.waitForTimeout(150); const opts=await p.$$eval('#lateList option',o=>o.map(x=>x.value)); E(opts.length===3,'liste des joueurs à ajouter : '+opts.length);
  await p.fill('#lateName',opts[0]); await p.click('[data-act="late-add"]'); await p.waitForTimeout(150);
  const added=await p.evaluate(n=>{ const h=window.__hs; const pl=Object.values(h.S.players).find(x=>x.name===n); return h.S.setup.present.includes(pl.id); },opts[0]); E(added,'joueur non ajouté aux présents');
  await p.evaluate(()=>{ window.__hs.S.setup=null; window.__hs.S.sheet=null; window.__hs.render(); });
  // paniers avec chrono arrêté : alerte au 2e
  const al=await p.evaluate(()=>{ const h=window.__hs; const s=h.curSession(); const m=h.liveMatch(s); const pid=m.lineup[m.home][0]; h.addEvent(s,m,{type:'pt',v:2,pid,team:m.home}); m.running=false; m.elapsedMs=5000; m.startedAt=null; h.addEvent(s,m,{type:'pt',v:2,pid,team:m.home}); const t1=/Chrono arrêté/.test(document.body.innerText); h.addEvent(s,m,{type:'pt',v:2,pid,team:m.home}); return {t1,t2:/Chrono arrêté/.test(document.body.innerText)}; });
  E(!al.t1&&al.t2,'alerte chrono arrêté : '+JSON.stringify(al));
  // clôture : présents sans action listés, décocher = retirés partout
  const g=await p.evaluate(()=>{ const h=window.__hs; const s=h.curSession(); const m=h.liveMatch(s); h.endMatch(s,m,m.home); h.S.sheet={type:'close'}; h.render(); return {n:h.ghosts(s).length,present:s.present.length,txt:document.querySelector('#closeCheck').innerText}; });
  E(g.n>0&&/sans aucune action saisie/.test(g.txt),'contrôle des présents sans action absent');
  await p.click('[data-act="ghost-check"]'); await p.waitForTimeout(150); const boxes=await p.$$('[data-ghost]'); E(boxes.length===g.n,'liste « ont-ils joué » incomplète');
  const gid=await boxes[0].getAttribute('data-ghost'); await boxes[0].uncheck(); await p.click('[data-act="ghost-save"]'); await p.waitForTimeout(200);
  const after=await p.evaluate(id=>{ const h=window.__hs; const s=h.curSession(); return {present:s.present.includes(id),team:['A','B','C','D'].some(t=>s.teams[t]&&s.teams[t].players.includes(id)),roster:s.matches.some(m=>m.roster&&(m.roster.home.includes(id)||m.roster.away.includes(id))),n:h.ghosts(s).length,sheet:h.S.sheet&&h.S.sheet.type,chg:(s.changes||[]).some(c=>c.pid===id)}; },gid);
  E(!after.present&&!after.team&&!after.roster,'joueur décoché encore présent : '+JSON.stringify(after)); E(after.n===g.n-1&&after.sheet==='close'&&after.chg,'suite du contrôle incorrecte '+JSON.stringify(after));
  console.log('ghosts',g.n,'errors',errs); await b.close(); process.exit(errs.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
