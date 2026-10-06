const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p=await b.newPage({viewport:{width:400,height:900}}); p.setDefaultTimeout(5000);
  let html=require('fs').readFileSync((process.env.APP||'src/app.html'),'utf8');
  html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+html+'</body></html>'; // local mode
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.setContent(html,{waitUntil:'load'}); await p.waitForTimeout(400);
  await p.click('[data-go="players"]'); await p.click('[data-act="import-players"]'); await p.fill('#impTxt',Array.from({length:10},(_,i)=>'Joueur'+(i+1)+' X').join('\n')); await p.click('[data-act="import-confirm"]'); await p.waitForTimeout(200);
  await p.click('[data-go="home"]'); await p.click('[data-act="new-session"]'); await p.waitForTimeout(100);
  for(let i=0;i<9;i++){ await (await p.$$('[data-act="toggle-present"]'))[i].click(); }
  // save prep
  await p.click('[data-act="save-prep"]'); await p.waitForTimeout(200);
  const prep=await p.evaluate(()=>Object.values(window.__hs.S.sessions).find(s=>s.status==='setup')); console.log('prep saved', !!prep, prep&&prep.present.length, prep&&prep.date);
  if(!prep) errs.push('prep not saved');
  const bt=await p.textContent('#main'); if(!/Séance préparée/.test(bt)) errs.push('no prep card on home');
  // treasury: declare + confirm
  await p.click('[data-go="bureau"]'); await p.waitForTimeout(100); await p.click('[data-bureau-seg="treasury"]').catch(()=>{}); await p.waitForTimeout(100); await p.click('[data-act="go-pay"]').catch(async()=>{ await p.click('[data-tre-seg="pay"]').catch(()=>{}); }); await p.waitForTimeout(150);
  const decl=await p.$$('[data-act="pay-declare"]'); console.log('declare buttons', decl.length); if(!decl.length) errs.push('no declare buttons'); else { await decl[0].click(); await p.waitForTimeout(100); const t=await p.textContent('#main'); if(!/déclaré/.test(t)) errs.push('declared status not shown'); const cf=await p.$('[data-act="pay-mark"]'); await cf.click(); await p.waitForTimeout(100); }
  const pay=await p.evaluate(()=>Object.values(window.__hs.S.payments)[0]); console.log('payments', JSON.stringify(pay).slice(0,200));
  await p.screenshot({path:'out/dnd_pay.png'});
  // reopen prep, go to teams
  await p.click('[data-go="home"]'); await p.waitForTimeout(100); await p.click('[data-act="open-prep"]'); await p.waitForTimeout(100);
  const n1=await p.$$eval('[data-act="toggle-present"].on',e=>e.length); console.log('present restored', n1); if(n1!==9) errs.push('present not restored');
  await p.click('[data-act="setup-step"][data-id="2"]'); await p.waitForTimeout(100);
  await p.screenshot({path:'out/dnd_board.png'});
  const teams=async()=>p.evaluate(()=>{ const st=window.__hs.S.setup; return ['A','B','C'].map(t=>st.teams[t].players.length); });
  const drag=async(fromSel,toSel)=>{ const f=await p.$(fromSel); const t=await p.$(toSel); await t.scrollIntoViewIfNeeded(); await f.scrollIntoViewIfNeeded(); await p.waitForTimeout(50); const fb=await f.boundingBox(); const tb=await t.boundingBox(); await p.mouse.move(fb.x+fb.width/2,fb.y+fb.height/2); await p.mouse.down(); await p.mouse.move(fb.x+20,fb.y+20,{steps:3}); await p.mouse.move(tb.x+tb.width/2,tb.y+Math.min(tb.height-12,40),{steps:6}); await p.waitForTimeout(50); await p.mouse.up(); await p.waitForTimeout(120); };
  await drag('.dpool .dp','[data-col="A"]'); console.log('after drag to A', await teams());
  await drag('.dpool .dp','[data-col="B"]'); await drag('.dpool .dp','[data-col="B"]'); console.log('after 2 drags to B', await teams());
  let tt=await teams(); if(tt[0]!==1||tt[1]!==2) errs.push('drag assign failed '+tt);
  // move A->C
  await drag('[data-col="A"] .dp','[data-col="C"]'); tt=await teams(); console.log('after A->C', tt); if(tt[0]!==0||tt[2]!==1) errs.push('move between columns failed');
  // back to pool
  await drag('[data-col="C"] .dp','[data-col="pool"]'); tt=await teams(); console.log('after C->pool', tt); if(tt[2]!==0) errs.push('drop to pool failed');
  // tap cycles
  await p.waitForTimeout(450); const tapped=await p.$('.dpool .dp'); await tapped.click(); await p.waitForTimeout(100); tt=await teams(); console.log('after tap', tt);
  await p.screenshot({path:'out/dnd_board2.png'});
  // captains + draft via drag
  await p.click('[data-act="clear-teams"]'); await p.waitForTimeout(100);
  const ids=await p.$$eval('select[data-team-cap] option',o=>o.map(x=>x.value).filter(Boolean));
  const selOpt=async(sel,v)=>p.evaluate(([q,v])=>{ const e=document.querySelector(q); e.value=v; e.dispatchEvent(new Event('change',{bubbles:true})); },[sel,v]);
  await selOpt('select[data-team-cap="A"]',ids[0]); await selOpt('select[data-team-cap="B"]',ids[1]); await selOpt('select[data-team-cap="C"]',ids[2]); await p.waitForTimeout(100);
  // captain cannot be dragged away
  await drag('[data-col="A"] .dp.cap','[data-col="B"]'); tt=await teams(); if(tt[0]!==1) errs.push('captain moved by drag');
  await p.click('[data-act="draft-start"]'); await p.waitForTimeout(100);
  const cur=await p.evaluate(()=>window.__hs.S.setup.draft.order[0]); const other=['A','B','C'].find(t=>t!==cur);
  await drag('.dpool .dp','[data-col="'+other+'"]'); tt=await teams(); console.log('wrong column during draft', tt, 'cur',cur); if(tt.reduce((a,x)=>a+x,0)!==3) errs.push('wrong column accepted during draft');
  await drag('.dpool .dp','[data-col="'+cur+'"]'); tt=await teams(); console.log('right column', tt); if(tt.reduce((a,x)=>a+x,0)!==4) errs.push('right column refused during draft');
  await p.screenshot({path:'out/dnd_draft.png'});
  // drag last pick back to pool = undo
  await drag('[data-col="'+cur+'"] .dp:not(.cap)','[data-col="pool"]'); tt=await teams(); const picks=await p.evaluate(()=>window.__hs.S.setup.draft.picks.length); console.log('undo by drag', tt, 'picks', picks); if(picks!==0) errs.push('drag to pool did not undo');
  // tap picks the rest
  let guard=0; while(guard++<20){ const c=await p.$('.dpool .dp'); if(!c) break; await c.click(); await p.waitForTimeout(60); }
  tt=await teams(); console.log('after tap draft', tt); if(tt.reduce((a,x)=>a+x,0)!==9) errs.push('draft by tap incomplete');
  await p.click('[data-act="draft-end"]'); await p.waitForTimeout(100);
  await p.click('[data-act="setup-step"][data-id="3"]'); await p.click('[data-act="start-session"]'); await p.waitForTimeout(300);
  const live=await p.evaluate(()=>{ const s=window.__hs.curSession(); return {status:s.status,id:s.id,draft:s.draft&&s.draft.picks.length}; }); console.log('live',live); if(live.status!=='live'||live.id!==prep.id) errs.push('prep not turned into live session');
  const nSess=await p.evaluate(()=>Object.keys(window.__hs.S.sessions).length); if(nSess!==1) errs.push('duplicate session '+nSess);
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(String(e).slice(0,600));process.exit(1);});
