// « Matchs suivis en détail » : ce qu'un joueur voit de la saisie complète, avec la couverture (N matchs sur M).
// Les tirs ne comptent que sur les matchs avec tirs notés (lvl 1 ou 2), rebonds / interceptions / balles perdues / contres que sur les matchs en complet (lvl 2).
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p=await b.newPage({viewport:{width:400,height:900}}); p.setDefaultTimeout(5000);
  let html=require('fs').readFileSync(process.env.APP||'src/app.html','utf8'); html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+html+'</body></html>';
  const errs=[]; const E=(c,m)=>{ if(!c) errs.push(m); }; p.on('pageerror',e=>errs.push(e.message));
  await p.setContent(html,{waitUntil:'load'}); await p.waitForTimeout(400);
  const fx=JSON.parse(require('fs').readFileSync('tests/fixture-2211.json','utf8')); const sess=Array.isArray(fx.sessions)?fx.sessions[0]:Object.values(fx.sessions)[0];
  const r=await p.evaluate(sess=>{ const h=window.__hs;
    const ev=[{type:'pt',team:'A',pid:'a1',v:2,t:1,el:1},{type:'miss',team:'A',pid:'a1',v:3,t:2,el:2},{type:'reb',team:'B',pid:'b1',off:false,t:3,el:3},{type:'stl',team:'B',pid:'b1',t:4,el:4},{type:'to',team:'A',pid:'a1',stl:true,t:5,el:5},{type:'miss',team:'B',pid:'b1',v:2,t:6,el:6},{type:'blk',team:'A',pid:'a1',t:7,el:7}];
    const mk=(n,lvl)=>({n,home:'A',away:'B',lineup:{A:['a1'],B:['b1']},roster:{home:['a1'],away:['b1']},events:JSON.parse(JSON.stringify(ev)),status:'done',winner:'A',elapsedMs:60000,lvl});
    const s={id:'t1',date:'2026-11-29',status:'closed',format:'rotation',present:['a1','b1'],teams:{A:{players:['a1']},B:{players:['b1']}},matches:[mk(1,2),mk(2,0),mk(3,1),mk(4,2),{...mk(5,2),status:'live'}]};
    const z=h.myDetail('a1',[s]); const zb=h.myDetail('b1',[s]); const none=h.myDetail('zz',[s]);
    // jeu d'essai du 22/11 : chaque joueur, couverture cohérente avec les niveaux des matchs
    const all=[...new Set(sess.matches.flatMap(m=>[...(m.roster.home||[]),...(m.roster.away||[])]))].map(id=>h.myDetail(id,[sess]));
    return {z,zb,none,bad:all.filter(x=>x.gF>x.gT||x.gT>x.gp||x.ms.length!==x.gp||x.ms.filter(m=>m.lv===2).length!==x.gF).length,n:all.length,withFull:all.filter(x=>x.gF>0).length,blkOn:all.some(x=>x.blkOn)}; },sess);
  const z=r.z; E(z.gp===4&&z.gT===3&&z.gF===2,'couverture : attendu 4 joués, 3 avec tirs, 2 complets, lu '+[z.gp,z.gT,z.gF]);
  E(z.a2+z.a3===6&&z.k2+z.k3===3&&z.a3===3,'tirs : sur les 3 matchs avec tirs seulement, lu '+[z.a2,z.a3,z.k2,z.k3]);
  E(z.tov===2&&z.blk===2&&z.pts===4&&z.blkOn===true,'complet : balles perdues, contres et points sur les 2 matchs complets seulement, lu '+[z.tov,z.blk,z.pts,z.blkOn]);
  E(r.zb.drb===2&&r.zb.stl===2,'rebonds et interceptions du joueur B sur les 2 matchs complets, lu '+[r.zb.drb,r.zb.stl]);
  E(r.none.gp===0,'un joueur absent ne joue aucun match'); E(r.n>=15&&r.bad===0,'22/11 : couverture incohérente pour '+r.bad+' joueur(s) sur '+r.n); E(r.withFull>0,'22/11 : personne avec un match complet'); E(r.blkOn===false,'22/11 : les contres n\'étaient pas saisis, la case ne doit pas apparaître');
  console.log('errors',errs); await b.close(); if(errs.length) process.exit(1); })().catch(e=>{ console.error(e); process.exit(1); });
