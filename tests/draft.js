const { chromium } = require('playwright'); const fsx=require('fs'); console.log=(...a)=>fsx.appendFileSync('/tmp/dlog.txt',a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ')+'\n');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p=await b.newPage({viewport:{width:400,height:900}}); p.setDefaultTimeout(5000);
  let html=require('fs').readFileSync((process.env.APP||'src/app.html'),'utf8');
  const fake=`window.__w=0;window.claude={use:async(n)=>{ if(n!=='db') return null; return { doc:(path)=>({onSnapshot:(f)=>{ if(path==='config/main') f({exists:true,data:()=>({pin:'2018'})}); return ()=>{}; }, set:async(d)=>{ window.__w++; window.__last=d; }, delete:async()=>{} }), collection:(c)=>({onSnapshot:(f)=>{ f({docs:[],empty:true,metadata:{fromCache:false}}); return ()=>{}; }, doc:()=>({set:async()=>{}}) }) }; }};`;
  html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+html.replace('<script>','<script>'+fake)+'</body></html>';
  const errs=[]; p.on('pageerror',e=>{errs.push(e.message);console.log('PAGEERR',e.message);});
  await p.setContent(html,{waitUntil:'load'}); await p.waitForTimeout(400);
  await p.fill('#pinIn','2018'); await p.click('[data-act="unlock"]'); await p.waitForTimeout(100);
  await p.click('[data-go="players"]'); await p.click('[data-act="import-players"]'); await p.fill('#impTxt',Array.from({length:17},(_,i)=>'J'+(i+1)).join('\n')); await p.click('[data-act="import-confirm"]'); await p.waitForTimeout(200);
  await p.click('[data-go="home"]'); await p.click('[data-act="new-session"]'); await p.waitForTimeout(100);
  for(let i=0;i<17;i++){ await (await p.$$('[data-act="toggle-present"]'))[i].click(); }
  await p.click('[data-act="setup-step"][data-id="2"]'); await p.waitForTimeout(100);
  // choose captains
  const selOpt=async(sel,v)=>p.evaluate(([q,v])=>{ const e=document.querySelector(q); e.value=v; e.dispatchEvent(new Event('change',{bubbles:true})); },[sel,v]);
  const sels=await p.$$('select[data-team-cap]'); console.log('captain selects', sels.length);
  console.log('a'); const ids=await p.$$eval('select[data-team-cap] option',o=>o.map(x=>x.value).filter(Boolean));
  console.log('b',ids.length); await selOpt('select[data-team-cap="A"]',ids[0]); console.log('c'); await p.waitForTimeout(80); console.log('d');
  await selOpt('select[data-team-cap="B"]',ids[1]); await p.waitForTimeout(80);
  await selOpt('select[data-team-cap="C"]',ids[2]); await p.waitForTimeout(80);
  // moving captain B to A via select must steal him
  await selOpt('select[data-team-cap="A"]',ids[1]); await p.waitForTimeout(80);
  let capB=await p.$eval('select[data-team-cap="B"]',e=>e.value); if(capB!=='') errs.push('captain not removed from B when moved to A');
  await selOpt('select[data-team-cap="A"]',ids[0]); await selOpt('select[data-team-cap="B"]',ids[1]); await p.waitForTimeout(80);
  await p.screenshot({path:'d_caps.png'});
  await p.click('[data-act="draft-start"]'); await p.waitForTimeout(100); await p.screenshot({path:'d_draft.png'});
  let picks=0, undone=false; while(true){ const c=await p.$$(".dpool .dp"); if(!c.length) break; await c[0].click(); await p.waitForTimeout(30); picks++; if(picks===3&&!undone){ undone=true; await p.click('[data-act="draft-undo"]'); picks--; } if(picks>30) break; }
  console.log('picks',picks);
  const sizes=await p.evaluate(()=>{ const st=window.__hs.S.setup; return ['A','B','C'].map(t=>st.teams[t].players.length+(st.teams[t].captain?'©':'')); }); console.log('team sizes',sizes);
  await p.click('[data-act="draft-end"]'); await p.waitForTimeout(100); await p.screenshot({path:'d_done.png'});
  // captain chip blocked from cycling
  await p.waitForTimeout(450); const capChip=await p.$('.dp.cap'); await capChip.click(); await p.waitForTimeout(100);
  await p.click('[data-act="setup-step"][data-id="3"]'); await p.click('[data-act="start-session"]'); await p.waitForTimeout(300); await p.screenshot({path:'d_live.png'});
  const bt=await p.textContent('body'); if(!/©/.test(bt)) errs.push('no captain marker on board');
  const sess=await p.evaluate(()=>{ const s=window.__hs.curSession(); return {draft:s.draft&&s.draft.picks.length, caps:['A','B','C'].map(t=>s.teams[t].captain)}; }); console.log(sess); if(!sess.draft) errs.push('draft not saved in session');
  // edit teams sheet shows captain selects
  await p.click('[data-act="end-match"]'); await p.waitForTimeout(100); await (await p.$$('[data-win]'))[0].click(); await p.waitForTimeout(200); await p.click('[data-act="edit-teams"]'); await p.waitForTimeout(100); const n=await p.$$('select[data-team-cap]'); console.log('edit sheet cap selects',n.length); await p.screenshot({path:'d_edit.png'}); await p.click('[data-act="editteams-save"]'); await p.waitForTimeout(100); await p.screenshot({path:'d_between.png'});
  await p.click('[data-go="share"]'); await p.waitForTimeout(300); const sum=await p.$eval('#sumTxt',e=>e.value); console.log(sum.split('\n').slice(0,4).join(' / ')); if(!/Capitaines/.test(sum)) errs.push('no captains in summary');
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
