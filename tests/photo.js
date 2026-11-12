// Photo de profil : ajout par le bureau depuis la fiche joueur, réduction à 200 px, affichage, images à partager, retrait.
const { chromium } = require('playwright'); const fs=require('fs'); const IMG=process.argv[2]||'tests/portrait-test.jpg';
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const fake=fs.readFileSync('tests/fake-firebase.js','utf8');
  await ctx.route(/gstatic\.com\/firebasejs\//, r=>r.fulfill({contentType:'application/javascript',body:'/* noop */'}));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat/, r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.route(/fonts\.googleapis|fonts\.gstatic/, r=>r.fulfill({contentType:'text/css',body:''}));
  const p=await ctx.newPage(); p.setDefaultTimeout(8000); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept()); const E=(c,m)=>{ if(!c) errs.push(m); };
  await p.goto('http://127.0.0.1:8099/index.html'); await p.waitForTimeout(800);
  await p.click('[data-act="show-login"]').catch(()=>{}); await p.waitForTimeout(150); await p.fill('#fbEmail','w.simbnag@gmail.com'); await p.fill('#fbPass','x'); await p.click('[data-act="fb-login"]'); await p.waitForTimeout(500);
  await p.setInputFiles('#impFile','tests/fixture-export.json'); await p.fill('#bureauEmails','w.simbnag@gmail.com'); await p.click('[data-act="fb-import"]'); await p.waitForTimeout(2000);
  const pid=await p.evaluate(()=>{ const h=window.__hs; const L=h.ladderOf(h.seasonLadderSessions()); const id=L.list[0].r.id; h.S.sheet={type:'detail',pid:id}; h.render(); return id; }); await p.waitForTimeout(300);
  E(!!(await p.$('#phFile')),'bouton photo absent pour le bureau');
  await p.setInputFiles('#phFile',IMG); await p.waitForTimeout(1200);
  const ph=await p.evaluate(id=>{ const q=window.__hs.S.players[id]; const saved=JSON.parse(localStorage.getItem('fakefs')).players[id]; return {len:(q.photo||'').length,head:(q.photo||'').slice(0,23),saved:!!(saved&&saved.photo),name:!!q.name,img:!!document.querySelector('.sheet img')}; },pid);
  console.log('photo',ph); E(ph.head==='data:image/jpeg;base64,'&&ph.len>1500&&ph.len<40000,'photo non réduite : '+ph.len); E(ph.saved&&ph.name&&ph.img,'photo non enregistrée ou non affichée');
  const dim=await p.evaluate(id=>new Promise(r=>{ const im=new Image(); im.onload=()=>r([im.naturalWidth,im.naturalHeight]); im.src=window.__hs.S.players[id].photo; }),pid); E(dim[0]===200&&dim[1]===200,'dimensions '+dim);
  // les images à partager se génèrent avec la photo
  const sizes=await p.evaluate(async()=>{ const h=window.__hs; const a=await h.ladderImage(); const s=Object.values(h.S.sessions).filter(x=>x.status==='closed').sort((x,y)=>x.date<y.date?1:-1)[0]; const c=await h.summaryImage(s); return [a.width,a.height,c.width,c.height]; }); E(sizes[0]===1080&&sizes[2]===1080,'images KO '+sizes);
  // un joueur (non bureau) ne voit pas le bouton
  await p.evaluate(()=>{ window.__hs.S.unlocked=false; window.__hs.render(); }); await p.waitForTimeout(200); E(!(await p.$('#phFile'))&&!!(await p.$('.sheet img')),'bouton photo visible hors bureau, ou photo masquée');
  await p.evaluate(()=>{ window.__hs.S.unlocked=true; window.__hs.render(); }); await p.waitForTimeout(200);
  await p.click('[data-act="photo-del"]'); await p.waitForTimeout(400); E(await p.evaluate(id=>!window.__hs.S.players[id].photo&&!!window.__hs.S.players[id].name,pid),'retrait de la photo KO');
  console.log('errors',errs); await b.close(); process.exit(errs.length?1:0);
})().catch(e=>{ console.error(String(e).slice(0,600)); process.exit(1); });
