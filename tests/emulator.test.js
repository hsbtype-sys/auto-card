// 실제 Firebase compat SDK(10.12.0) + Firestore/Auth 에뮬레이터 + 실제 보안 규칙으로 앱의 동기화 코드를 검증
// 실행: firebase emulators:start --only auth,firestore  (firestore.rules = 운영 규칙) 후  NODE_PATH=<firebase 설치 경로>/node_modules node tests/emulator.test.js
const {boot,ok,done,sleep}=require('./harness');
const Module=require('module');
function freshFirebase(){                       // 기기마다 독립된 SDK 인스턴스(상태 공유 방지)
  for(const k of Object.keys(require.cache))if(/[\\/]@?firebase[\\/]|node_modules[\\/]@firebase/.test(k))delete require.cache[k];
  const fb=require('firebase/compat/app');require('firebase/compat/auth');require('firebase/compat/firestore');
  const orig=fb.initializeApp.bind(fb);
  fb.initializeApp=cfg=>{const app=orig({...cfg,apiKey:'fake',projectId:'demo-auto-card'});
    app.auth().useEmulator('http://127.0.0.1:9099',{disableWarnings:true});const fsx=app.firestore();fsx.useEmulator('127.0.0.1',8080);
    // vm 안에서 만든 객체는 Object 프로토타입이 달라 Firestore가 거부함(테스트 환경 한정) → 호스트 객체로 옮겨 전달
    const d0=fsx.doc.bind(fsx);fsx.doc=path=>{const r=d0(path),s0=r.set.bind(r);r.set=(data,opts)=>{const h={};for(const k of Object.keys(data)){const v=data[k];h[k]=(v&&typeof v==='object'&&v.constructor&&v.constructor.name!=='Object')?v:JSON.parse(JSON.stringify(v))}   // FieldValue 센티넬은 그대로, 일반 객체는 호스트 객체로
      return opts?s0(h,JSON.parse(JSON.stringify(opts))):s0(h)};return r};
    return app};
  return fb}
const device=(o={})=>{const fb=freshFirebase();const b=boot({config:'real',firebase:fb,...o});b.fb=fb;return b};
const EMAIL='tester@example.com',PW='pw123456';
const rec=(b,cid='shinhan',o={})=>{b.X.form(Object.assign({amount:5e4,cat:'etc',date:'2026-10-05'},o));b.X.record(cid)};
const waitFor=async(f,ms=6000)=>{const t=Date.now();while(Date.now()-t<ms){if(f())return true;await sleep(50)}return false};
const serverDoc=async(uid)=>{const r=await fetch(`http://127.0.0.1:8080/v1/projects/demo-auto-card/databases/(default)/documents/users/${uid}`,{headers:{Authorization:'Bearer owner'}});return r.status===404?null:r.json()};
const clearDb=()=>fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-auto-card/databases/(default)/documents',{method:'DELETE'});
const clearAuth=()=>fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-auto-card/accounts',{method:'DELETE'});

