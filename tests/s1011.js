const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p=await b.newPage({viewport:{width:400,height:900}}); p.setDefaultTimeout(5000);
  let html=require('fs').readFileSync(process.env.APP||'src/app.html','utf8');
  html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+html+'</body></html>';
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.setContent(html,{waitUntil:'load'}); await p.waitForTimeout(400);
  await p.click('[data-go="players"]'); await p.click('[data-act="import-players"]'); await p.fill('#impTxt',Array.from({length:12},(_,i)=>'J'+(i+1)).join('\n')); await p.click('[data-act="import-confirm"]'); await p.waitForTimeout(200);
  const playSession=async(date)=>{ await p.click('[data-go="home"]'); await p.click('[data-act="new-session"]'); await p.waitForTimeout(100); await p.evaluate(d=>{ window.__hs.S.setup.date=d; },date);
    for(let i=0;i<12;i++){ await (await p.$$('[data-act="toggle-present"]'))[i].click(); }
    await p.click('[data-act="setup-step"][data-id="2"]'); await p.click('[data-act="auto-teams"]'); await p.click('[data-act="setup-step"][data-id="3"]'); await p.click('[data-act="start-session"]'); await p.waitForTimeout(300);
    // first basket -> prominent assist prompt
    await (await p.$$('.prow:not(.bench) [data-q="pt2"]'))[0].click(); await p.waitForTimeout(80);
    const ast=await p.$('.strip.ast'); if(!ast) errs.push('no assist strip'); else { const t=await ast.textContent(); if(!/Passe décisive sur le \+2/.test(t)) errs.push('assist text '+t); const big=await p.$$('.strip.ast .chip.big'); if(big.length<2) errs.push('assist buttons '+big.length); }
    if(date==='2026-10-11') await p.screenshot({path:'out/s_ast.png'});
    await p.click('[data-act="ast-pick"][data-id=""]'); await p.waitForTimeout(80);
    const sh=await p.evaluate(()=>window.__hs.S.shot); if(sh!=null) errs.push('shot clock before last minute');
    if(!(await p.$('[data-act="shot"]'))===false) errs.push('shot buttons visible before last minute');
    for(let i=0;i<5;i++){ await (await p.$$('.prow:not(.bench) [data-q="pt2"]'))[0].click(); await p.waitForTimeout(60); await p.click('[data-act="ast-pick"][data-id=""]',{timeout:500}).catch(()=>{}); await p.waitForTimeout(40); }
    await p.waitForTimeout(100); const win=await p.$('[data-win]'); if(win){ await win.click(); await p.waitForTimeout(200); }
    await p.click('[data-act="close-session"]'); await p.waitForTimeout(100); await p.click('[data-act="close-session-confirm"]'); await p.waitForTimeout(300); };
  await playSession('2026-10-04'); await playSession('2026-10-11');
  // last-minute behaviour on a live match
  await p.click('[data-go="home"]'); await p.click('[data-act="new-session"]'); await p.waitForTimeout(100); await p.evaluate(()=>{ window.__hs.S.setup.date='2026-10-18'; });
  for(let i=0;i<12;i++){ await (await p.$$('[data-act="toggle-present"]'))[i].click(); }
  await p.click('[data-act="setup-step"][data-id="2"]'); await p.click('[data-act="auto-teams"]'); await p.click('[data-act="setup-step"][data-id="3"]'); await p.click('[data-act="start-session"]'); await p.waitForTimeout(300);
  await (await p.$$('.prow:not(.bench) [data-q="pt2"]'))[0].click(); await p.waitForTimeout(60); await p.click('[data-act="ast-pick"][data-id=""]'); await p.waitForTimeout(60);
  await p.evaluate(()=>{ const {curSession,liveMatch}=window.__hs; const m=liveMatch(curSession()); m.elapsedMs=8*60000+1000; m.startedAt=Date.now(); });
  await p.waitForTimeout(900); const lm=await p.evaluate(()=>({shot:window.__hs.S.shot, btn:!!document.querySelector('[data-act="shot"]'), toast:window.__hs.S.toast&&window.__hs.S.toast.msg})); console.log('last minute', lm); if(lm.shot==null||!lm.btn) errs.push('last minute not armed');
  await p.screenshot({path:'out/s_lastmin.png'});
  await p.evaluate(()=>{ window.__hs.S.view='home'; window.__hs.render(); });
  // stats : two modes
  await p.click('[data-go="stats"]'); await p.waitForTimeout(200); await p.click('[data-period="season"]'); await p.waitForTimeout(150);
  let t=await p.textContent('#main'); if(!/Cumul de la saison/.test(t)) errs.push('no season explanation'); if(!/3 séances|2 séances/.test(t)) errs.push('season count: '+(t.match(/\d+ séances?/)||[])[0]);
  await p.click('[data-period="session"]'); await p.waitForTimeout(150); t=await p.textContent('#main'); if(!/cette séance seulement/.test(t)) errs.push('no session explanation');
  await p.screenshot({path:'out/s_stats.png'});
  // select 04/10 and exclude it
  const id0410=await p.evaluate(()=>Object.values(window.__hs.S.sessions).find(x=>x.date==='2026-10-04').id);
  await p.evaluate(id=>{ const e=document.querySelector('#refSess'); e.value=id; e.dispatchEvent(new Event('change',{bubbles:true})); },id0410); await p.waitForTimeout(150);
  const ex=await p.$('[data-act="stats-exclude"]'); if(!ex) errs.push('no exclude button'); else { await ex.click(); await p.waitForTimeout(150); }
  t=await p.textContent('#main'); if(!/hors stats/.test(t)) errs.push('excluded banner missing');
  await p.click('[data-period="season"]'); await p.waitForTimeout(150); t=await p.textContent('#main'); const n=(t.match(/(\d+) séances?/)||[])[1]; console.log('season sessions after exclude', n); if(n!=='1'&&n!=='2') errs.push('season still counts excluded: '+n);
  await p.click('[data-go="home"]'); await p.waitForTimeout(150); t=await p.textContent('#main'); if(!/hors stats/.test(t)) errs.push('home list lacks hors stats tag');
  // journal of a closed session (11/10) : reassign a basket
  const id1011=await p.evaluate(()=>Object.values(window.__hs.S.sessions).find(x=>x.date==='2026-10-11').id);
  await p.click('[data-act="stats-of"][data-id="'+id1011+'"]'); await p.waitForTimeout(200); await p.click('[data-stats-seg="teams"]'); await p.waitForTimeout(150);
  const jm=await p.$$('[data-act="jm"]'); console.log('journal matches', jm.length); if(!jm.length) errs.push('no journal');
  const before=await p.evaluate(id=>{ const s=window.__hs.S.sessions[id]; const e=s.matches[0].events.find(x=>x.type==='pt'); return e.pid; },id1011);
  const lines=await p.$$('.log [data-act="edit-ev"][data-mi]'); if(!lines.length) errs.push('no editable lines'); else { await lines[lines.length-1].click(); await p.waitForTimeout(120); await p.screenshot({path:'out/s_edit.png'}); const rs=await p.$$('[data-act="ev-reassign"]'); if(!rs.length) errs.push('no reassign'); else await rs[0].click(); await p.waitForTimeout(150); }
  const after=await p.evaluate(id=>{ const s=window.__hs.S.sessions[id]; const e=s.matches[0].events.find(x=>x.type==='pt'); return e.pid; },id1011);
  console.log('reassigned', before, '->', after); if(before===after) errs.push('reassign on closed session failed');
  t=await p.textContent('#main'); console.log('still on stats', /Journal des matchs/.test(t));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(String(e).slice(0,600));process.exit(1);});
