const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p=await b.newPage({viewport:{width:400,height:900}}); p.setDefaultTimeout(5000);
  let html=require('fs').readFileSync(process.env.APP||'src/app.html','utf8');
  html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+html+'</body></html>';
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.setContent(html,{waitUntil:'load'}); await p.waitForTimeout(400);
  const POS=['M','M','M','A','A','A','AI','AI','AI','AF','AF','AF','P','P','P','poly',''];
  await p.click('[data-go="players"]'); await p.click('[data-act="import-players"]'); await p.fill('#impTxt',POS.map((x,i)=>'J'+(i+1)).join('\n')); await p.click('[data-act="import-confirm"]'); await p.waitForTimeout(200);
  await p.evaluate((POS)=>{ const ps=Object.values(window.__hs.S.players).sort((a,b)=>+a.name.slice(1)-+b.name.slice(1)); ps.forEach((pl,i)=>{ if(POS[i]) pl.pos=POS[i]; }); },POS);
  await p.click('[data-go="home"]'); await p.click('[data-act="new-session"]'); await p.waitForTimeout(100);
  const n=15; for(let i=0;i<n;i++){ await (await p.$$('[data-act="toggle-present"]'))[i].click(); }
  await p.click('[data-act="setup-step"][data-id="2"]'); await p.waitForTimeout(100);
  const ids=await p.$$eval('select[data-team-cap] option',o=>o.map(x=>x.value).filter(Boolean));
  await p.evaluate(([v])=>{ const e=document.querySelector('select[data-team-cap="A"]'); e.value=v; e.dispatchEvent(new Event('change',{bubbles:true})); },[ids[0]]); await p.waitForTimeout(80);
  const capA=ids[0];
  let worst=0;
  for(let k=0;k<30;k++){ await p.click('[data-act="auto-teams"]'); await p.waitForTimeout(40);
    const r=await p.evaluate(()=>{ const st=window.__hs.S.setup; return ['A','B','C'].map(t=>({cap:st.teams[t].captain,pl:st.teams[t].players.map(id=>(window.__hs.S.players[id].pos||'x'))})); });
    if(r[0].cap!==capA||r[0].pl[0]!==(await p.evaluate(id=>window.__hs.S.players[id].pos||'x',capA))) errs.push('captain lost');
    const sizes=r.map(x=>x.pl.length); if(Math.max(...sizes)-Math.min(...sizes)>1) errs.push('size unbalanced '+sizes);
    // each team must have each of the 5 positions at most once more than any other team
    ['M','A','AI','AF','P'].forEach(q=>{ const c=r.map(x=>x.pl.filter(y=>y===q).length); const d=Math.max(...c)-Math.min(...c); worst=Math.max(worst,d); if(d>1) errs.push('pos '+q+' unbalanced '+c); });
    if(k===0) console.log('sample', r.map(x=>x.pl.join(',')));
  }
  console.log('worst position gap', worst);
  // 2 teams cent format with 12 players
  await p.click('[data-act="fmt"][data-id="cent"]'); await p.click('[data-act="auto-teams"]'); await p.waitForTimeout(50);
  const r2=await p.evaluate(()=>{ const st=window.__hs.S.setup; return ['A','B','C'].map(t=>st.teams[t].players.length); }); console.log('cent sizes', r2); if(r2[2]!==0||Math.abs(r2[0]-r2[1])>1) errs.push('cent unbalanced');
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(String(e).slice(0,500));process.exit(1);});