(async()=>{
  await clearDb();await clearAuth();
  const P=device(),W=device();                                    // P=폰, W=PC
  ok('앱이 실제 SDK로 초기화됨',P.X.cloudReady()&&W.X.cloudReady());
  // 같은 계정으로 두 기기 로그인 (이메일 계정 사용; 앱의 Google 팝업은 에뮬레이터에서 대체)
  await P.fb.auth().createUserWithEmailAndPassword(EMAIL,PW);
  const uid=P.fb.auth().currentUser.uid;
  await waitFor(()=>P.X.user);
  ok('로그인 → 앱이 사용자 인식',!!P.X.user&&P.X.user.uid===uid);
  ok('서버 비어있음 → 로컬 업로드됨',await waitFor(()=>/동기화됨/.test(P.X.syncMsg)),P.X.syncMsg);
  let doc=await serverDoc(uid);ok('users/{uid} 문서 생성',!!doc&&!!doc.fields.state);

  // 특수 키($life, #cvs)·배열·중첩 맵이 실제 Firestore에 저장되는가
  P.X.S.cards.shinhan.prev=555000;P.X.S.cards.shinhan.base['$life']=1234;P.X.S.cards.shinhan.base['#cvs']=2;
  rec(P,'shinhan',{cat:'cvs',amount:5000});                 // 로그 + ck
  await waitFor(()=>/동기화됨/.test(P.X.syncMsg)&&!P.X.timer,4000);await sleep(300);
  doc=await serverDoc(uid);
  const base=doc.fields.state.mapValue.fields.cards.mapValue.fields.shinhan.mapValue.fields.base.mapValue.fields;
  ok('키 "$life"/"#cvs" 저장 OK (실제 Firestore)',!!base['$life']&&!!base['#cvs']);
  ok('로그 배열 저장',doc.fields.state.mapValue.fields.log.arrayValue.values.length===1);

  // PC 로그인 → 폰 데이터 수신
  await W.fb.auth().signInWithEmailAndPassword(EMAIL,PW);
  ok('PC: 폰의 실적 555000 수신',await waitFor(()=>W.X.S.cards.shinhan.prev===555000&&W.X.S.log.length===1));
  ok('PC: "$life" 키도 왕복 보존',W.X.S.cards.shinhan.base['$life']===1234&&W.X.S.cards.shinhan.base['#cvs']===2);

  // 실시간: PC에서 기록 → 폰 (에코 없이)
  const before=(await serverDoc(uid)).updateTime;
  rec(W,'hana',{cat:'etc',amount:1e5,sp:true});
  ok('PC 기록 → 폰에 실시간 도착',await waitFor(()=>P.X.S.log.length===2),'P.log='+P.X.S.log.length);
  await sleep(2500);
  const after=(await serverDoc(uid)).updateTime;
  const t1=after;await sleep(2000);
  ok('에코 루프 없음 (서버 문서가 더 이상 갱신되지 않음)',(await serverDoc(uid)).updateTime===t1);
  ok('양쪽 로그 id 동일하고 유일',JSON.stringify(P.X.S.log.map(l=>l.id).sort())===JSON.stringify(W.X.S.log.map(l=>l.id).sort())&&new Set(P.X.S.log.map(l=>l.id)).size===2);

  // 오프라인(네트워크 차단) → 기록 → 복구
  await P.fb.firestore().disableNetwork();
  rec(P,'samsung',{cat:'overseas',amount:1e5});
  await sleep(1500);
  ok('오프라인 기록: 로컬엔 저장, 서버 미반영',P.X.S.log.length===3&&(await serverDoc(uid)).fields.state.mapValue.fields.log.arrayValue.values.length===2);
  await P.fb.firestore().enableNetwork();
  ok('온라인 복구 → 서버 반영',await waitFor(async()=>false,0)||await (async()=>{for(let i=0;i<80;i++){if((await serverDoc(uid)).fields.state.mapValue.fields.log.arrayValue.values.length===3)return true;await sleep(100)}return false})());
  ok('온라인 복구 → PC에도 도착',await waitFor(()=>W.X.S.log.length===3));

  // 초기화가 다른 기기로 전파
  P.ctx.confirm=()=>true;P.X.resetAll();
  ok('폰 모든 데이터 초기화 → PC도 빈 상태',await waitFor(()=>W.X.S.log.length===0&&W.X.S.cards.shinhan.prev===0),`W.log=${W.X.S.log.length} prev=${W.X.S.cards.shinhan.prev}`);
  ok('서버 문서도 초기화됨',await (async()=>{for(let i=0;i<50;i++){const d=await serverDoc(uid);if((d.fields.state.mapValue.fields.log.arrayValue.values||[]).length===0)return true;await sleep(100)}return false})());

  // 로그아웃 → 계속 로컬 동작, 서버로 안 감
  await P.fb.auth().signOut();await sleep(200);
  const t2=(await serverDoc(uid)).updateTime;rec(P,'shinhan',{cat:'transit',amount:1e4});await sleep(1500);
  ok('로그아웃: 로컬에는 기록되고 서버는 그대로',P.X.S.log.length===1&&(await serverDoc(uid)).updateTime===t2&&JSON.parse(P.store['autocard.v1']).log.length===1);

  // 보안 규칙: 남의 문서 접근 / 비로그인 접근 거부
  const O=device();await O.fb.auth().createUserWithEmailAndPassword('other@example.com',PW);
  let denied='',allowedOwn='';
  try{await O.fb.firestore().doc('users/'+uid).get({source:'server'})}catch(e){denied=e.code}
  ok('규칙: 다른 사용자의 문서 읽기 거부',denied==='permission-denied',denied);
  denied='';try{await O.fb.firestore().doc('users/'+uid).set({state:{hacked:1}})}catch(e){denied=e.code}
  ok('규칙: 다른 사용자의 문서 쓰기 거부',denied==='permission-denied',denied);
  try{await O.fb.firestore().doc('users/'+O.fb.auth().currentUser.uid).set({state:{ok:1}});allowedOwn='ok'}catch(e){allowedOwn=e.code}
  ok('규칙: 본인 문서는 허용',allowedOwn==='ok',allowedOwn);
  await O.fb.auth().signOut();denied='';try{await O.fb.firestore().doc('users/'+uid).get({source:'server'})}catch(e){denied=e.code}
  ok('규칙: 비로그인 읽기 거부',denied==='permission-denied',denied);
  denied='';try{await O.fb.firestore().doc('other/x').set({a:1})}catch(e){denied=e.code}
  ok('규칙: users 외 경로 접근 거부',denied==='permission-denied',denied);
  ok('남의 문서 위조 시도 후에도 원본 안전',!(await serverDoc(uid)).fields.state.mapValue.fields.hacked);

  // 권한 오류가 앱에서 사용자에게 보이는가 (규칙 거부 상황)
  const R=device();await R.fb.auth().createUserWithEmailAndPassword('third@example.com',PW);await waitFor(()=>R.X.user);
  ok('본인 계정 동기화는 정상',await waitFor(()=>/동기화됨/.test(R.X.syncMsg)),R.X.syncMsg);


  // ═════════ Gemini 키 동기화 (실제 SDK + 실제 규칙) ═════════
  const KEY='AIzaSyFAKE_KEY_FOR_TEST_1234567890abcdef',KEY2='AIzaSyOTHER_KEY_FOR_TEST_ABCDEFGH1234567';
  const gk=async u=>{const d=await serverDoc(u);return d&&d.fields.geminiKey?d.fields.geminiKey.stringValue:undefined};
  const uidOf=b=>b.fb.auth().currentUser.uid;
  await clearDb();await clearAuth();
  const A=device(),B=device();
  await A.fb.auth().createUserWithEmailAndPassword('k@example.com',PW);const ku=uidOf(A);
  await waitFor(()=>A.X.user&&/동기화됨/.test(A.X.syncMsg));
  await A.X.gkSave(KEY);
  ok('키 저장 → Firestore users/{uid}.geminiKey',await waitFor(async()=>false,0)||(await gk(ku))===KEY);
  let d=await serverDoc(ku);
  ok('state는 그대로 있고 키는 state/로그 안에 없음',!!d.fields.state&&!JSON.stringify(d.fields.state).includes(KEY));
  // ★ 회귀: 상태 저장(pushNow)이 키를 지우지 않는다
  A.X.form({amount:5e4,cat:'etc',date:'2026-10-05'});A.X.record('shinhan');
  await waitFor(()=>/동기화됨/.test(A.X.syncMsg)&&!A.X.timer,4000);await sleep(400);
  ok('★ 결제 기록(상태 저장) 후에도 geminiKey 유지',(await gk(ku))===KEY);
  A.X.S.cards.shinhan.prev=123000;A.X.save();await sleep(1500);
  ok('★ 여러 번 저장해도 geminiKey 유지',(await gk(ku))===KEY);
  { // ★ 자가복구 배제: 캐시가 비어 있으면 앱이 키를 다시 올릴 수 없다. 이때도 상태 저장이 서버의 키를 지우면 안 된다
    delete A.store['autocard.gemini'];
    A.X.S.cards.hana.prev=42000;A.X.save();await sleep(1800);
    ok('★★ 이 기기 캐시가 비어도, 상태 저장이 서버의 geminiKey를 지우지 않음',(await gk(ku))===KEY);
    ok('   (그리고 캐시는 서버 값으로 복구됨)',await waitFor(()=>A.X.gkGet()===KEY));
  }
  // 두 번째 기기: 로그인만 하면 캐시로 들어옴
  await B.fb.auth().signInWithEmailAndPassword('k@example.com',PW);
  ok('다른 기기: 로그인 시 키가 localStorage 캐시로 들어옴',await waitFor(()=>B.X.gkGet()===KEY));
  ok('다른 기기: 화면에 키 노출 없음',!(()=>{B.X.setTab('cards');return B.X.vCards()})().includes(KEY));
  // 캐시가 비어도 Firestore에서 읽어옴 (spec 4)
  delete B.store['autocard.gemini'];
  ok('캐시 없음 → getGeminiKey()가 Firestore에서 읽고 다시 캐시',(await B.X.getGeminiKey())===KEY&&B.X.gkGet()===KEY);
  // 상태 삭제(초기화)가 서버에서도 실제로 지워지고, 키는 유지
  A.X.S.cards.shinhan.base['$life']=999;A.X.S.cards.shinhan.base['$charge']=111;A.X.save();await sleep(1500);
  let st=(await serverDoc(ku)).fields.state.mapValue.fields.cards.mapValue.fields.shinhan.mapValue.fields.base.mapValue.fields||{};
  ok('사전조건: base["$life"]가 서버에 있음',!!st['$life']);
  delete A.X.S.cards.shinhan.base['$life'];A.X.save();await sleep(1500);      // 일부 키만 삭제 (빈 맵 교체와 구분되는 경우)
  st=(await serverDoc(ku)).fields.state.mapValue.fields.cards.mapValue.fields.shinhan.mapValue.fields.base.mapValue.fields||{};
  ok('★★ 일부 키만 지웠을 때 서버에서도 그 키만 사라짐 (옛 값이 병합으로 남지 않음)',!st['$life']&&!!st['$charge']);
  A.ctx.confirm=()=>true;A.X.resetMonth();await sleep(1500);
  st=(await serverDoc(ku)).fields.state.mapValue.fields.cards.mapValue.fields.shinhan.mapValue.fields.base.mapValue.fields||{};
  ok('★ 초기화로 지운 base 키가 서버에서도 사라짐 (merge가 옛 값을 남기지 않음)',!st['$life']);
  ok('초기화 후에도 geminiKey 유지',(await gk(ku))===KEY);
  // 삭제 전파
  await B.X.gkDelete().catch(()=>{});B.ctx.confirm=()=>true;await B.X.gkDelete();
  ok('삭제: 서버 geminiKey 비워짐',await (async()=>{for(let i=0;i<40;i++){if((await gk(ku))==='')return true;await sleep(100)}return false})());
  ok('삭제: 다른 기기 캐시도 비워짐',await waitFor(()=>A.X.gkGet()===''));
  ok('삭제해도 state는 유지',!!(await serverDoc(ku)).fields.state);
  // 클라우드가 원본: 로컬과 다르면 클라우드 값으로
  await A.X.gkSave(KEY2);await waitFor(()=>B.X.gkGet()===KEY2);
  B.store['autocard.gemini']='STALE_LOCAL_KEY_VALUE_1234567890';
  await B.fb.auth().signOut();await sleep(200);await B.fb.auth().signInWithEmailAndPassword('k@example.com',PW);
  ok('로그인 시 클라우드 키가 로컬 캐시를 덮어씀(클라우드가 원본)',await waitFor(()=>B.X.gkGet()===KEY2));

  // 로그아웃 상태에서 넣은 키 → 로그인하면 클라우드로 올라감
  const Q=device();Q.X.S.cards.hana.prev=1;await Q.X.gkSave(KEY);
  ok('로그아웃 상태 키는 로컬에만',Q.X.gkGet()===KEY);
  await Q.fb.auth().createUserWithEmailAndPassword('q@example.com',PW);const qu=uidOf(Q);
  ok('로그인 후 로컬 키가 클라우드로 업로드됨',await (async()=>{for(let i=0;i<60;i++){if((await gk(qu))===KEY)return true;await sleep(100)}return false})());
  ok('그 계정의 state도 정상 업로드',!!(await serverDoc(qu)).fields.state);
  // 키만 있고 state가 없는 문서
  const Z=device();await Z.fb.auth().createUserWithEmailAndPassword('z@example.com',PW);const zu=uidOf(Z);await waitFor(()=>/동기화됨/.test(Z.X.syncMsg));
  await fetch(`http://127.0.0.1:8080/v1/projects/demo-auto-card/databases/(default)/documents/users/${zu}?updateMask.fieldPaths=state`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:'{"fields":{}}'});   // state 필드 제거
  const Z2=device();Z2.X.S.cards.hana.prev=777;Z2.X.save();await Z2.fb.auth().signInWithEmailAndPassword('z@example.com',PW);
  ok('state가 없는 문서: 로컬 상태를 올려서 복구',await (async()=>{for(let i=0;i<60;i++){const dd=await serverDoc(zu);if(dd&&dd.fields.state)return true;await sleep(100)}return false})());
  // 규칙: 다른 사용자는 키를 읽을 수 없다
  const X=device();await X.fb.auth().createUserWithEmailAndPassword('x@example.com',PW);
  let dn='';try{await X.fb.firestore().doc('users/'+ku).get({source:'server'})}catch(e){dn=e.code}
  ok('규칙: 다른 사용자는 남의 geminiKey 읽기 거부',dn==='permission-denied',dn);
  dn='';try{await X.fb.firestore().doc('users/'+ku).set({geminiKey:'hijack'},{merge:true})}catch(e){dn=e.code}
  ok('규칙: 다른 사용자는 남의 geminiKey 덮어쓰기 거부',dn==='permission-denied'&&(await gk(ku))===KEY2,dn);
  const {allLogs}=require('./harness');
  ok('콘솔 출력 어디에도 키 없음',!allLogs.join('\n').includes(KEY)&&!allLogs.join('\n').includes(KEY2));

  const f=done('emulator');process.exit(f?1:0);
})().catch(e=>{console.log('CRASH',e);process.exit(2)});
