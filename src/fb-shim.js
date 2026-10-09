// ---------- Hoops Stats · couche Firebase (remplace la base de l'artefact Claude) ----------
(function(){
  const cfg = window.FIREBASE_CONFIG;
  if(new URLSearchParams(location.search).get('mode')==='test'){ return; } // ?mode=test : entraînement local, aucune connexion à la base de l'association
  if(!cfg || !window.firebase){ return; } // sans config : l'appli tombe en mode entraînement local
  firebase.initializeApp(cfg);
  const auth = firebase.auth();
  const fs = firebase.firestore();
  try{ fs.settings({ ignoreUndefinedProperties:true }); }catch(e){}
  try{ fs.enablePersistence({ synchronizeTabs:true }).catch(()=>{}); }catch(e){}

  const qs = new URLSearchParams(location.search);
  const FB = window.FB = {
    auth, fs,
    role: 'viewer',           // viewer | bureau | scorer
    email: null,
    scorerToken: qs.get('marqueur') || null,
    scorerSid: qs.get('seance') || null,
    ready: null,
    listeners: []
  };

  // --- rôle : bureau si connecté par email et présent dans config/bureau ---
  async function resolveRole(user){
    if(!user){ FB.role='viewer'; FB.email=null; return; }
    if(user.isAnonymous){ FB.role = FB.scorerToken ? 'scorer' : 'viewer'; FB.email=null; return; }
    FB.email = user.email || null;
    try{
      const d = await fs.doc('config/bureau').get();
      const emails = (d.exists && Array.isArray(d.data().emails)) ? d.data().emails.map(x=>String(x).toLowerCase()) : [];
      FB.role = emails.includes(String(user.email||'').toLowerCase()) ? 'bureau' : 'viewer';
      if(FB.role==='viewer' && !d.exists){ FB.role='bootstrap'; } // première connexion : la liste du bureau n'existe pas encore
    }catch(e){ FB.role='viewer'; }
  }

  FB.ready = new Promise(res=>{
    const un = auth.onAuthStateChanged(async u=>{ await resolveRole(u); FB.listeners.forEach(f=>f()); res(); });
  });

  // connexion anonyme pour tout visiteur (nécessaire au lien marqueur et au compteur de fréquentation ; aucune donnée personnelle)
  FB.ready.then(()=>{ if(!auth.currentUser){ auth.signInAnonymously().catch(()=>{}); } });
  // compteur de fréquentation : 1 ouverture par session d'appli, appareil identifié par un jeton aléatoire local (pas de cookie tiers, pas de nom)
  FB.countVisit = async ()=>{ try{ if(sessionStorage.getItem('hs-visit')) return; let did=localStorage.getItem('hs-did'); if(!did){ did=Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b=>b.toString(16).padStart(2,'0')).join(''); localStorage.setItem('hs-did',did); } await FB.ready; if(!auth.currentUser) await auth.signInAnonymously(); const day=new Date().toISOString().slice(0,10); await fs.doc('visits/'+day).set({count:firebase.firestore.FieldValue.increment(1),devices:firebase.firestore.FieldValue.arrayUnion(did)},{merge:true}); sessionStorage.setItem('hs-visit','1'); }catch(e){} };
  FB.visitStats = async (days=14)=>{ const out=[]; const q=await fs.collection('visits').orderBy(firebase.firestore.FieldPath.documentId(),'desc').limit(days).get(); q.docs.forEach(d=>{ const x=d.data(); out.push({day:d.id,count:x.count||0,devices:(x.devices||[]).length}); }); return out; };
  setTimeout(()=>FB.countVisit(),1500);

  FB.login = async (email,pass)=>{ await auth.signInWithEmailAndPassword(email.trim(),pass); await resolveRole(auth.currentUser); FB.listeners.forEach(f=>f()); return FB.role; };
  FB.logout = async ()=>{ await auth.signOut(); FB.role='viewer'; FB.email=null; FB.listeners.forEach(f=>f()); };
  FB.resetPassword = (email)=>auth.sendPasswordResetEmail(email.trim());
  FB.canWrite = ()=>FB.role==='bureau' || FB.role==='scorer';

  // --- création de la liste bureau au premier lancement ---
  FB.bootstrapBureau = async (emails)=>{ await fs.doc('config/bureau').set({emails}); await resolveRole(auth.currentUser); FB.listeners.forEach(f=>f()); };

  // --- lien marqueur ---
  FB.createScorerLink = async (sid,label)=>{
    const token = Array.from(crypto.getRandomValues(new Uint8Array(9))).map(b=>'abcdefghijkmnpqrstuvwxyz23456789'[b%32]).join('');
    const end = new Date(); end.setHours(23,59,0,0);
    await fs.doc('scorerTokens/'+token).set({ sid, label:label||'', expires: firebase.firestore.Timestamp.fromDate(end), createdBy: FB.email||'', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    const url = location.origin + location.pathname + '?marqueur=' + token + '&seance=' + encodeURIComponent(sid);
    return { token, url, expires:end };
  };
  FB.revokeScorerLink = (token)=>fs.doc('scorerTokens/'+token).delete();
  FB.listScorerLinks = async (sid)=>{ const q=await fs.collection('scorerTokens').where('sid','==',sid).get(); return q.docs.map(d=>({token:d.id,...d.data()})); };

  // --- adaptateur "db" au format attendu par l'appli (doc/collection/onSnapshot/set/delete) ---
  const strip = (o)=>JSON.parse(JSON.stringify(o));
  FB.db = {
    doc:(path)=>({
      onSnapshot:(f,err)=>fs.doc(path).onSnapshot(sn=>f({exists:sn.exists,data:()=>sn.data()}), e=>{ if(err) err(e); }),
      set:async(d,opt)=>{ const data=strip(d); if(path.startsWith('sessions/') && FB.role==='scorer' && FB.scorerToken) data.scorerToken=FB.scorerToken; if(opt&&opt.merge) await fs.doc(path).set(data,{merge:true}); else await fs.doc(path).set(data); },
      delete:()=>fs.doc(path).delete()
    }),
    collection:(c)=>({
      onSnapshot:(f,err)=>fs.collection(c).onSnapshot({includeMetadataChanges:false}, sn=>f({docs:sn.docs.map(d=>({id:d.id,data:()=>d.data()})),empty:sn.empty,metadata:{fromCache:sn.metadata.fromCache}}), e=>{ if(err) err(e); }),
      doc:(id)=>FB.db.doc(c+'/'+id)
    })
  };

  // --- import initial (bureau) ---
  FB.importAll = async (dump, progress)=>{
    let n=0; let batch=fs.batch(); let inBatch=0;
    for(const [col,docs] of Object.entries(dump)){
      if(col==='config' && docs.bureau) continue;
      for(const [id,data] of Object.entries(docs)){
        batch.set(fs.doc(col+'/'+id), strip(data)); inBatch++; n++;
        if(inBatch>=400){ await batch.commit(); batch=fs.batch(); inBatch=0; if(progress) progress(n); }
      }
    }
    if(inBatch) await batch.commit();
    return n;
  };

  // --- export complet (bureau) ---
  FB.exportAll = async ()=>{ const out={}; for(const c of ['config','players','sessions','sanctions','payments','treasury','scorerTokens']){ const q=await fs.collection(c).get(); out[c]={}; q.docs.forEach(d=>out[c][d.id]=d.data()); } return out; };

  // --- téléchargements (remplace la capacité "downloads" de l'artefact) ---
  FB.downloads = { save: async ({filename,data})=>{ const blob = data instanceof Blob ? data : new Blob([data]); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },2000); return {status:'saved'}; } };

  // --- interface "claude.use" attendue par l'appli ---
  window.claude = { use: async (name)=>{
    await FB.ready;
    if(name==='db') return FB.db;
    if(name==='user') return { can: async (perm)=> perm==='data.write' ? FB.canWrite() : true };
    if(name==='downloads') return FB.downloads;
    return null;
  } };
})();
