const { chromium } = require('playwright'); const APP=process.env.APP||'src/app.html'; require('fs').mkdirSync('out',{recursive:true});
(async()=>{
  const b=await chromium.launch({...(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{})}); const p=await b.newPage({viewport:{width:400,height:820}});
  let html=require('fs').readFileSync(APP,'utf8');
  // fake db that records writes with latency and random failures
  const fake=`window.__w=0; window.__fail=0; window.claude={use:async(n)=>{ if(n!=='db') return null; return { doc:(path)=>({onSnapshot:(f)=>{ if(path==='config/main') f({exists:true,data:()=>({pin:'2018'})}); return ()=>{}; }, set:async(d)=>{ await new Promise(r=>setTimeout(r,50+Math.random()*150)); if(Math.random()<0.15){ window.__fail++; throw {code:'unavailable'}; } window.__w++; window.__last=JSON.stringify(d).length; }, delete:async()=>{} }), collection:(c)=>({onSnapshot:(f)=>{ f({docs:[],empty:true,metadata:{fromCache:false}}); return ()=>{}; }, doc:()=>({set:async()=>{}}) }) }; }};`;
  html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+html.replace('<script>','<script>'+fake)+'</body></html>';
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.setContent(html,{waitUntil:'load'}); await p.waitForTimeout(400);
  await p.fill('#pinIn','2018'); await p.click('[data-act="unlock"]'); await p.waitForTimeout(100);
  await p.click('[data-go="players"]'); await p.click('[data-act="import-players"]'); await p.fill('#impTxt',Array.from({length:21},(_,i)=>'P'+(i+1)).join('\n')); await p.click('[data-act="import-confirm"]'); await p.waitForTimeout(200);
  await p.click('[data-go="home"]'); await p.click('[data-act="new-session"]'); await p.waitForTimeout(100);
  for(let i=0;i<21;i++){ await (await p.$$('[data-act="toggle-present"]'))[i].click(); }
  await p.click('[data-act="setup-step"][data-id="2"]'); await p.click('[data-act="auto-teams"]'); await p.click('[data-act="setup-step"][data-id="3"]'); await p.click('[data-act="start-session"]'); await p.waitForTimeout(200);
  const t0=Date.now(); let matches=0, acts=0;
  for(let mtc=0; mtc<15; mtc++){
    for(let k=0;k<40;k++){
      const btns=await p.$$('.prow:not(.bench) .pbtn'); if(!btns.length) break; await btns[Math.floor(Math.random()*btns.length)].click(); acts++;
      const sheet=await p.$('.sheet'); if(!sheet) continue;
      if(await p.$('[data-win]')){ await (await p.$$('[data-win]'))[0].click(); break; }
      const evs=['pt2','pt3','ft1','ft0','foul','tech','uns','subout']; const ev=evs[Math.floor(Math.random()*evs.length)];
      const e=await p.$(`[data-ev="${ev}"]`); if(e){ await e.click(); const cy=await p.$('[data-act="confirm-yes"]'); if(cy) await cy.click(); } else { const c=await p.$('[data-act="sheet-close"] button[data-act="sheet-close"]'); if(c) await c.click(); }
      if(await p.$('[data-ast]')){ const a=await p.$$('[data-ast]'); await a[Math.floor(Math.random()*a.length)].click(); }
      if(await p.$('[data-win]')){ await (await p.$$('[data-win]'))[0].click(); break; }
      if(ev==='subout'){ const bench=await p.$$('.prow.bench .pbtn'); if(bench.length) await bench[0].click(); else await p.click('[data-act="sub-cancel"]').catch(()=>{}); }
      if(k%9===0){ const u=await p.$('[data-act="undo"]:not([disabled])'); if(u) await u.click(); }
    }
    if(await p.$('[data-win]')){ await (await p.$$('[data-win]'))[0].click(); }
    if(await p.$('[data-act="end-match"]')){ await p.click('[data-act="end-match"]'); await (await p.$$('[data-win]'))[0].click(); }
    matches++; await p.click('[data-act="start-match"]').catch(()=>{}); await p.waitForTimeout(30);
  }
  const dt=Date.now()-t0;
  await p.waitForTimeout(2500);
  const st=await p.evaluate(()=>({w:window.__w,fail:window.__fail,last:window.__last,pend:document.querySelector('#pendPill')&&document.querySelector('#pendPill').hidden}));
  console.log('matches',matches,'actions',acts,'ms',dt,'writes ok',st.w,'transient fails',st.fail,'last doc bytes',st.last,'pending hidden',st.pend,'errors',errs);
  await p.click('[data-go="stats"]'); await p.waitForTimeout(200); const txt=await p.textContent('#main'); console.log('stats page ok', /Classement des joueurs/.test(txt), 'points check', (txt.match(/points marqués/)||[])[0]);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
