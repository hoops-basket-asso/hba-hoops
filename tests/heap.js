const { chromium } = require('playwright'); const APP=process.env.APP||'src/app.html'; require('fs').mkdirSync('out',{recursive:true});
(async()=>{
  const b=await chromium.launch({...(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}),args:['--enable-precise-memory-info']}); const p=await b.newPage({viewport:{width:400,height:820}}); p.setDefaultTimeout(8000);
  let html=require('fs').readFileSync(APP,'utf8');
  const fake=`window.claude={use:async(n)=>{ if(n!=='db') return null; return { doc:(path)=>({onSnapshot:(f)=>{ if(path==='config/main') f({exists:true,data:()=>({pin:'2018'})}); return ()=>{}; }, set:async(d)=>{ await new Promise(r=>setTimeout(r,60)); }, delete:async()=>{} }), collection:(c)=>({onSnapshot:(f)=>{ f({docs:[],empty:true,metadata:{fromCache:false}}); return ()=>{}; }, doc:()=>({set:async()=>{}}) }) }; }};`;
  html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+html.replace('<script>','<script>'+fake)+'</body></html>';
  await p.setContent(html,{waitUntil:'load'}); await p.waitForTimeout(400);
  await p.fill('#pinIn','2018'); await p.click('[data-act="unlock"]');
  await p.click('[data-go="players"]'); await p.click('[data-act="import-players"]'); await p.fill('#impTxt',Array.from({length:18},(_,i)=>'J'+(i+1)).join('\n')); await p.click('[data-act="import-confirm"]'); await p.waitForTimeout(200);
  await p.click('[data-go="home"]'); await p.click('[data-act="new-session"]'); for(let i=0;i<18;i++){ await (await p.$$('[data-act="toggle-present"]'))[i].click(); }
  await p.click('[data-act="setup-step"][data-id="2"]'); await p.click('[data-act="auto-teams"]'); await p.click('[data-act="setup-step"][data-id="3"]'); await p.click('[data-act="start-session"]'); await p.waitForTimeout(300);
  const mem=async()=>p.evaluate(()=>({heap:Math.round(performance.memory.usedJSHeapSize/1e6),nodes:document.getElementsByTagName('*').length,timers:0}));
  console.log('start',await mem());
  let acts=0; const t0=Date.now();
  for(let mtc=0;mtc<8;mtc++){ for(let k=0;k<30;k++){ const btns=await p.$$('.prow:not(.bench) .pbtn'); if(!btns.length) break; await btns[Math.floor(Math.random()*btns.length)].click(); acts++; if(!(await p.$('.sheet'))) continue; const evs=['pt2','pt3','ft1','foul']; const e=await p.$(`[data-ev="${evs[k%4]}"]`); if(e) await e.click(); const cy=await p.$('[data-act="confirm-yes"]'); if(cy) await cy.click(); if(await p.$('[data-ast]')){ const a=await p.$$('[data-ast]'); await a[0].click(); } if(await p.$('[data-win]')){ await (await p.$$('[data-win]'))[0].click(); break; } }
    if(await p.$('[data-act="end-match"]')){ await p.click('[data-act="end-match"]'); await (await p.$$('[data-win]'))[0].click(); }
    console.log('after match',mtc+1,'acts',acts,await mem());
    await p.click('[data-act="start-match"]').catch(()=>{}); await p.waitForTimeout(50); }
  // let clock run 20s idle
  await p.waitForTimeout(20000); console.log('idle 20s',await mem());
  const timing=await p.evaluate(()=>{ const t=performance.now(); for(let i=0;i<5;i++) window.__hs&&window.__hs.manageClock&&window.__hs.manageClock(); return performance.now()-t; });
  await b.close(); console.log('done ms',Date.now()-t0);
})().catch(e=>{console.error(String(e).slice(0,400));process.exit(1);});
