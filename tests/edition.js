// Le point du président, sur la durée : le document doit rester juste et lisible quels que soient le mois et l'état des comptes.
// Scénarios : premier mois (rien avant), mois suivant (comparaisons), changement d'année, mois de 5 dimanches, pack soldé, trésorerie vide,
// prévision négative, mois sans séance, cotisation close, point non relevé. Pour chacun : pas d'erreur, deux pages, chiffres cohérents entre eux.
const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p=await b.newPage({viewport:{width:420,height:900}}); p.setDefaultTimeout(20000);
  let html=fs.readFileSync(process.env.APP||'src/app.html','utf8'); html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+html+'</body></html>';
  const errs=[]; const E=(c,m)=>{ if(!c) errs.push(m); }; p.on('pageerror',e=>errs.push('page : '+e.message));
  await p.setContent(html,{waitUntil:'load'}); await p.waitForTimeout(500);
  await p.evaluate(()=>{ const RD=Date; let off=0; class D extends RD{ constructor(...a){ if(a.length) super(...a); else super(RD.now()+off); } static now(){ return RD.now()+off; } } window.Date=D; window.__setNow=iso=>{ off=new RD(iso).getTime()-RD.now(); }; });
  const fx=JSON.parse(fs.readFileSync('tests/fixture-2211.json','utf8')); const base=Array.isArray(fx.sessions)?fx.sessions[0]:Object.values(fx.sessions)[0]; const players=Array.isArray(fx.players)?Object.fromEntries(fx.players.map(q=>[q.id,q])):fx.players;
  const run=async sc=>p.evaluate(async({sc,base,players})=>{ const h=window.__hs, S=h.S; window.__setNow(sc.now); S._cache={stats:{},badges:{},season:null,month:null}; S.unlocked=true; S.sanctions=sc.sanctions||{};
    const ids=Object.keys(players); S.players={}; ids.forEach((id,i)=>{ S.players[id]={...players[id],member:i%3!==0,active:true}; });
    S.config={...S.config,seasonStart:'2026-09-01',next:{}}; S.sessions={}; S.payments={};
    (sc.dates||[]).forEach((d,i)=>{ const s=JSON.parse(JSON.stringify(base)); s.id='s'+i; s.date=d; s.status='closed'; delete s.excluded; S.sessions[s.id]=s; const pay=h.duesList?null:null; });
    // règlements : tous les payeurs sauf les `unpaid` premiers de chaque séance
    Object.values(S.sessions).forEach(s=>{ const present=s.present&&s.present.length?s.present:Object.values(s.teams).flatMap(t=>t.players); const payers=[...new Set(present)].filter(id=>!(S.players[id]&&(S.players[id].member||S.players[id].student))); const paid={}; payers.slice(sc.unpaid||0).forEach(id=>{ paid[id]={amt:12,mode:'virement',at:s.date,status:'confirmed'}; }); S.payments[s.date]={date:s.date,paid}; });
    const mem=Object.values(S.players).filter(q=>q.member); const cot={}; mem.forEach((q,i)=>{ if(i<(sc.cotPaid==null?mem.length:sc.cotPaid)) cot[q.id]={amt:i===0&&sc.partial?160:300,at:'2026-10-01',parts:[{amt:i===0&&sc.partial?160:300,at:'2026-10-01'}],...(i===0&&sc.closed?{closed:true}:{})}; });
    S.treasury=sc.empty?{}:{pack:{hours:100,cost:sc.cost||7500,start:'2026-10-18',weeks:52,sessionFee:12,cotRenew:300,cotNew:350,...(sc.dueDate?{dueDate:sc.dueDate}:{})},cotis:cot,ledger:{opening:{date:'2026-09-22',amt:sc.open==null?871.97:sc.open},items:sc.items||[{id:'l1',date:'2026-10-15',label:'1er virement',cat:'pack_out',amt:4500,at:1}]},budget:{bbq:1500,bbqMembers:0,equip:0},points:sc.points||{}};
    const out={}; try{ const ym=sc.ym; if(sc.withPoint!==false&&!sc.empty){ const f=h.pointFacts(ym); S.treasury.points={months:{...((sc.points||{}).months||{}),[ym]:{q:f.app,p:0,e:0,total:f.app,app:f.app,gap:0,note:'',by:'Test',byId:'t',at:1,date:sc.now.slice(0,10)}}}; }
      const ed=h.editionOf(ym); const txt=h.editionText(ed); const pages=await h.editionImage(ed); const N=ed.net, a=ed.a; const se=a.ser.proj.length?a.ser.proj[a.ser.proj.length-1].v+(ed.cash-a.appCash):null;
      if(sc.dump) out.imgs=pages.map(c=>c.toDataURL('image/png')); Object.assign(out,{ok:true,txt,heights:pages.map(c=>c.height),widths:pages.map(c=>c.width),blank:pages.map(c=>{ const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let n=0; for(let i=0;i<d.length;i+=4000){ if(d[i]>60||d[i+1]>60||d[i+2]>60) n++; } return n; }),carry:ed.carry,net:N.end,endCash:ed.endCash,serEnd:se,rec:[N.rec,N.recCot,N.recPart,N.recOther],dep:[N.dep,N.depPack,N.depBank,N.depOther],fut:[N.recFut,N.depFut],cash:ed.cash,due:ed.due,nDue:a.nDue,dueBy:a.dueBy,dueEur:a.dueEur,nS:a.nS,avg:a.avg,avgMem:a.avgMem,pres:a.pres.map(q=>q.n),months:a.months.map(m=>[m.ym,m.partial,m.nS,m.matches,m.partEur,m.partN]),prev:a.prev&&a.prev.ym,cur:a.cur,from:a.from,closed:a.fc.closed,cotN:a.cs.cotN,members:a.cs.members,cotLeft:a.cs.cotLeft,gestion:ed.gestion,facts:ed.facts,pm:h.pointMonth(),stage:h.points()[ym]?'pt':'none'});
    }catch(e){ out.ok=false; out.err=String(e&&e.stack||e).slice(0,400); } return out; },{sc,base,players});
  const SC=[
    {n:'premier mois, mois entamé',ym:'2026-10',now:'2026-10-31T15:00:00',dates:['2026-10-18','2026-10-25'],unpaid:1},
    {n:'deuxième mois, comparaisons',ym:'2026-11',now:'2026-11-29T15:00:00',dates:['2026-10-18','2026-10-25','2026-11-01','2026-11-08','2026-11-15','2026-11-22'],unpaid:1,dueDate:'2027-01-05',partial:true},
    {n:'cotisation close',ym:'2026-11',now:'2026-11-29T15:00:00',dates:['2026-10-18','2026-11-01','2026-11-08'],partial:true,closed:true},
    {n:'mois de 5 dimanches',ym:'2027-01',now:'2027-01-31T15:00:00',dates:['2026-12-06','2026-12-13','2027-01-03','2027-01-10','2027-01-17','2027-01-24','2027-01-31'],unpaid:2},
    {n:'changement d\'année',ym:'2027-01',now:'2027-02-05T10:00:00',dates:['2026-11-08','2026-12-06','2026-12-13','2027-01-10','2027-01-17']},
    {n:'pack soldé',ym:'2027-02',now:'2027-02-28T15:00:00',dates:['2027-01-10','2027-02-07','2027-02-14'],items:[{id:'l1',date:'2026-10-15',label:'v1',cat:'pack_out',amt:4500,at:1},{id:'l2',date:'2027-01-05',label:'solde',cat:'pack_out',amt:3000,at:2}]},
    {n:'prévision négative',ym:'2026-11',now:'2026-11-29T15:00:00',dates:['2026-11-01','2026-11-08'],cotPaid:3,open:0,cost:9000,unpaid:6},
    {n:'mois sans séance',ym:'2026-12',now:'2026-12-27T15:00:00',dates:['2026-11-08','2026-11-15']},
    {n:'aucun point relevé',ym:'2026-11',now:'2026-11-29T15:00:00',dates:['2026-11-01','2026-11-08'],withPoint:false},
    {n:'trésorerie vide',ym:'2026-11',now:'2026-11-29T15:00:00',dates:['2026-11-01'],empty:true},
    {n:'fin de saison',ym:'2027-08',now:'2027-08-30T15:00:00',dates:['2027-06-06','2027-07-04','2027-08-01','2027-08-08','2027-08-29']},
  ];
  const near=(a,b,t=0.011)=>Math.abs(a-b)<=t;
  for(const sc of SC){ sc.dump=!!process.env.DUMP; const r=await run(sc); if(r.imgs) r.imgs.forEach((im,i)=>fs.writeFileSync(process.env.DUMP+'/'+sc.n.replace(/[^a-z0-9]+/gi,'-')+'-'+(i+1)+'.png',Buffer.from(im.split(',')[1],'base64'))); const T=m=>sc.n+' : '+m; if(!r.ok){ errs.push(T('erreur '+r.err)); continue; }
    E(r.heights.length===2&&r.widths.every(w=>w===1080),T('deux pages de 1080 px attendues, lu '+JSON.stringify([r.widths,r.heights]))); E(r.heights.every(h=>h>=500&&h<=2400),T('hauteur de page hors limites (500 à 2400) : '+r.heights)); E(r.blank.every(n=>n>40),T('page presque vide : '+r.blank));
    E(!/NaN|undefined|Infinity|null|\[object/.test(r.txt),T('message avec une valeur cassée : '+r.txt)); E(!/NaN|undefined|Infinity/.test(r.gestion+r.facts),T('texte de gestion cassé : '+r.gestion+' | '+r.facts)); E(r.txt.length<1300&&/\*Le point d/.test(r.txt)&&/En caisse : /.test(r.txt),T('message : '+r.txt));
    E(near(r.rec[0],r.rec[1]+r.rec[2]+r.rec[3])&&near(r.dep[0],r.dep[1]+r.dep[2]+r.dep[3]),T('entrées ou sorties : le total n\'est pas la somme des lignes '+JSON.stringify([r.rec,r.dep])));
    E(near(r.net,r.rec[0]+r.fut[0]-r.dep[0]-r.fut[1]),T('bénéfice net ≠ entrées − sorties')); E(near(r.carry+r.net,r.endCash)&&near(r.endCash,r.cash+r.fut[0]-r.fut[1]),T('report + bénéfice ≠ caisse de fin de saison : '+JSON.stringify([r.carry,r.net,r.endCash])));
    if(r.serEnd!=null&&r.closed) E(Math.abs(r.serEnd-r.endCash)<15,T('la courbe ne finit pas sur le chiffre de fin de saison : '+r.serEnd+' / '+r.endCash));
    E(Object.values(r.dueBy).reduce((a,b)=>a+b,0)===r.nDue&&r.dueEur===r.nDue*12,T('à recouvrer : le détail par mois ne fait pas le total '+JSON.stringify([r.dueBy,r.nDue,r.dueEur])));
    E(r.nS===r.pres.length&&(r.nS===0||near(r.avg,r.pres.reduce((a,b)=>a+b,0)/r.nS,1e-9))&&r.avgMem<=r.avg+1e-9,T('fréquentation incohérente')); E(r.cotN<=r.members&&r.cotLeft>=0,T('cotisations incohérentes'));
    E(r.months.every(m=>m[0]>=r.from.slice(0,7)&&m[0]<=sc.ym)&&r.months.every((m,i)=>!i||m[0]>r.months[i-1][0]),T('mois hors période ou mal ordonnés : '+JSON.stringify(r.months))); E(!r.prev||r.prev<sc.ym,T('mois précédent mal choisi : '+r.prev));
    if(sc.n==='premier mois, mois entamé'){ E(r.months.length===1&&r.months[0][1]===true&&!r.prev,T('octobre doit être seul et marqué entamé : '+JSON.stringify(r.months))); E(!/par rapport à/.test(r.txt),T('aucune comparaison possible le premier mois')); }
    if(sc.n==='deuxième mois, comparaisons'){ E(r.prev==='2026-10',T('octobre doit servir de référence')); E(/payées par séance en novembre, il en faut \d+/.test(r.txt),T('le texte doit dire combien de participations payées par séance : '+r.txt)); E(/vers le 5 janvier/.test(r.txt)&&/sera versé vers le 5 janvier/.test(r.gestion),T('date du solde du pack absente')); E(/1 partielle/.test(r.gestion),T('cotisation partielle non signalée : '+r.gestion)); }
    if(sc.n==='cotisation close'){ E(!/partielle/.test(r.gestion)&&r.cotLeft===0,T('une cotisation close ne doit plus rien attendre : '+r.gestion+' / '+r.cotLeft)); }
    if(sc.n==='mois de 5 dimanches'){ E(r.nS===5&&r.pres.length===5&&r.prev==='2026-12',T('5 dimanches attendus et décembre en référence : '+JSON.stringify([r.nS,r.prev]))); E(Object.keys(r.dueBy).length===2,T('à recouvrer sur deux mois attendu : '+JSON.stringify(r.dueBy))); }
    if(sc.n==='changement d\'année'){ E(r.pm==='2027-01',T('le 5 février, le mois à pointer est janvier : '+r.pm)); E(r.months.map(m=>m[0]).join()==='2026-11,2026-12,2027-01'&&r.prev==='2026-12',T('mois attendus nov., déc., janv. : '+JSON.stringify(r.months))); E(/Le point de janvier/.test(r.txt),T('titre du mois')); }
    if(sc.n==='pack soldé'){ E(r.due===0&&!/solde du pack/i.test(r.txt)&&!/dû au Hoops/.test(r.gestion)&&near(r.dep[1],7500),T('pack soldé : plus rien à verser, lu '+r.due+' / '+r.gestion)); }
    if(sc.n==='prévision négative'){ E(r.net<0&&/[−-].*de bénéfice sur cet exercice|−/.test(r.txt),T('un exercice déficitaire doit s\'afficher en négatif : '+r.net)); }
    if(sc.n==='mois sans séance'){ E(r.nS===0&&!/Fréquentation/.test(r.txt)&&r.heights[1]>=500,T('sans séance : pas de bloc fréquentation, mais la page tient')); E(!/par rapport à/.test(r.txt),T('un mois sans séance ne se compare pas : '+r.txt)); }
    if(sc.n==='aucun point relevé'){ E(r.stage==='none'&&near(r.cash,Math.round(r.cash*100)/100),T('sans relevé, la caisse est celle de l\'application')); }
    if(sc.n==='trésorerie vide'){ E(r.carry===r.carry&&r.cotN===0,T('trésorerie vide : le document doit quand même sortir')); }
    if(sc.n==='fin de saison'){ E(r.months.length<=12&&r.fut[0]>=0&&r.fut[1]>=0,T('fin de saison : plus rien de négatif à venir')); }
    console.log((errs.some(e=>e.startsWith(sc.n))?'✗ ':'✓ ')+sc.n+' · pages '+r.heights.join(' / ')+' · fin de saison '+Math.round(r.endCash)+' € = '+Math.round(r.carry)+' + '+Math.round(r.net)); }
  console.log('errors',errs); await b.close(); if(errs.length) process.exit(1); })().catch(e=>{ console.error(e); process.exit(1); });
