// 실시간 저장소: Firebase Realtime Database, 설정이 없으면 같은 브라우저 탭끼리 연결되는 체험 모드
(function(){
  const cfg = window.FIREBASE_CONFIG;
  const live = !!(cfg && cfg.databaseURL && window.firebase);

  function makeFirebase(){
    firebase.initializeApp(cfg);
    const db = firebase.database();
    return {
      live:true,
      on(path, cb){ const r=db.ref(path); const h=s=>cb(s.val()); r.on('value',h); return ()=>r.off('value',h); },
      set(path, v){ return db.ref(path).set(v); },
      update(path, v){ return db.ref(path).update(v); },
      remove(path){ return db.ref(path).remove(); },
      stamp(){ return firebase.database.ServerValue.TIMESTAMP; }
    };
  }

  function makeLocal(){
    const KEY='w9-local-store';
    let data={};
    const load=()=>{ try{ data=JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ data={}; } };
    const save=()=>{ try{ localStorage.setItem(KEY, JSON.stringify(data)); }catch(e){} };
    const parts=p=>p.split('/').filter(Boolean);
    const get=p=>parts(p).reduce((o,k)=>o==null?null:(o[k]===undefined?null:o[k]), data);
    const put=(p,v)=>{
      const ks=parts(p); let o=data;
      ks.slice(0,-1).forEach(k=>{ if(typeof o[k]!=='object'||o[k]===null) o[k]={}; o=o[k]; });
      const last=ks[ks.length-1];
      if(v===null||v===undefined) delete o[last]; else o[last]=JSON.parse(JSON.stringify(v));
    };
    let bc=null; try{ bc=new BroadcastChannel('w9-local'); }catch(e){}
    const subs=new Set();
    const fire=()=>subs.forEach(s=>s.cb(get(s.path)));
    if(bc) bc.onmessage=()=>{ load(); fire(); };
    window.addEventListener('storage',e=>{ if(e.key===KEY){ load(); fire(); } });
    const commit=()=>{ save(); fire(); if(bc) bc.postMessage(1); return Promise.resolve(); };
    load();
    return {
      live:false,
      on(path, cb){ const s={path,cb}; subs.add(s); cb(get(path)); return ()=>subs.delete(s); },
      set(path, v){ load(); put(path,v); return commit(); },
      update(path, v){ load(); Object.keys(v).forEach(k=>put(path+'/'+k, v[k])); return commit(); },
      remove(path){ load(); put(path,null); return commit(); },
      stamp(){ return Date.now(); }
    };
  }

  window.Store = live ? makeFirebase() : makeLocal();

  // 문제 번호(qid)
  window.qidOf = (scene, step) => scene.type==='plan' ? 'plan'+step : scene.id;
  window.allQs = () => {
    const out=[];
    window.S.forEach(s=>{
      if(s.type==='single') out.push({qid:s.id, scene:s, kind:'single', options:s.options, name:s.time});
      if(s.type==='triage') out.push({qid:s.id, scene:s, kind:'triage', name:s.time});
      if(s.type==='plan') s.steps.forEach((st,j)=>out.push({qid:'plan'+j, scene:s, kind:'single', options:st.options, name:st.name, step:j}));
    });
    return out;
  };
  window.esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
})();
