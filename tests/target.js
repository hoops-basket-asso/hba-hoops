const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p=await b.newPage({viewport:{width:400,height:900}}); p.setDefaultTimeout(5000);
  let html=require('fs').readFileSync(process.env.APP||'src/app.html','utf8');
  html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+html+'</body></html>';
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.setContent(html,{waitUntil:'load'}); await p.waitForTimeout(400);
  await p.click('[data-go="players"]'); await p.click('[data-act="import-players"]'); await p.fill('#impTxt',Array.from({length:12},(_,i)=>'J'+(i+1)).join('\n')); await p.click('[data-act="import-confirm"]'); await p.waitForTimeout(200);
  await p.click('[data-go="home"]'); await p.click('[data-act="new-session"]'); await p.waitForTimeout(100);
  for(let i=0;i<12;i++){ await (await p.$$('[data-act="toggle-present"]'))[i].click(); }
  await p.click('[data-act="setup-step"][data-id="2"]'); await p.click('[data-act="auto-teams"]'); await p.click('[data-act="setup-step"][data-id="3"]'); await p.click('[data-act="start-session"]'); await p.waitForTimeout(300);
  const state=()=>p.evaluate(()=>{ const {S,curSession,liveMatch}=window.__hs; const s=curSession(); const m=liveMatch(s); const st=(()=>{ let h=0; m.events.forEach(e=>{ if(e.type==='pt'&&s.teams[m.home].players.includes(e.pid)) h+=e.v; }); return h; })(); return {running:m.running,stoppedBy:m.stoppedBy,home:st,sheet:S.sheet&&S.sheet.type,toast:S.toast&&S.toast.msg}; });
  const score2=async()=>{ await (await p.$$('.prow:not(.bench) [data-q="pt2"]'))[0].click(); await p.waitForTimeout(80); const a=await p.$('[data-act="ast-pick"][data-id=""]'); if(a) await a.click({timeout:500}).catch(()=>{}); await p.waitForTimeout(80); };
  for(let i=0;i<5;i++) await score2();
  console.log('at 10', await state());
  await score2(); const s12=await state(); console.log('at 12', s12);
  if(s12.running) errs.push('clock still running at target'); if(s12.sheet!=='end') errs.push('no end sheet'); if(s12.stoppedBy!=='target') errs.push('stoppedBy '+s12.stoppedBy);
  const bt=await p.textContent('#overlay'); if(!/Chrono en pause/.test(bt)) errs.push('no pause note in sheet');
  await p.screenshot({path:'out/t_end.png'});
  // correct : close sheet, undo last basket
  await p.click('.sheet button[data-act="sheet-close"]'); await p.waitForTimeout(100);
  await p.click('[data-act="undo"]').catch(async()=>{ const u=await p.$('[data-act="undo"]'); if(u) await u.click(); }); await p.waitForTimeout(150);
  const s10=await state(); console.log('after undo', s10); if(s10.running) errs.push('clock restarted by itself'); if(!/chrono reste en pause/.test(s10.toast||'')) errs.push('no resume toast: '+s10.toast);
  await p.screenshot({path:'out/t_toast.png'});
  const rb=await p.$('.toast [data-act="clock-toggle"]'); if(!rb) errs.push('no resume button'); else { await rb.click(); await p.waitForTimeout(150); }
  const sr=await state(); console.log('after resume', sr); if(!sr.running) errs.push('resume failed');
  await p.waitForTimeout(1200); const clk=await p.textContent('#clock'); console.log('clock', clk);
  await score2(); const s12b=await state(); console.log('again 12', s12b); if(s12b.running||s12b.sheet!=='end') errs.push('second target not handled');
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(String(e).slice(0,500));process.exit(1);});
