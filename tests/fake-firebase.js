// Fake firebase compat SDK for tests: in-memory store persisted in localStorage, no security rules.
(function(){
  const KEY='fakefs';
  const load=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; } };
  const store=d=>localStorage.setItem(KEY,JSON.stringify(d));
  let data=load(); const subs=[];
  const notify=()=>{ store(data); subs.forEach(f=>{ try{ f(); }catch(e){} }); };
  window.addEventListener('storage',e=>{ if(e.key===KEY){ data=load(); subs.forEach(f=>f()); } });
  const getDoc=(path)=>{ const [c,id]=path.split('/'); return (data[c]||{})[id]; };
  const setDoc=(path,d)=>{ const [c,id]=path.split('/'); (data[c]=data[c]||{})[id]=JSON.parse(JSON.stringify(d)); notify(); };
  const delDoc=(path)=>{ const [c,id]=path.split('/'); if(data[c]) delete data[c][id]; notify(); };
  class Timestamp{ constructor(ms){ this.ms=ms; } toDate(){ return new Date(this.ms); } toJSON(){ return {__ts:this.ms}; } static fromDate(d){ return new Timestamp(d.getTime()); } }
  const revive=(o)=>{ if(o&&typeof o==='object'){ if('__ts' in o) return new Timestamp(o.__ts); for(const k in o) o[k]=revive(o[k]); } return o; };
  const docRef=(path)=>({
    get:async()=>{ const d=getDoc(path); return {exists:!!d,data:()=>d?revive(JSON.parse(JSON.stringify(d))):undefined,id:path.split('/')[1]}; },
    set:async(d)=>{ setDoc(path,d); },
    delete:async()=>{ delDoc(path); },
    onSnapshot:(a,b,c)=>{ const cb=typeof a==='function'?a:b; const f=()=>{ const d=getDoc(path); cb({exists:!!d,data:()=>d?revive(JSON.parse(JSON.stringify(d))):undefined}); }; f(); subs.push(f); return ()=>{}; }
  });
  const colRef=(c)=>({
    doc:(id)=>docRef(c+'/'+id),
    get:async()=>{ const docs=Object.entries(data[c]||{}).map(([id,d])=>({id,data:()=>revive(JSON.parse(JSON.stringify(d)))})); return {docs,empty:!docs.length}; },
    where:(f,op,v)=>({ get:async()=>{ const docs=Object.entries(data[c]||{}).filter(([id,d])=>d[f]===v).map(([id,d])=>({id,data:()=>revive(JSON.parse(JSON.stringify(d)))})); return {docs,empty:!docs.length}; } }),
    onSnapshot:(a,b,c2)=>{ const cb=typeof a==='function'?a:b; const f=()=>{ const docs=Object.entries(data[c]||{}).map(([id,d])=>({id,data:()=>revive(JSON.parse(JSON.stringify(d)))})); cb({docs,empty:!docs.length,metadata:{fromCache:false}}); }; f(); subs.push(f); return ()=>{}; }
  });
  const fsObj={ doc:docRef, collection:colRef, settings:()=>{}, enablePersistence:()=>Promise.resolve(), batch:()=>{ const ops=[]; return { set:(ref,d)=>ops.push(()=>ref.set(d)), commit:async()=>{ for(const o of ops) await o(); } }; } };
  let user=null; const authSubs=[];
  const authObj={ get currentUser(){ return user; }, onAuthStateChanged:(f)=>{ authSubs.push(f); setTimeout(()=>f(user),0); return ()=>{}; },
    signInWithEmailAndPassword:async(email,pass)=>{ if(pass==='bad') { const e=new Error('bad'); e.code='auth/wrong-password'; throw e; } user={email,isAnonymous:false,uid:'u_'+email}; localStorage.setItem('fakeauth',JSON.stringify(user)); authSubs.forEach(f=>f(user)); return {user}; },
    signInAnonymously:async()=>{ user={isAnonymous:true,uid:'anon'}; localStorage.setItem('fakeauth',JSON.stringify(user)); authSubs.forEach(f=>f(user)); return {user}; },
    signOut:async()=>{ user=null; localStorage.removeItem('fakeauth'); authSubs.forEach(f=>f(null)); },
    sendPasswordResetEmail:async()=>{} };
  try{ const u=localStorage.getItem('fakeauth'); if(u) user=JSON.parse(u); }catch(e){}
  window.firebase={ initializeApp:()=>{}, auth:()=>authObj, firestore:Object.assign(()=>fsObj,{Timestamp,FieldValue:{serverTimestamp:()=>({__ts:Date.now()})}}) };
})();
