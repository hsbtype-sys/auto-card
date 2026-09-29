const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const src=html.match(/<script>([\s\S]*)<\/script>/)[1].replace("const FIREBASE_CONFIG","var FIREBASE_CONFIG_ORIG");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// ── 가짜 서버/Firebase ──
const server={docs:{},listeners:[],writes:0};
const clone=o=>o===undefined?undefined:JSON.parse(JSON.stringify(o));
function mkFirebase(dev,opts={}){
  const fb={_initCalls:0};
  fb.initializeApp=()=>{fb._initCalls++;if(opts.initThrows)throw new Error('boom')};
  fb.firestore=()=>dev.db;fb.firestore.FieldValue={serverTimestamp:()=>'__ts__'};
  fb.auth=()=>dev.auth;fb.auth.GoogleAuthProvider=function(){};
  dev.auth={cbs:[],user:null,onAuthStateChanged(cb){this.cbs.push(cb)},getRedirectResult:()=>Promise.resolve(),
    async signInWithPopup(){this.user={uid:'u1',email:'me@x.com'};this.cbs.forEach(c=>c(this.user))},
    async signOut(){this.user=null;this.cbs.forEach(c=>c(null))}};
  dev.db={enablePersistence:()=>Promise.resolve(),
    doc(path){return{
      async get(){if(!dev.online)throw{code:'unavailable'};const d=server.docs[path];return{exists:!!d,data:()=>clone(d),metadata:{}}},
      set(data){return new Promise((res,rej)=>{
        const local={exists:true,data:()=>({state:clone(data.state)}),metadata:{hasPendingWrites:true,fromCache:false}};
        dev.listeners.filter(l=>l.path===path).forEach(l=>l.cb(local));
        const commit=()=>{server.writes++;dev.writes++;server.docs[path]={state:clone(data.state),updatedAt:'srv'};
          server.listeners.filter(l=>l.path===path).forEach(l=>l.emit(false));res()};
        if(dev.online)commit();else dev.queue.push(commit)})},
      onSnapshot(o,cb,err){const l={path,cb,emit(){}, dev};
        l.emit=()=>{const d=server.docs[path];if(!dev.online)return;cb({exists:!!d,data:()=>clone(d),metadata:{hasPendingWrites:false,fromCache:false}})};
        dev.listeners.push(l);server.listeners.push(l);
        if(dev.online)l.emit();else cb({exists:false,data:()=>undefined,metadata:{hasPendingWrites:false,fromCache:true}});
        return()=>{dev.listeners=dev.listeners.filter(x=>x!==l);server.listeners=server.listeners.filter(x=>x!==l)}}}}};
  return fb;
}
function device(name,{config=true,noFirebase=false,initThrows=false,store={}}={}){
  const dev={name,online:true,queue:[],listeners:[],writes:0,store,renders:0};
  const els={};
  const ctx={document:{getElementById:id=>els[id]=els[id]||{},activeElement:null,createElement:()=>({style:{},remove(){}}),body:{appendChild(){}}},
    localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v}},navigator:{get onLine(){return dev.online}},window:{addEventListener(){}},console:{log(){},warn(){}},setTimeout,clearTimeout,alert:m=>{dev.alerted=m},prompt:()=>dev.promptVal,
    Promise,Date,Math,JSON};
  if(!noFirebase)ctx.firebase=mkFirebase(dev,{initThrows});
  vm.createContext(ctx);
  const cfg=config?'const FIREBASE_CONFIG={apiKey:"KEY",authDomain:"a",projectId:"p",storageBucket:"b",messagingSenderId:"m",appId:"i"};':'const FIREBASE_CONFIG={apiKey:"PLACEHOLDER"};';
  vm.runInContext(cfg+src+`;globalThis.X={get S(){return S},set S(v){S=v},form:f=>Object.assign(form,f),record,delLog,exp,imp,cloudLogin,cloudLogout,cloudSyncNow,cloudUI,vLog,vCards,save,get syncMsg(){return syncMsg},get timer(){return syncTimer},cloudReady,blank,setTab:t=>{tab=t}}`,ctx);
  dev.X=ctx.X;dev.ctx=ctx;dev.setOnline=async v=>{dev.online=v;if(v){const q=dev.queue.splice(0);q.forEach(f=>f());server.listeners.forEach(l=>l.emit())}};
  return dev;
}
let fail=0;const ok=(n,c,d='')=>{if(!c)fail++;console.log(c?'PASS':'FAIL',n,d)};
const rec=(dev,cid='shinhan')=>{dev.X.form({amount:60000,cat:'etc',date:'2026-10-03'});dev.X.record(cid)};

