// Deux appareils sur la même séance : fusion match par match, rétablissement après écrasement, suppressions respectées.
const { chromium } = require('playwright'); const fs=require('fs');
const SRC=process.argv[2]||'tests/fixture-export.json';
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'});
  const fake=fs.readFileSync('tests/fake-firebase.js','utf8');
  await ctx.route(/gstatic\.com\/firebasejs\//, r=>r.fulfill({contentType:'application/javascript',body:'/* noop */'}));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat/, r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.route(/fonts\.googleapis|fonts\.gstatic/, r=>r.fulfill({contentType:'text/css',body:''}));
  const p=await ctx.newPage(); p.setDefaultTimeout(8000); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept()); const E=(c,m)=>{ if(!c) errs.push(m); };
  await p.goto('http://127.0.0.1:8099/index.html'); await p.waitForTimeout(800);
  await p.click('[data-act="show-login"]').catch(()=>{}); await p.waitForTimeout(150); await p.fill('#fbEmail','w.simbnag@gmail.com'); await p.fill('#fbPass','x'); await p.click('[data-act="fb-login"]'); await p.waitForTimeout(500);
  await p.setInputFiles('#impFile',SRC); await p.fill('#bureauEmails','w.simbnag@gmail.com'); await p.click('[data-act="fb-import"]'); await p.waitForTimeout(2500);
  const r=await p.evaluate(async()=>{ const h=window.__hs, S=h.S; const out={}; const wait=ms=>new Promise(r=>setTimeout(r,ms)); const fsdb=window.firebase.firestore();
    const sid=Object.values(S.sessions).filter(s=>s.status==='closed'&&s.matches.length>=3).sort((a,b)=>a.date<b.date?1:-1)[0].id; const key='sessions/'+sid; const stored=async()=>(await fsdb.doc(key).get()).data();
    const ev=n=>S.sessions[sid].matches[n].events.length;
    // 1. Écriture locale en attente + un autre appareil corrige un autre match → les deux sont conservés
    const pid=S.sessions[sid].matches[2].events.find(e=>e.pid).pid, team=S.sessions[sid].matches[2].home; const e2=ev(2), e0=ev(0);
    S.saving[key]=true; S.sessions[sid].matches[2].events.push({type:'pt',v:2,pid,team,t:Date.now(),el:1000}); h.saveSession(S.sessions[sid],['matches']);
    const remote=await stored(); remote.matches[0].events.push({type:'foul',pid,team:remote.matches[0].home,t:Date.now(),el:2000}); remote.matches[0].rev=Date.now()+50; remote.updatedAt=Date.now()+50;
    await fsdb.doc(key).set(remote); await wait(100);
    out.t1local=[ev(0)===e0+1, ev(2)===e2+1];
    S.saving[key]=false; delete S.dirty[key]; h.saveSession(S.sessions[sid],['matches']); await wait(150); { const d=await stored(); out.t1stored=[d.matches[0].events.length===e0+1, d.matches[2].events.length===e2+1]; }
    // 2. Un appareil en retard écrase un match qu'on avait corrigé → on le rétablit
    const before=ev(1); S.sessions[sid].matches[1].events.push({type:'pt',v:3,pid,team:S.sessions[sid].matches[1].home,t:Date.now(),el:3000}); h.saveSession(S.sessions[sid],['matches']); await wait(100);
    const stale=await stored(); stale.matches[1].events.pop(); stale.matches[1].rev=1; stale.updatedAt=Date.now()+50; await fsdb.doc(key).set(stale); await wait(200);
    { const d=await stored(); out.t2=[ev(1)===before+1, d.matches[1].events.length===before+1]; }
    // 3. Un match supprimé ici ne réapparaît pas si un appareil en retard le renvoie
    const full=await stored(); const n0=S.sessions[sid].matches.length; const gone=S.sessions[sid].matches[n0-1]; S.sessions[sid].matches.splice(n0-1,1); (S.sessions[sid].delM=S.sessions[sid].delM||{})[h.matchId(gone)]=Date.now(); h.saveSession(S.sessions[sid],['matches']); await wait(100);
    full.updatedAt=Date.now()+50; await fsdb.doc(key).set(full); await wait(200);
    { const d=await stored(); out.t3=[S.sessions[sid].matches.length===n0-1, d.matches.length===n0-1]; }
    // 4. Un match créé sur un autre appareil est repris tel quel
    const add=await stored(); const nm={...JSON.parse(JSON.stringify(add.matches[0])),n:99,createdAt:Date.now()+1000,rev:Date.now()+1000,events:[]}; add.matches.push(nm); add.updatedAt=Date.now()+60; await fsdb.doc(key).set(add); await wait(200);
    out.t4=[S.sessions[sid].matches.some(m=>m.n===99)];
    // 5. Un simple lecteur ne réécrit jamais rien
    S.unlocked=false; const w0=JSON.stringify(await stored()); const v=await stored(); v.matches[0].events.pop(); v.matches[0].rev=1; v.updatedAt=Date.now()+70; await fsdb.doc(key).set(v); await wait(200);
    { const d=await stored(); out.t5=[d.matches[0].events.length===v.matches[0].events.length]; } S.unlocked=true;
    out.merges=S._merges||0; return out; });
  console.log(JSON.stringify(r)); for(const k of ['t1local','t1stored','t2','t3','t4','t5']) E(r[k].every(Boolean),'fusion '+k+' : '+JSON.stringify(r[k]));
  console.log('errors',errs); await b.close(); process.exit(errs.length?1:0);
})().catch(e=>{ console.error(String(e).slice(0,600)); process.exit(1); });
