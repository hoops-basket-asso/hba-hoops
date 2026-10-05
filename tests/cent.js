const { chromium } = require('playwright'); const APP=process.env.APP||'src/app.html'; require('fs').mkdirSync('out',{recursive:true});
(async()=>{
  const b=await chromium.launch({...(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{})}); const p=await b.newPage({viewport:{width:400,height:900}});
  let html=require('fs').readFileSync(APP,'utf8');
  const fake=`window.__w=0;window.__fail=0;window.claude={use:async(n)=>{ if(n!=='db') return null; return { doc:(path)=>({onSnapshot:(f)=>{ if(path==='config/main') f({exists:true,data:()=>({pin:'2018'})}); return ()=>{}; }, set:async(d)=>{ await new Promise(r=>setTimeout(r,30+Math.random()*80)); if(Math.random()<0.12){ window.__fail++; throw {code:'unavailable'}; } window.__w++; window.__last=JSON.stringify(d).length; }, delete:async()=>{} }), collection:(c)=>({onSnapshot:(f)=>{ f({docs:[],empty:true,metadata:{fromCache:false}}); return ()=>{}; }, doc:()=>({set:async()=>{}}) }) }; }};`;
  html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+html.replace('<script>','<script>'+fake)+'</body></html>';
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.setContent(html,{waitUntil:'load'}); await p.waitForTimeout(400);
  await p.fill('#pinIn','2018'); await p.click('[data-act="unlock"]'); await p.waitForTimeout(100);
  await p.click('[data-go="players"]'); await p.click('[data-act="import-players"]'); await p.fill('#impTxt',Array.from({length:14},(_,i)=>'J'+(i+1)).join('\n')); await p.click('[data-act="import-confirm"]'); await p.waitForTimeout(200);
  await p.click('[data-go="home"]'); await p.click('[data-act="new-session"]'); await p.waitForTimeout(100);
  await p.click('[data-act="fmt"][data-id="cent"]'); await p.waitForTimeout(100);
  for(let i=0;i<14;i++){ await (await p.$$('[data-act="toggle-present"]'))[i].click(); }
  await p.click('[data-act="auto-teams"]'); await p.waitForTimeout(100); await p.screenshot({path:'out/c_setup.png'});
  await p.click('[data-act="start-session"]'); await p.waitForTimeout(300); await p.screenshot({path:'out/c_live.png'});
  let acts=0, quarters=0, t0=Date.now();
  while(acts<600){
    const over=await p.evaluate(()=>!!document.querySelector('[data-act="start-match-cent"]')||/Match terminé/.test(document.body.innerText)); if(over) break;
    const btns=await p.$$('.prow:not(.bench) .pbtn'); if(!btns.length) break; await btns[Math.floor(Math.random()*btns.length)].click(); acts++;
    if(!(await p.$('.sheet'))) continue;
    const evs=['pt2','pt2','pt3','ft1','foul','foul','tech','subout']; const ev=evs[Math.floor(Math.random()*evs.length)];
    const e=await p.$(`[data-ev="${ev}"]`); if(e) await e.click(); { const cy=await p.$('[data-act="confirm-yes"]'); if(cy) await cy.click(); }
    if(await p.$('[data-ast]')){ const a=await p.$$('[data-ast]'); await a[Math.floor(Math.random()*a.length)].click(); }
    if(ev==='subout'){ const bench=await p.$$('.prow.bench .pbtn'); if(bench.length) await bench[0].click(); else await p.click('[data-act="sub-cancel"]').catch(()=>{}); }
    if(acts%7===0){ const u=await p.$('[data-act="undo"]:not([disabled])'); if(u) await u.click(); }
    const txt=await p.evaluate(()=>document.body.innerText); const q=(txt.match(/quart-temps (\d)\/4/)||[])[1]; if(q&&+q>quarters){ quarters=+q; await p.screenshot({path:'c_q'+q+'.png'}); }
  }
  await p.waitForTimeout(1500);
  const info=await p.evaluate(()=>({txt:document.body.innerText.slice(0,500),w:window.__w,fail:window.__fail,last:window.__last}));
  console.log('actions',acts,'quarters seen',quarters,'ms',Date.now()-t0,'writes',info.w,'fails',info.fail,'doc bytes',info.last,'errors',errs);
  await p.screenshot({path:'out/c_end.png'}); console.log(info.txt.replace(/\n+/g,' | ').slice(0,400));
  await p.click('[data-go="share"]'); await p.waitForTimeout(300); console.log(await p.$eval('#sumTxt',e=>e.value.split('\n').slice(0,6).join(' / ')));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