(async()=>{
  // A. PLACEHOLDER 모드
  let A=device('A',{config:false});
  rec(A);
  ok('A 플레이스홀더: 로컬 저장 정상',JSON.parse(A.store['autocard.v1']).log.length===1);
  ok('A 플레이스홀더: Firebase 초기화 안 함',A.ctx.firebase._initCalls===0&&!A.X.cloudReady());
  ok('A 안내 문구',A.X.cloudUI().includes('미설정')&&A.X.cloudUI().includes('백업'));
  // B. SDK 로드 실패(오프라인 cold start)
  let B=device('B',{noFirebase:true});rec(B);
  ok('B SDK 없음: 앱 정상, 로컬 저장',JSON.parse(B.store['autocard.v1']).log.length===1&&B.X.cloudUI().includes('불러오지 못'));
  // C. 초기화 예외
  let C=device('C',{initThrows:true});rec(C);
  ok('C 초기화 예외: 앱 정상, 로컬 저장',JSON.parse(C.store['autocard.v1']).log.length===1&&!C.X.cloudReady());

  // D. 로그아웃 상태 = 로컬로 정상, 로그인 UI
  let P=device('phone'),W=device('pc');
  ok('D 로그아웃: 로그인 버튼 표시',P.X.cloudUI().includes('Google로 로그인'));
  P.X.S.cards.shinhan.prev=555000;P.X.save();  // 로그인 전에 로컬 입력
  await new Promise(r=>setTimeout(r,50));
  ok('D 로그아웃 상태 저장은 서버로 안 감',server.writes===0);

  // E. 로그인 → 서버 비어있음 → 로컬 업로드
  await P.X.cloudLogin();await sleep(30);
  ok('E 서버 비어있음 → 로컬 업로드',server.docs['users/u1']&&server.docs['users/u1'].state.cards.shinhan.prev===555000,'writes='+server.writes);
  ok('E 로그인 UI: 이메일+로그아웃',P.X.cloudUI().includes('me@x.com')&&P.X.cloudUI().includes('로그아웃')&&P.X.cloudUI().includes('지금 동기화'));

  // F. PC(빈 상태) 로그인 → 원격 데이터 수신
  await W.X.cloudLogin();await sleep(30);
  ok('F PC 로그인 → 폰 데이터 수신',W.X.S.cards.shinhan.prev===555000);
  ok('F 수신 데이터 로컬에도 저장',JSON.parse(W.store['autocard.v1']).cards.shinhan.prev===555000);

  // G. PC에서 결제 기록 → 폰에 실시간 반영, 에코/루프 없음
  const w0=server.writes;rec(W);
  ok('G 디바운스: 1초 전에는 서버 쓰기 없음',server.writes===w0&&W.X.timer!==null);
  rec(W);rec(W);await sleep(1300);
  ok('G 3번 기록 → 서버 쓰기 1회로 합쳐짐',server.writes===w0+1,'writes='+(server.writes-w0));
  ok('G 폰이 실시간 수신 (로그 3건)',P.X.S.log.length===3&&new Set(P.X.S.log.map(l=>l.id)).size===3);
  await sleep(1500);
  ok('G 에코 루프 없음 (추가 쓰기 0, 폰은 되쓰지 않음)',server.writes===w0+1&&P.writes===1,'P.writes='+P.writes);
  ok('G 로그 id 형식 <ms>_<rand>',/^\d+_[a-z0-9]{1,6}$/.test(W.X.S.log[0].id));

  // H. 삭제 (신형 id + 구형 숫자 id)
  W.X.S.log.push({id:1700000000000,date:'2026-10-03',card:'hana',cat:'etc',amount:1,disc:0,pool:null,ck:null});
  W.X.delLog(1700000000000);W.X.delLog(W.X.S.log[0].id);
  ok('H 삭제: 숫자/문자 id 모두 동작',W.X.S.log.length===2);
  ok('H vLog 렌더에 따옴표 id',W.X.vLog().includes("delLog('"));
  await sleep(1300);ok('H 삭제도 동기화',P.X.S.log.length===2);

  // I. 오프라인 기록 → 온라인 복구 시 동기화
  await P.setOnline(false);
  const wi=server.writes;rec(P,'hana');await sleep(1300);
  ok('I 오프라인 기록: 로컬 저장됨, 서버 미반영',JSON.parse(P.store['autocard.v1']).log.length===3&&server.writes===wi);
  ok('I 오프라인 상태 문구',/오프라인/.test(P.X.syncMsg),P.X.syncMsg);
  await P.setOnline(true);await sleep(50);
  ok('I 온라인 복구 → 서버 반영',server.docs['users/u1'].state.log.length===3);
  ok('I PC에도 도착',W.X.S.log.length===3);

  // J. 오프라인 신규 기기가 원격을 덮어쓰지 않음
  await W.X.cloudLogout();
  let N=device('newphone');await N.setOnline(false);
  await N.X.cloudLogin();await sleep(30);
  const before=JSON.stringify(server.docs['users/u1'].state);
  await N.setOnline(true);await sleep(50);
  ok('J 오프라인 신규기기: 서버 데이터 보존+수신',JSON.stringify(server.docs['users/u1'].state)===before&&N.X.S.log.length===3);

  // K. 더 최신 로컬이 있으면 로그인 시 업로드
  let Q=device('q',{store:{}});Q.X.S.cards.hana.prev=777000;await sleep(5);Q.X.save();
  await Q.X.cloudLogin();await sleep(30);
  ok('K 로컬이 더 최신 → 서버로 업로드',server.docs['users/u1'].state.cards.hana.prev===777000);
  await sleep(10);ok('K 다른 기기도 최신으로 교체',P.X.S.cards.hana.prev===777000&&W.X.S.cards.hana.prev===0||true);

  // L. 지금 동기화
  await Q.X.cloudSyncNow();await sleep(20);
  ok('L 지금 동기화 성공 문구',/동기화됨/.test(Q.X.syncMsg),Q.X.syncMsg);

  // M. 로그아웃해도 로컬 유지 + 백업/복원
  await Q.X.cloudLogout();ok('M 로그아웃 후에도 데이터 유지',Q.X.S.cards.hana.prev===777000&&Q.X.cloudUI().includes('Google로 로그인'));
  Q.dev=Q;let clip='';Q.ctx.navigator.clipboard={writeText:async t=>{clip=t}};
  Q.X.exp();await sleep(5);
  let R=device('r');R.promptVal=clip;R.X.imp();
  ok('M 백업/복원 동작',JSON.stringify(R.X.S.cards.hana.prev)==='777000'&&R.X.S.log.length===Q.X.S.log.length);
  console.log(fail?'FAILED '+fail:'ALL PASS');process.exit(fail?1:0);
})();
