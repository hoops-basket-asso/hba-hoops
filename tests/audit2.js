const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p=await b.newPage({viewport:{width:400,height:900}}); p.setDefaultTimeout(5000);
  let html=require('fs').readFileSync(process.env.APP||'src/app.html','utf8');
  html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+html+'</body></html>';
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.setContent(html,{waitUntil:'load'}); await p.waitForTimeout(400);
  await p.click('[data-go="players"]'); await p.click('[data-act="import-players"]'); await p.fill('#impTxt',Array.from({length:12},(_,i)=>'J'+(i+1)).join('\n')); await p.click('[data-act="import-confirm"]'); await p.waitForTimeout(200);
  await p.click('[data-go="home"]'); await p.click('[data-act="new-session"]'); await p.waitForTimeout(100);
  for(let i=0;i<9;i++){ await (await p.$$('[data-act="toggle-present"]'))[i].click(); }
  await p.click('[data-act="save-prep"]'); await p.waitForTimeout(150);
  // make-img with only a prep -> toast, no crash
  await p.click('[data-go="share"]'); await p.waitForTimeout(150); const mi=await p.$('[data-act="make-img"]'); if(mi){ await mi.click(); await p.waitForTimeout(300); }
  // new-session reopens the prep
  await p.click('[data-go="home"]'); await p.click('[data-act="new-session"]'); await p.waitForTimeout(100);
  const reopened=await p.evaluate(()=>window.__hs.S.setup.id&&window.__hs.S.setup.present.length); console.log('new-session reopened prep', reopened); if(reopened!==9) errs.push('new-session did not reopen prep');
  await p.click('[data-act="setup-step"][data-id="2"]'); await p.waitForTimeout(100);
  const ids=await p.$$eval('select[data-team-cap] option',o=>o.map(x=>x.value).filter(Boolean));
  const selOpt=async(sel,v)=>p.evaluate(([q,v])=>{ const e=document.querySelector(q); e.value=v; e.dispatchEvent(new Event('change',{bubbles:true})); },[sel,v]);
  await selOpt('select[data-team-cap="A"]',ids[0]); await p.waitForTimeout(60);
  // chasuble swap : set B to A's colour
  const colA=await p.$eval('select[data-team-color="A"]',e=>e.value); await selOpt('select[data-team-color="B"]',colA); await p.waitForTimeout(60);
  const cols=await p.evaluate(()=>['A','B','C'].map(t=>window.__hs.S.setup.teams[t].color)); console.log('colours after swap',cols); if(new Set(cols).size!==3) errs.push('duplicate chasuble');
  // untick captain in step 1 clears captain
  await p.click('[data-act="setup-step"][data-id="1"]'); await p.waitForTimeout(60); await p.click('[data-act="toggle-present"][data-id="'+ids[0]+'"]'); await p.waitForTimeout(60);
  const capA=await p.evaluate(()=>window.__hs.S.setup.teams.A.captain); if(capA) errs.push('captain kept after untick');
  await p.click('[data-act="toggle-present"][data-id="'+ids[0]+'"]'); await p.waitForTimeout(60);
  // invalid date ignored
  await p.evaluate(()=>{ const e=document.querySelector('#sdate'); e.value=''; e.dispatchEvent(new Event('input',{bubbles:true})); }); const dt=await p.evaluate(()=>window.__hs.S.setup.date); if(!/^\d{4}-\d{2}-\d{2}$/.test(dt)) errs.push('empty date accepted');
  // auto + launch
  await p.click('[data-act="setup-step"][data-id="2"]'); await p.click('[data-act="auto-teams"]'); await p.click('[data-act="setup-step"][data-id="3"]'); await p.click('[data-act="start-session"]'); await p.waitForTimeout(300);
  const sid=await p.evaluate(()=>window.__hs.S.sid); console.log('live', sid);
  // simulate another device: setup still open on a prep already live -> refused
  await p.evaluate(()=>{ const s=window.__hs.S.sessions; const live=Object.values(s)[0]; window.__hs.S.setup={id:live.id,date:live.date,present:[...live.present],nteams:3,format:'rotation',teams:JSON.parse(JSON.stringify(live.teams)),home:'A',away:'B',q:'',step:3}; window.__hs.S.view='setup'; window.__hs.S.sheet=null; });
  await p.evaluate(()=>{ window.__hs.render(); }); await p.waitForTimeout(100); { const bt=await p.$('[data-act="start-session"]'); console.log('start btn present', !!bt); if(bt) await bt.click(); } await p.waitForTimeout(200);
  const st=await p.evaluate(()=>{ const s=Object.values(window.__hs.S.sessions)[0]; return {n:Object.keys(window.__hs.S.sessions).length, matches:s.matches.length, status:s.status, view:window.__hs.S.view}; }); console.log('after second launch', st); if(st.n!==1||st.matches!==1) errs.push('double launch overwrote session');
  // treasury declared -> undo
  await p.click('[data-go="bureau"]'); await p.waitForTimeout(100); await p.click('[data-act="go-pay"]').catch(()=>{}); await p.waitForTimeout(100); await p.click('[data-bureau-seg="treasury"]').catch(()=>{}); await p.waitForTimeout(100); await p.click('[data-tre-seg="pay"]').catch(()=>{}); await p.waitForTimeout(100);
  const d1=await p.$('[data-act="pay-declare"]'); if(d1){ await d1.click(); await p.waitForTimeout(80); const u=await p.$('[data-act="pay-undo"]'); if(!u) errs.push('no undo on declared'); else { await u.click(); await p.waitForTimeout(80); const n=await p.evaluate(()=>Object.values(window.__hs.S.payments).reduce((a,x)=>a+Object.keys(x.paid).length,0)); if(n!==0) errs.push('undo declared failed'); } } else errs.push('no declare button');
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(String(e).slice(0,500));process.exit(1);});
