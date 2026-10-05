const { chromium } = require('playwright'); const APP=process.env.APP||'src/app.html'; require('fs').mkdirSync('out',{recursive:true});
(async()=>{
  const b=await chromium.launch({...(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{})}); const p=await b.newPage({viewport:{width:400,height:900}});
  let html=require('fs').readFileSync(APP,'utf8');
  const fake=`window.__w=0;window.claude={use:async(n)=>{ if(n==='downloads') return {save:async(r)=>{window.__dl=r.filename;return {status:'saved'};}}; if(n!=='db') return null; return { doc:(path)=>({onSnapshot:(f)=>{ if(path==='config/main') f({exists:true,data:()=>({pin:'2018'})}); return ()=>{}; }, set:async(d)=>{ window.__w++; }, delete:async()=>{} }), collection:(c)=>({onSnapshot:(f)=>{ f({docs:[],empty:true,metadata:{fromCache:false}}); return ()=>{}; }, doc:()=>({set:async()=>{}}) }) }; }};`;
  html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+html.replace('<script>','<script>'+fake)+'</body></html>';
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.setContent(html,{waitUntil:'load'}); await p.waitForTimeout(400);
  await p.fill('#pinIn','2018'); await p.click('[data-act="unlock"]'); await p.waitForTimeout(100);
  await p.click('[data-go="players"]'); await p.click('[data-act="import-players"]'); await p.fill('#impTxt',Array.from({length:12},(_,i)=>'J'+(i+1)).join('\n')); await p.click('[data-act="import-confirm"]'); await p.waitForTimeout(200);
  await p.click('[data-go="home"]'); await p.click('[data-act="new-session"]'); await p.waitForTimeout(100);
  for(let i=0;i<12;i++){ await (await p.$$('[data-act="toggle-present"]'))[i].click(); }
  await p.click('[data-act="auto-teams"]'); await p.click('[data-act="start-session"]'); await p.waitForTimeout(300);
  await p.screenshot({path:'out/f_board.png'});
  const state=async()=>p.evaluate(()=>{ const {S,curSession,liveMatch,elapsed,remaining}=window.__hs; const s=curSession(); const m=liveMatch(s); return {running:m.running,el:elapsed(m),rem:remaining(m),n:m.events.length,shot:S.shot,stoppedBy:m.stoppedBy}; });
  console.log('before any event', await state());
  // first event auto-starts the clock
  await (await p.$$('.prow:not(.bench) .pbtn'))[0].click(); await p.click('[data-ev="pt2"]'); if(await p.$('[data-ast]')) await (await p.$$('[data-ast]'))[0].click();
  await p.waitForTimeout(300); const s1=await state(); console.log('after pt2', s1); if(!s1.running) errs.push('clock did not auto-start');
  if(s1.shot==null||s1.shot>20) errs.push('shot clock not started: '+s1.shot);
  // out of bounds button
  const outs=await p.$$('[data-act="out"]'); console.log('out buttons', outs.length); if(outs.length) await outs[0].click(); await p.waitForTimeout(100);
  const s2=await state(); if(s2.n!==3) errs.push('out event not recorded');
  // simulate last minute: jump elapsedMs to 8m10s
  await p.evaluate(()=>{ const {curSession,liveMatch}=window.__hs; const s=curSession(); const m=liveMatch(s); m.elapsedMs=8*60000+10000; m.startedAt=Date.now(); });
  await (await p.$$('.prow:not(.bench) .pbtn'))[1].click(); await p.click('[data-ev="foul"]'); await p.waitForTimeout(200);
  const s3=await state(); console.log('after foul in last minute', s3); if(s3.running) errs.push('clock did not stop on whistle in last minute');
  await p.screenshot({path:'out/f_lastmin.png'});
  // shot clock should be paused while game clock stopped
  const sh1=await p.evaluate(()=>window.__hs.S.shot); await p.waitForTimeout(2200); const sh2=await p.evaluate(()=>window.__hs.S.shot); console.log('shot while paused',sh1,sh2); if(sh1!==sh2) errs.push('shot clock ran while game clock paused');
  // resume
  await p.click('[data-act="clock-toggle"]'); await p.waitForTimeout(2200); const sh3=await p.evaluate(()=>window.__hs.S.shot); console.log('shot after resume',sh3); if(sh3>=sh2) errs.push('shot clock not running after resume');
  // 14s button
  const b14=await p.$('[data-act="shot"][data-s="14"]'); if(b14){ await b14.click(); const v=await p.evaluate(()=>window.__hs.S.shot); if(v!==14) errs.push('14s button -> '+v); } else errs.push('no 14s button');
  // technique confirm sheet
  await (await p.$$('.prow:not(.bench) .pbtn'))[2].click(); await p.click('[data-ev="tech"]'); await p.waitForTimeout(100);
  const cy=await p.$('[data-act="confirm-yes"]'); if(!cy) errs.push('no confirm sheet for tech'); await p.screenshot({path:'out/f_confirm.png'}); if(cy) await cy.click(); await p.waitForTimeout(100);
  // journal edit: reassign first event
  const ed=await p.$$('[data-act="edit-ev"]'); console.log('editable journal lines', ed.length); if(!ed.length) errs.push('no edit-ev'); else { await ed[ed.length-1].click(); await p.waitForTimeout(100); await p.screenshot({path:'out/f_editev.png'}); const rs=await p.$$('[data-act="ev-reassign"]'); if(rs.length) await rs[rs.length-1].click(); else errs.push('no reassign buttons'); }
  await p.waitForTimeout(100);
  { const st=await p.$('[data-act="sound-test"]'); if(st){ await st.click(); await p.waitForTimeout(100); } else errs.push('no sound-test button'); }
  // undo toast
  await (await p.$$('.prow:not(.bench) .pbtn'))[0].click(); await p.click('[data-ev="pt3"]'); if(await p.$('[data-ast]')) await (await p.$$('[data-ast]'))[0].click(); await p.waitForTimeout(100);
  const tt=await p.textContent('body'); if(!/Annuler/.test(tt)) errs.push('no undo toast');
  // end of time -> end sheet
  await p.evaluate(()=>{ const {curSession,liveMatch,manageClock}=window.__hs; const s=curSession(); const m=liveMatch(s); m.elapsedMs=9*60000-600; m.startedAt=Date.now(); m.running=true; manageClock(); });
  await p.waitForTimeout(1800); const endSheet=await p.$('[data-win]'); console.log('end sheet after 0:00', !!endSheet); if(!endSheet) errs.push('no end sheet at 0:00'); else { await p.screenshot({path:'out/f_end.png'}); await (await p.$$('[data-win]'))[0].click(); }
  await p.waitForTimeout(200);
  // stats share image
  await p.click('[data-go="stats"]'); await p.waitForTimeout(300); await p.screenshot({path:'out/f_stats.png'});
  await p.click('[data-act="cols-toggle"]'); await p.waitForTimeout(100);
  await p.click('[data-act="share-stats"]'); await p.waitForTimeout(1500); const img=await p.$('#statsImg img'); if(!img) errs.push('no stats image'); else { const src=await img.getAttribute('src'); console.log('stats img bytes', src.length); await p.screenshot({path:'out/f_share.png',fullPage:true}); const buf=Buffer.from(src.split(',')[1],'base64'); require('fs').writeFileSync('f_statsimg.png',buf); }
  await p.evaluate(()=>{ window.__hs.S.shot=2; }); await p.waitForTimeout(3500); const sv=await p.evaluate(()=>window.__hs.S.shot); const bt=await p.textContent('body'); console.log('shot after expiry',sv, /20 secondes écoulées/.test(bt)); if(sv!==null) errs.push('shot not expired');
  console.log('errors', errs);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
