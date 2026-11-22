// Niveau de saisie par match : le niveau peut changer en cours de séance, donc chaque match garde le sien (lvl).
// Sans lvl (anciennes séances), le niveau de la séance s'applique, comme avant.
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p=await b.newPage({viewport:{width:400,height:900}}); p.setDefaultTimeout(5000);
  let html=require('fs').readFileSync(process.env.APP||'src/app.html','utf8');
  html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+html+'</body></html>';
  const errs=[]; const E=(c,m)=>{ if(!c) errs.push(m); }; p.on('pageerror',e=>errs.push(e.message));
  await p.setContent(html,{waitUntil:'load'}); await p.waitForTimeout(400);
  const r=await p.evaluate(()=>{ const h=window.__hs; const ev=[{type:'pt',team:'A',pid:'a1',v:2,t:1,el:1},{type:'miss',team:'A',pid:'a1',v:3,t:2,el:2},{type:'reb',team:'B',pid:'b1',off:false,t:3,el:3},{type:'stl',team:'B',pid:'b1',t:4,el:4},{type:'to',team:'A',pid:'a1',stl:true,t:5,el:5}];
    const mk=(lvl)=>{ const m={n:1,home:'A',away:'B',lineup:{A:['a1'],B:['b1']},roster:{home:['a1'],away:['b1']},events:JSON.parse(JSON.stringify(ev)),status:'done',winner:'A',elapsedMs:60000}; if(lvl!=null) m.lvl=lvl; return m; };
    const S0={teams:{A:{players:['a1']},B:{players:['b1']}},format:'rotation'}; const pick=(m,s)=>{ const st=h.matchState(m,s); const a=st.pl.a1||{}, b=st.pl.b1||{}; return [a.pts,a.a2+a.a3,a.k2+a.k3,a.tov,(b.orb||0)+(b.drb||0),b.stl].join(','); };
    const full={...S0,rich:true,richReb:true}, tirs={...S0,rich:true,richReb:false}, simple={...S0};
    const sess=(ms)=>({...full,id:'x'+Math.random(),date:'2026-11-22',status:'closed',present:['a1','b1'],matches:ms});
    return { herite_complet:pick(mk(null),full), herite_tirs:pick(mk(null),tirs), herite_simple:pick(mk(null),simple), lvl0_dans_seance_complete:pick(mk(0),full), lvl1_dans_seance_complete:pick(mk(1),full), lvl2_dans_seance_simple:pick(mk(2),simple),
      sessR_tout_complet:((x=>x.pl)(h.aggregate([sess([mk(2),mk(2)])])).find(x=>x&&x.id==='b1')||{}).sessR||0, sessR_partiel:((x=>x.pl)(h.aggregate([sess([mk(2),mk(0)])])).find(x=>x&&x.id==='b1')||{}).sessR||0 }; });
  const want={ herite_complet:'2,2,1,1,1,1', herite_tirs:'2,2,1,0,0,0', herite_simple:'2,0,0,0,0,0', lvl0_dans_seance_complete:'2,0,0,0,0,0', lvl1_dans_seance_complete:'2,2,1,0,0,0', lvl2_dans_seance_simple:'2,2,1,1,1,1', sessR_tout_complet:1, sessR_partiel:0 };
  for(const k of Object.keys(want)) E(String(r[k])===String(want[k]),`${k} : attendu ${want[k]}, obtenu ${r[k]}`);
  console.log('errors',errs); await b.close(); process.exit(errs.length?1:0);
})();
