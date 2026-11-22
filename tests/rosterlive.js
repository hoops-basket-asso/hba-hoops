const { chromium } = require('playwright'); const fsx=require('fs'); console.log=(...a)=>fsx.appendFileSync('/tmp/rlog.txt',a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ')+'\n');
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
  // pendant le match : un remplaçant de l'équipe qui attend passe dans une équipe qui joue
  const r=await p.evaluate(()=>{ const h=window.__hs, s=h.curSession(), m=h.liveMatch(s); const idle=['A','B','C'].find(t=>t!==m.home&&t!==m.away);
    const pid=s.teams[idle].players[0]; const onH=m.lineup[m.home][0];
    const T=JSON.parse(JSON.stringify(s.teams)); T[idle].players=T[idle].players.filter(x=>x!==pid); T[m.home].players.push(pid);
    // et un titulaire de l'équipe qui reçoit part chez les visiteurs (il a joué : il reste sur la feuille d'origine)
    T[m.home].players=T[m.home].players.filter(x=>x!==onH); T[m.away].players.push(onH);
    h.S.setup={present:[...s.present],teams:T,nteams:3,format:s.format,q:''}; h.S.sheet={type:'editteams'};
    const b=document.createElement('button'); b.dataset.act='editteams-save'; b.id='zz'; document.body.appendChild(b); return {pid,onH,home:m.home,away:m.away}; });
  await p.$eval('#zz',e=>e.click()); await p.waitForTimeout(200);
  const after=await p.evaluate(()=>{ const h=window.__hs, s=h.curSession(), m=h.liveMatch(s); return {home:m.roster.home, away:m.roster.away}; });
  if(!after.home.includes(r.pid)) errs.push('remplaçant arrivé pendant le match absent de la feuille');
  if(!after.home.includes(r.onH)) errs.push('titulaire parti retiré à tort de sa feuille d\'origine');
  if(after.away.includes(r.onH)) errs.push('titulaire déjà en jeu compté dans les deux équipes');
  console.log('errors',errs); await b.close(); if(errs.length) process.exit(1);
})().catch(e=>{console.error(e);process.exit(1);});
