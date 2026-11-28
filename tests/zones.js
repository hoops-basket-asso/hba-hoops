// Zones de tir (essai) : après un tir, l'appli demande d'où il a été pris. Jamais bloquant, seulement en Complet sur écran large, et seulement si l'option est cochée.
const { chromium } = require('playwright'); const PORT=process.env.PORT||8099;
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const errs=[]; const E=(c,m)=>{ if(!c) errs.push(m); };
  const c=await b.newContext({viewport:{width:1366,height:800},serviceWorkers:'block'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message)); p.setDefaultTimeout(6000);
  await p.goto('http://127.0.0.1:'+PORT+'/index.html?mode=test&demo=table&niveau=complet'); await p.waitForSelector('.lvw [data-act="quick"]');
  const ev=()=>p.evaluate(()=>{ const s=Object.values(window.__hs.S.sessions).find(x=>x.status==='live'); const m=s.matches.find(x=>x.status==='live'); return m.events.map(e=>({type:e.type,v:e.v,z:e.z||null})); });
  const n0=(await ev()).length;
  // option décochée : rien ne change
  await p.click('.lvw [data-act="quick"][data-q="pt2"]'); await p.waitForTimeout(300); E(!(await p.$('#zoneRow')),'option décochée : la question de la zone ne doit pas apparaître'); await p.click('[data-act="ast-pick"][data-id=""]'); await p.waitForTimeout(450);
  // on coche l'option dans le menu ⋯
  await p.click('[data-act="live-more"]'); await p.waitForSelector('#zonesBtn'); await p.click('#zonesBtn'); await p.waitForTimeout(450); E(await p.evaluate(()=>Object.values(window.__hs.S.sessions).find(x=>x.status==='live').zones===true),'le bouton « Zones de tir » doit activer l\'option');
  // panier à 2 : la question s'ajoute au bandeau de la passe, deux choix
  await p.click('.lvw [data-act="quick"][data-q="pt2"]'); await p.waitForSelector('.astbar #zoneRow'); let ch=await p.$$eval('#zoneRow [data-act="zone-pick"]',l=>l.map(x=>x.textContent)); E(ch.join('|')==='Raquette|Mi-distance','choix à 2 points : '+ch.join('|'));
  await p.click('#zoneRow [data-id="m"]'); await p.waitForTimeout(300); let L=await ev(); E(L[L.length-1].type==='pt'&&L[L.length-1].z==='m','le panier doit porter la zone « mi-distance » : '+JSON.stringify(L[L.length-1])); E(!(await p.$('#zoneRow'))&&await p.$('[data-act="ast-pick"]'),'après la zone, il reste la question de la passe, sans la zone');
  await p.click('[data-act="ast-pick"][data-id=""]'); await p.waitForTimeout(450);
  // tir à 3 raté : trois choix ; on répond d'abord au rebond, la zone reste proposée seule
  await p.click('.lvw [data-act="quick"][data-q="miss3"]'); await p.waitForSelector('.astbar #zoneRow'); ch=await p.$$eval('#zoneRow [data-act="zone-pick"]',l=>l.map(x=>x.textContent)); E(ch.join('|')==='Corner|45°|Axe','choix à 3 points : '+ch.join('|'));
  await p.click('[data-act="reb-pick"]'); await p.waitForTimeout(450); E(await p.$('.zonebar #zoneRow'),'après le rebond, la zone doit rester proposée seule'); await p.click('#zoneRow [data-id="c"]'); await p.waitForTimeout(300); L=await ev(); const ms=L.filter(e=>e.type==='miss').pop(); E(ms&&ms.z==='c','le tir raté doit porter la zone « corner » : '+JSON.stringify(ms)); E(L[L.length-1].type==='reb','le rebond reste la dernière action');
  // sans réponse : le tir compte, sans zone ; l'action suivante n'est pas gênée
  await p.waitForTimeout(450); await p.click('.lvw [data-act="quick"][data-q="pt3"]'); await p.waitForSelector('#zoneRow'); await p.click('[data-act="ast-pick"][data-id=""]'); await p.waitForTimeout(450); await p.click('.lvw [data-act="quick"][data-q="foul"]'); await p.waitForTimeout(400); L=await ev(); E(L.some(e=>e.type==='foul'),'la faute suivante doit passer'); E(L.filter(e=>e.type==='pt'&&e.v===3).pop().z===null,'un tir sans réponse reste sans zone');
  // annuler efface la question
  await p.waitForTimeout(750); await p.click('.lvw [data-act="quick"][data-q="pt2"]'); await p.waitForSelector('#zoneRow'); await p.keyboard.press('Backspace'); await p.waitForTimeout(500); E(!(await p.$('#zoneRow')),'après « annuler », plus de question de zone');
  // les chiffres et le demi-terrain
  const zs=await p.evaluate(()=>{ const h=window.__hs; const s=Object.values(h.S.sessions).find(x=>x.status==='live'); const z=h.zoneStats([s]); return {z:z.z,n:z.n,all:z.all,svg:h.zoneCourt(z,'x')}; }); E(zs.n===2&&zs.z.m[0]===1&&zs.z.m[1]===1&&zs.z.c[0]===0&&zs.z.c[1]===1&&zs.all>zs.n,'zoneStats : '+JSON.stringify({z:zs.z,n:zs.n,all:zs.all})); E(/1\/1/.test(zs.svg)&&/0\/1/.test(zs.svg)&&/Zone notée sur 2 tirs/.test(zs.svg),'demi-terrain : chiffres attendus absents');
  E(await p.evaluate(()=>window.__hs.zoneCourt({z:{r:[0,0],m:[0,0],c:[0,0],w:[0,0],t:[0,0]},n:0,all:5})===''),'sans zone notée, pas de demi-terrain');
  await c.close();
  // téléphone : pas de question (écran trop étroit pour un bandeau de plus)
  { const c2=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}); const p2=await c2.newPage(); p2.on('pageerror',e=>errs.push('tél. '+e.message)); await p2.goto('http://127.0.0.1:'+PORT+'/index.html?mode=test&demo=table&niveau=complet'); await p2.waitForSelector('[data-act="quick"]'); await p2.evaluate(()=>{ const h=window.__hs; Object.values(h.S.sessions).find(x=>x.status==='live').zones=true; h.render(); }); await p2.click('[data-act="quick"][data-q="pt2"]'); await p2.waitForTimeout(400); E(!(await p2.$('#zoneRow')),'téléphone : pas de question de zone'); await c2.close(); }
  console.log('errors',errs); await b.close(); process.exit(errs.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
