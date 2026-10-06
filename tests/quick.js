const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p=await b.newPage({viewport:{width:400,height:900}}); p.setDefaultTimeout(6000);
  let html=require('fs').readFileSync((process.env.APP||'src/app.html'),'utf8');
  // NO window.claude -> local mode
  html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+html+'</body></html>';
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.setContent(html,{waitUntil:'load'}); await p.waitForTimeout(500);
  const bt=await p.textContent('body'); console.log('local banner', /MODE ENTRAÎNEMENT/.test(bt), 'unlocked', !(await p.$('#pinIn')));
  await p.click('[data-go="players"]'); await p.click('[data-act="import-players"]'); await p.fill('#impTxt',Array.from({length:18},(_,i)=>'J'+(i+1)).join('\n')); await p.click('[data-act="import-confirm"]'); await p.waitForTimeout(200);
  await p.click('[data-go="home"]'); await p.click('[data-act="new-session"]'); await p.waitForTimeout(100);
  for(let i=0;i<18;i++){ await (await p.$$('[data-act="toggle-present"]'))[i].click(); }
  await p.click('[data-act="setup-step"][data-id="2"]'); await p.click('[data-act="auto-teams"]'); await p.click('[data-act="setup-step"][data-id="3"]'); await p.click('[data-act="start-session"]'); await p.waitForTimeout(300);
  await p.screenshot({path:'q_board.png'});
  const ev=async()=>p.evaluate(()=>{ const m=window.__hs.liveMatch(window.__hs.curSession()); return m.events.map(e=>e.type+(e.v||'')+':'+(e.pid||e.in||'')); });
  // quick +2
  const q2=await p.$$('[data-q="pt2"]'); console.log('quick buttons',q2.length); await q2[0].click(); await p.waitForTimeout(100);
  console.log('assist strip', !!(await p.$('.strip.ast'))); await p.screenshot({path:'q_ast.png'});
  const ap=await p.$$('[data-act="ast-pick"]'); await ap[0].click(); await p.waitForTimeout(100); console.log('events',await ev());
  // quick +3 then 'personne'
  await (await p.$$('[data-q="pt3"]'))[3].click(); await p.waitForTimeout(100); await p.click('[data-act="ast-pick"][data-id=""]'); await p.waitForTimeout(100);
  // quick foul
  await (await p.$$('[data-q="foul"]'))[1].click(); await p.waitForTimeout(100); console.log('events',await ev());
  // last actions strip & correction: change +3 to +2 via edit
  const le=await p.$$('.lastev'); console.log('last strip rows',le.length); await p.screenshot({path:'q_last.png'});
  await le[1].click(); await p.waitForTimeout(100); await p.screenshot({path:'q_edit.png'}); const v2=await p.$('[data-act="ev-val"][data-id="2"]'); if(v2) await v2.click(); else errs.push('no ev-val'); await p.waitForTimeout(100); console.log('events after fix',await ev());
  // reassign the foul to another player
  await (await p.$$('.lastev'))[0].click(); await p.waitForTimeout(100); await (await p.$$('[data-act="ev-reassign"]'))[0].click(); await p.waitForTimeout(100); console.log('events after reassign',await ev());
  // bench-first substitution
  const benchBtn=await p.$$('.prow.bench .pbtn'); console.log('bench',benchBtn.length); await benchBtn[0].click(); await p.waitForTimeout(100); await p.screenshot({path:'q_sub.png'});
  const hint=await p.textContent('body'); console.log('sub hint', /entre\. Tapez le joueur qui sort/.test(hint));
  await (await p.$$('.prow:not(.bench) .pbtn'))[0].click(); await p.waitForTimeout(100); console.log('events after sub',(await ev()).slice(-1));
  // persistence: reload page, session must still be there
  await p.reload().catch(()=>{});
  const persisted=await p.evaluate(()=>{ try{ return Object.keys(JSON.parse(localStorage.getItem('hs-local')).sessions||{}).length; }catch(e){ return 'err '+e; } }); console.log('sessions persisted in localStorage',persisted);
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(String(e).slice(0,500));process.exit(1);});
