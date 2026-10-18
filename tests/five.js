const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p=await b.newPage({viewport:{width:400,height:900}}); p.setDefaultTimeout(5000);
  let html=require('fs').readFileSync(process.env.APP||'src/app.html','utf8');
  html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+html+'</body></html>';
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.setContent(html,{waitUntil:'load'}); await p.waitForTimeout(400);
  await p.click('[data-go="players"]'); await p.click('[data-act="import-players"]'); await p.fill('#impTxt',Array.from({length:18},(_,i)=>'J'+(i+1)).join('\n')); await p.click('[data-act="import-confirm"]'); await p.waitForTimeout(200);
  await p.click('[data-go="home"]'); await p.click('[data-act="new-session"]'); await p.waitForTimeout(100);
  for(let i=0;i<18;i++){ await (await p.$$('[data-act="toggle-present"]'))[i].click(); }
  await p.click('[data-act="setup-step"][data-id="2"]'); await p.click('[data-act="auto-teams"]'); await p.click('[data-act="setup-step"][data-id="3"]'); await p.click('[data-act="start-session"]'); await p.waitForTimeout(300);
  const fb=await p.$('[data-act="five"]'); if(!fb) errs.push('no five button'); else { await fb.click(); await p.waitForTimeout(150); }
  const chips=await p.$$('[data-act="five-toggle"]'); console.log('five chips', chips.length);
  const onBefore=await p.evaluate(()=>{ const m=window.__hs.liveMatch(window.__hs.curSession()); return {A:[...m.lineup[m.home]],B:[...m.lineup[m.away]]}; });
  // swap one starter for a bench player on home team
  const home=await p.evaluate(()=>window.__hs.liveMatch(window.__hs.curSession()).home);
  const onChips=await p.$$('[data-act="five-toggle"][data-team="'+home+'"].on'); const offChips=await p.$$('[data-act="five-toggle"][data-team="'+home+'"]:not(.on)');
  console.log('home on/off', onChips.length, offChips.length);
  await offChips[0].click(); await p.waitForTimeout(80); // should refuse (cap)
  await onChips[0].click(); await p.waitForTimeout(80); await (await p.$$('[data-act="five-toggle"][data-team="'+home+'"]:not(.on)'))[0].click(); await p.waitForTimeout(80);
  await p.click('[data-act="five-ok"]'); await p.waitForTimeout(200);
  const onAfter=await p.evaluate(()=>{ const m=window.__hs.liveMatch(window.__hs.curSession()); return {A:[...m.lineup[m.home]]}; });
  console.log('lineup changed', JSON.stringify(onBefore.A)!==JSON.stringify(onAfter.A), onAfter.A.length);
  if(onAfter.A.length!==5) errs.push('lineup size '+onAfter.A.length);
  // board shows new five
  const boardNames=await p.$$eval('.prow:not(.bench) .pbtn',els=>els.length); console.log('on-court rows', boardNames);
  // score, end, check gp counts only on-court
  await (await p.$$('.prow:not(.bench) [data-q="pt2"]'))[0].click(); await p.waitForTimeout(80); await p.click('[data-act="ast-pick"][data-id=""]',{timeout:500}).catch(()=>{});
  console.log('five button gone after first action', !(await p.$('[data-act="five"]')));
  await p.click('[data-act="end-match"]'); await p.waitForTimeout(100); await (await p.$$('[data-win]'))[0].click(); await p.waitForTimeout(200);
  const gp=await p.evaluate(()=>{ const s=window.__hs.curSession(); const ss=window.__hs.sessionStats(s); return Object.values(ss.pl).map(r=>r.gp); }); console.log('gp values', gp, 'players with gp', gp.filter(x=>x>0).length); if(gp.filter(x=>x>0).length!==10) errs.push('gp should be 10 on-court players, got '+gp.filter(x=>x>0).length);
  // next match between same teams: lineup carries over
  await p.click('[data-act="start-match"]').catch(()=>{}); await p.waitForTimeout(200);
  const m2=await p.evaluate(()=>{ const s=window.__hs.curSession(); const m=window.__hs.liveMatch(s); return m?{home:m.home,l:m.lineup[m.home]}:null; }); console.log('match2', m2&&m2.home, m2&&JSON.stringify(m2.l)===JSON.stringify(onAfter.A)?'lineup carried':'different');
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(String(e).slice(0,500));process.exit(1);});
