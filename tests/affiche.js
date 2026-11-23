const { chromium } = require('playwright'); const fsx=require('fs'); console.log=(...a)=>fsx.appendFileSync('/tmp/alog.txt',a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ')+'\n');
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:400,height:900}}); p.setDefaultTimeout(5000);
  let html=require('fs').readFileSync((process.env.APP||'src/app.html'),'utf8');
  const fake=`window.__w=0;window.claude={use:async(n)=>{ if(n!=='db') return null; return { doc:(path)=>({onSnapshot:(f)=>{ if(path==='config/main') f({exists:true,data:()=>({pin:'2018'})}); return ()=>{}; }, set:async(d)=>{ window.__w++; window.__last=d; }, delete:async()=>{} }), collection:(c)=>({onSnapshot:(f)=>{ f({docs:[],empty:true,metadata:{fromCache:false}}); return ()=>{}; }, doc:()=>({set:async()=>{}}) }) }; }};`;
  html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+html.replace('<script>','<script>'+fake)+'</body></html>';
  const errs=[]; p.on('pageerror',e=>{errs.push(e.message);console.log('PAGEERR',e.message);});
  await p.setContent(html,{waitUntil:'load'}); await p.waitForTimeout(400);
  await p.fill('#pinIn','2018'); await p.click('[data-act="unlock"]'); await p.waitForTimeout(100);
  await p.click('[data-go="players"]'); await p.click('[data-act="import-players"]'); await p.fill('#impTxt',Array.from({length:17},(_,i)=>'J'+(i+1)).join('\n')); await p.click('[data-act="import-confirm"]'); await p.waitForTimeout(200);
  await p.click('[data-go="home"]'); await p.click('[data-act="new-session"]'); await p.waitForTimeout(100);
  for(let i=0;i<17;i++){ await (await p.$$('[data-act="toggle-present"]'))[i].click(); }
  await p.click('[data-act="setup-step"][data-id="2"]'); await p.click('[data-act="fmt"][data-id="rotation"]').catch(()=>{}); await p.waitForTimeout(100);
  // choose captains
  const selOpt=async(sel,v)=>p.evaluate(([q,v])=>{ const e=document.querySelector(q); e.value=v; e.dispatchEvent(new Event('change',{bubbles:true})); },[sel,v]);
  const sels=await p.$$('select[data-team-cap]'); console.log('captain selects', sels.length);
  console.log('a'); const ids=await p.$$eval('select[data-team-cap] option',o=>o.map(x=>x.value).filter(Boolean));
  console.log('b',ids.length); await selOpt('select[data-team-cap="A"]',ids[0]); console.log('c'); await p.waitForTimeout(80); console.log('d');
  await selOpt('select[data-team-cap="B"]',ids[1]); await p.waitForTimeout(80);
  await selOpt('select[data-team-cap="C"]',ids[2]); await p.waitForTimeout(80);
  let guard=0; while(guard++<30){ const c=await p.$('.dpool .dp'); if(!c) break; await c.click(); await p.waitForTimeout(30); }
  await p.waitForTimeout(450);
  await p.click('[data-act="setup-step"][data-id="3"]'); await p.click('[data-act="start-session"]'); await p.waitForTimeout(350); await p.click('[data-act="five-ok"][data-run="1"]',{timeout:1500}).catch(()=>{}); await p.waitForTimeout(300);
  await p.waitForTimeout(300); p.on('dialog',d=>d.accept());
  const snap=()=>p.evaluate(()=>{ const h=window.__hs, s=h.curSession(), m=h.liveMatch(s); return {st:s.status,n:s.matches.length,mn:m&&m.n,home:m&&m.home,away:m&&m.away,teams:['A','B','C'].map(t=>s.teams[t].players.join(',')),pres:s.present.length,delM:Object.keys(s.delM||{}).length,sheet:h.S.sheet&&h.S.sheet.type,ros:m&&m.roster&&m.roster.home.join(',')}; });
  const before=await snap(); console.log('avant',before);
  await p.evaluate(()=>{ window.__hs.S.sheet=null; window.__hs.render(); }); await p.click('[data-act="live-more"]'); await p.waitForTimeout(400);
  if(!(await p.$('[data-act="rematch"]'))) errs.push('« Changer l\'affiche » absent avant la 1re action');
  const sel=async(q,v)=>p.evaluate(([q,v])=>{ const e=document.querySelector(q); e.value=v; e.dispatchEvent(new Event('change',{bubbles:true})); },[q,v]);
  await sel('#rmHome','C'); await sel('#rmAway','A'); await p.click('[data-act="rematch"]'); await p.waitForTimeout(400);
  const after=await snap(); console.log('après',after);
  if(!(after.n===1&&after.mn===1&&after.home==='C'&&after.away==='A')) errs.push('nouvelle affiche mal appliquée');
  if(after.teams.join('|')!==before.teams.join('|')||after.pres!==before.pres) errs.push('les équipes ou les présents ont changé');
  if(after.delM!==1) errs.push('l\'ancien match 1 n\'est pas marqué supprimé');
  if(after.sheet!=='five') errs.push('le cinq de départ doit être redemandé');
  if(after.ros!==before.teams[2]) errs.push('feuille du match : mauvaise équipe à domicile');
  await p.evaluate(()=>{ window.__hs.S.sheet=null; window.__hs.render(); }); await p.click('[data-act="live-more"]'); await p.waitForTimeout(400); await p.click('[data-act="unlaunch"]'); await p.waitForTimeout(500);
  const un=await p.evaluate(()=>{ const s=Object.values(window.__hs.S.sessions)[0]; return {st:s.status,teams:['A','B','C'].map(t=>s.teams[t].players.join(','))}; });
  if(un.st!=='setup'||un.teams.join('|')!==before.teams.join('|')) errs.push('annuler le lancement ne doit pas défaire les équipes : '+JSON.stringify(un));
  await p.evaluate(()=>{ const h=window.__hs; const s=Object.values(h.S.sessions)[0]; h.startSetup(s); }); await p.waitForTimeout(300);
  const su=await p.evaluate(()=>{ const st=window.__hs.S.setup; return {teams:['A','B','C'].map(t=>st.teams[t].players.join(',')),home:st.home,away:st.away,lv:st.richLvl}; });
  if(su.teams.join('|')!==before.teams.join('|')||su.home!=='C'||su.away!=='A') errs.push('la préparation ne reprend pas les équipes et l\'affiche : '+JSON.stringify(su));
  await p.evaluate(()=>{ window.__hs.startSession(); }); await p.waitForTimeout(400);
  const re=await snap(); console.log('relance',re); if(!(re.st==='live'&&re.home==='C'&&re.away==='A'&&re.delM>=1&&re.teams.join('|')===before.teams.join('|'))) errs.push('relance : '+JSON.stringify(re));
  await p.evaluate(()=>{ const h=window.__hs, s=h.curSession(), m=h.liveMatch(s); h.S.sheet=null; h.addEvent(s,m,{type:'pt',team:m.home,pid:m.lineup[m.home][0],v:2}); h.render(); }); await p.click('[data-act="live-more"]'); await p.waitForTimeout(400);
  if(await p.$('[data-act="rematch"]')) errs.push('« Changer l\'affiche » ne doit plus apparaître une fois le match commencé');
  console.log('errors',errs); await b.close(); if(errs.length) process.exit(1);
})().catch(e=>{console.error(e);process.exit(1);});
