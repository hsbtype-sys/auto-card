// 가맹점 심층 분석 페이지(merchant.html): 키는 로그인 후 Firestore에서, 조회는 온누리 API(헤더 인증), 현재 위치→시·도 추정
const fs=require('fs'),vm=require('vm'),path=require('path');
const HTML=fs.readFileSync(path.join(__dirname,'..','merchant.html'),'utf8');
const SRC=HTML.match(/<script>([\s\S]*)<\/script>/)[1];
let pass=0,fail=0;const ok=(n,c,d='')=>{if(c)pass++;else{fail++;console.log('FAIL',n,d)}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const KEY='a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
const row=(o={})=>({'가맹점명':'힛트농산물','소속 시장명(또는 상점가)':'노암길골목형상점가','소재지':'강원','취급품목':'과일','지류형 가맹 여부':'Y','디지털형 가맹 여부':'Y','가맹 등록년도':2025,...o});
const jres=(status,body)=>({status,ok:status>=200&&status<300,json:async()=>body});
const page=(rows,total)=>jres(200,{currentCount:rows.length,data:rows,matchCount:total??rows.length,page:1,perPage:20,totalCount:225803});
const SWG={paths:{'/3060079/v1/uddi:old':{get:{summary:'소상공인시장진흥공단_전국 온누리상품권 가맹점 현황_20250731'}},'/3060079/v1/uddi:new':{get:{summary:'소상공인시장진흥공단_전국 온누리상품권 가맹점 현황_20260731'}},'/3060079/v1/uddi:mid':{get:{summary:'소상공인시장진흥공단_전국 온누리상품권 가맹점 현황_20240731'}}}};
// 가짜 브라우저 환경 (+ 로그인/Firestore/geolocation/API)
function boot({user=null,doc,docErr,fetchImpl,geo,noFirebase=false}={}){
  const els={},logs=[],fetches=[];
  const authCbs=[];
  const fb=noFirebase?undefined:(()=>{const f={initializeApp(){},auth(){return{onAuthStateChanged(cb){authCbs.push(cb)},getRedirectResult:()=>Promise.resolve(),signInWithPopup:async()=>{const u={uid:'u1',email:'a@x.com'};authCbs.forEach(c=>c(u))},signInWithRedirect(){}}},
    firestore(){return{doc:p=>({get:async()=>{if(docErr){throw docErr}if(!doc)return{exists:false,data:()=>({})};return{exists:true,data:()=>doc}}})}}};f.auth.GoogleAuthProvider=function(){};return f})();
  const ctx={document:{getElementById:id=>els[id]=els[id]||{value:''}},navigator:{geolocation:geo},console:{log:(...a)=>logs.push(a.join(' ')),warn:(...a)=>logs.push(a.join(' ')),error:(...a)=>logs.push(a.join(' '))},
    fetch:async(u,o)=>{fetches.push({url:String(u),opt:o});return fetchImpl(String(u),o)},AbortController,URLSearchParams,setTimeout,clearTimeout,Promise,JSON,Math,Date,Number,Object,Array,String,isFinite};
  if(fb)ctx.firebase=fb;
  vm.createContext(ctx);
  vm.runInContext(SRC+';globalThis.M={S,render,esc,guessSido,buildUrl,latestPath,normRow,search,locate,onSearch,setQ,loadKey,login,resolvePath,SIDO,SIDO_PTS,KEY_RE,PER_PAGE,authBox,resultsBox,fmtDate}',ctx);
  const html=()=>els.app.innerHTML;
  const signIn=async()=>{authCbs.forEach(c=>c(user));await sleep(20)};
  return{M:ctx.M,ctx,els,logs,fetches,html,signIn,text:()=>html().replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')};
}
const api=(rows,total)=>async(u)=>u.includes('infuser.odcloud.kr')?jres(200,SWG):page(rows,total);

(async()=>{
  // ── 순수 함수 ──
  { const b=boot({fetchImpl:api([])});const M=b.M;
    const u=new URL(M.buildUrl('/3060079/v1/uddi:x',{name:'약국',sido:'경기',market:'남문시장',page:2}));
    ok('주소: 기본 파라미터(page, perPage=20, returnType=JSON)',u.searchParams.get('page')==='2'&&u.searchParams.get('perPage')==='20'&&u.searchParams.get('returnType')==='JSON');
    ok('주소: 가맹점명 LIKE · 소재지 EQ · 시장명 LIKE 조건',u.searchParams.get('cond[가맹점명::LIKE]')==='약국'&&u.searchParams.get('cond[소재지::EQ]')==='경기'&&u.searchParams.get('cond[소속 시장명(또는 상점가)::LIKE]')==='남문시장');
    ok('주소에 인증키(serviceKey)가 들어가지 않음',!/serviceKey|key=/i.test(M.buildUrl('/p',{name:'a',page:1})));
    ok('빈 조건은 주소에서 빠짐',(()=>{const x=new URL(M.buildUrl('/p',{name:'a',sido:'',market:'',page:1}));return !x.searchParams.has('cond[소재지::EQ]')&&!x.searchParams.has('cond[소속 시장명(또는 상점가)::LIKE]')})());
    ok('특수문자 검색어가 주소를 깨지 않음(& = # % 공백)',(()=>{const x=new URL(M.buildUrl('/p',{name:'a&b=c#d%e f',page:1}));return x.searchParams.get('cond[가맹점명::LIKE]')==='a&b=c#d%e f'&&x.searchParams.get('perPage')==='20'})());
    ok('최신 데이터 버전 자동 선택(2026-07-31)',M.latestPath(SWG).path==='/3060079/v1/uddi:new'&&M.latestPath(SWG).date==='20260731');
    ok('swagger가 비정상이면 null',M.latestPath(null)===null&&M.latestPath({paths:{'/x':{get:{summary:'날짜없음'}}}})===null);
    ok('날짜 표기 20260731 → 2026-07-31',M.fmtDate('20260731')==='2026-07-31'&&M.fmtDate('')==='');
    const n=M.normRow(row({'취급품목':null,'지류형 가맹 여부':'N'}));ok('행 정리: Y/N → 불리언, null 유지',n.paper===false&&n.digital===true&&n.item===null&&n.year===2025&&n.name==='힛트농산물');
    ok('행 정리: 빈 객체/null도 안전',(()=>{const a=M.normRow(null),c=M.normRow({});return a.paper===false&&c.name===undefined})());
    ok('키 형식 검증(영숫자 20~200자)',M.KEY_RE.test(KEY)&&!M.KEY_RE.test('짧음')&&!M.KEY_RE.test('has space in key 1234567890123456')&&!M.KEY_RE.test(''));
    ok('시·도 목록 16개 + "전남광주" 표기(통합 후 데이터 값)',M.SIDO.length===16&&M.SIDO.some(x=>x[0]==='전남광주'&&x[1]==='전남·광주')&&!M.SIDO.some(x=>x[0]==='광주'||x[0]==='전남'));
    ok('esc: HTML 특수문자 이스케이프',M.esc('<img src=x onerror=alert(1)>"\'&')==='&lt;img src=x onerror=alert(1)&gt;&quot;&#39;&amp;'&&M.esc(null)==='')}
  // ── 현재 위치 → 시·도 추정 (대표 지점 근처가 아닌 실제 명소 좌표로 검증) ──
  { const M=boot({fetchImpl:api([])}).M;
    const cases=[['광화문',37.5759,126.9769,'서울'],['잠실',37.5133,127.1001,'서울'],['여의도',37.5219,126.9245,'서울'],['도봉산 입구',37.6890,127.0460,'서울'],
     ['판교',37.3947,127.1112,'경기'],['분당 서현',37.3850,127.1233,'경기'],['수원역',37.2660,127.0000,'경기'],['일산 호수공원',37.6580,126.7690,'경기'],['동탄',37.2000,127.0960,'경기'],['평택역',36.9910,127.0890,'경기'],['가평',37.8315,127.5095,'경기'],['의정부역',37.7360,127.0460,'경기'],
     ['송도 센트럴파크',37.3922,126.6397,'인천'],['인천공항',37.4602,126.4407,'인천'],['부평역',37.4900,126.7240,'인천'],
     ['속초해변',38.1910,128.6040,'강원'],['강릉 경포',37.8050,128.9080,'강원'],['춘천역',37.8840,127.7170,'강원'],['원주 시청',37.3420,127.9470,'강원'],
     ['청주 오송',36.6200,127.3280,'충북'],['충주',36.9910,127.9260,'충북'],['천안역',36.8100,127.1470,'충남'],['대천해수욕장',36.3050,126.5150,'충남'],['당진',36.8898,126.6296,'충남'],
     ['대전역',36.3326,127.4342,'대전'],['대전 유성온천',36.3540,127.3410,'대전'],['세종시청',36.4801,127.2587,'세종'],
     ['전주 한옥마을',35.8150,127.1530,'전북'],['군산',35.9676,126.7369,'전북'],['남원',35.4164,127.3904,'전북'],
     ['광주 상무지구',35.1531,126.8509,'전남광주'],['목포 하당',34.8100,126.4300,'전남광주'],['여수 엑스포',34.7430,127.7457,'전남광주'],['순천만',34.8860,127.5090,'전남광주'],['나주',35.0160,126.7107,'전남광주'],
     ['포항 영일대',36.0560,129.3790,'경북'],['경주 불국사',35.7900,129.3320,'경북'],['안동',36.5684,128.7294,'경북'],['구미',36.1195,128.3446,'경북'],
     ['대구 동성로',35.8690,128.5940,'대구'],['울산 삼산',35.5380,129.3380,'울산'],
     ['해운대',35.1587,129.1604,'부산'],['서면',35.1578,129.0600,'부산'],['김해공항',35.1795,128.9382,'부산'],
     ['창원 상남',35.2220,128.6890,'경남'],['진주성',35.1920,128.0830,'경남'],['통영',34.8544,128.4331,'경남'],['김해 시청',35.2285,128.8894,'경남'],
     ['제주공항',33.5070,126.4930,'제주'],['서귀포 중문',33.2530,126.4120,'제주']];
    const bad=cases.filter(([n,la,lo,e])=>M.guessSido(la,lo)!==e).map(([n,la,lo,e])=>`${n}→${M.guessSido(la,lo)}(기대 ${e})`);
    ok(`현재 위치→시·도 추정: 실제 명소 ${cases.length}곳 정확도`,bad.length===0,bad.join(', '));
    ok('해외·바다 한가운데는 null(도쿄, 뉴욕, 동해 먼 바다)',M.guessSido(35.68,139.69)===null&&M.guessSido(40.71,-74.0)===null&&M.guessSido(37.5,134)===null);
    ok('잘못된 입력은 null(NaN, 문자열, undefined)',M.guessSido(NaN,127)===null&&M.guessSido('37','127')===null&&M.guessSido(undefined,undefined)===null);
    ok('추정 결과는 항상 조회 가능한 시·도 값',Object.keys(M.SIDO_PTS).every(k=>M.SIDO.some(x=>x[0]===k))&&M.SIDO.every(x=>M.SIDO_PTS[x[0]]))}
  // ── 로그인 · 키 읽기 ──
  { let b=boot({user:null,fetchImpl:api([])});await b.signIn();
    ok('로그아웃 상태: 로그인 안내, 입력칸 비활성, 키 없음',b.M.S.auth==='out'&&/로그인이 필요해요/.test(b.text())&&b.html().includes('disabled')&&b.M.S.key==='');
    b=boot({noFirebase:true,fetchImpl:api([])});await sleep(10);ok('로그인 기능 로드 실패 → 안내(앱은 안 죽음)',b.M.S.auth==='nofirebase'&&/로그인 기능을 불러오지 못했어요/.test(b.text()));
    b=boot({user:{uid:'u1',email:'a@x.com'},doc:{onnuriKey:KEY},fetchImpl:api([])});await b.signIn();
    ok('로그인 후 Firestore config/odcloud에서 키 읽기 → 조회 가능 상태',b.M.S.auth==='in'&&b.M.S.keyStatus==='ok'&&b.M.S.key===KEY);
    ok('키가 화면 HTML 어디에도 없음',!b.html().includes(KEY)&&!b.text().includes(KEY));
    ok('키가 콘솔 로그에 없음',!b.logs.join('\n').includes(KEY));
    ok('조회 입력칸이 활성화됨(disabled 없음)',!/<input id="q_name"[^>]*disabled/.test(b.html()));
    b=boot({user:{uid:'u1'},doc:null,fetchImpl:api([])});await b.signIn();ok('키 문서가 없으면 관리자 안내',b.M.S.keyStatus==='missing'&&/config \/ odcloud/.test(b.text())&&b.M.S.key==='');
    b=boot({user:{uid:'u1'},doc:{onnuriKey:'짧음'},fetchImpl:api([])});await b.signIn();ok('키 형식이 이상하면 사용 안 함',b.M.S.keyStatus==='invalid'&&b.M.S.key==='');
    b=boot({user:{uid:'u1'},doc:{other:1},fetchImpl:api([])});await b.signIn();ok('키 필드가 없으면 invalid',b.M.S.keyStatus==='invalid');
    b=boot({user:{uid:'u1'},docErr:{code:'permission-denied'},fetchImpl:api([])});await b.signIn();ok('권한 없음(규칙 거부) → 전용 안내',b.M.S.keyStatus==='denied'&&/읽을 권한이 없어요/.test(b.text()));
    b=boot({user:{uid:'u1'},docErr:{code:'unavailable'},fetchImpl:api([])});await b.signIn();ok('네트워크 오류 → 새로고침 안내',b.M.S.keyStatus==='error'&&/불러오지 못했어요/.test(b.text()));
    b=boot({user:{uid:'u1'},doc:{onnuriKey:'  '+KEY+'  '},fetchImpl:api([])});await b.signIn();ok('키 앞뒤 공백 제거',b.M.S.key===KEY)}
  // ── 조회 동작 ──
  { const rows=[row({'가맹점명':'힛트농산물'}),row({'가맹점명':'힐스템생활건강','취급품목':null,'지류형 가맹 여부':'Y','디지털형 가맹 여부':'N'})];
    let b=boot({user:{uid:'u1'},doc:{onnuriKey:KEY},fetchImpl:api(rows,2)});await b.signIn();
    b.M.setQ('name','힛트');b.M.setQ('sido','강원');await b.M.search(false);
    const call=b.fetches.find(f=>f.url.includes('api.odcloud.kr'));
    ok('API 호출: 인증은 Authorization 헤더(Infuser <키>), 주소엔 키 없음',call.opt.headers.Authorization==='Infuser '+KEY&&!call.url.includes(KEY)&&!/serviceKey/i.test(call.url));
    ok('API 호출: 최신 데이터 경로(swagger에서 선택) + 조건',call.url.includes('/3060079/v1/uddi:new')&&call.url.includes(encodeURIComponent('cond[가맹점명::LIKE]'))&&call.url.includes('=%EA%B0%95%EC%9B%90'));
    ok('swagger는 인증 없이(키를 보내지 않음) 조회',!(b.fetches.find(f=>f.url.includes('infuser'))||{opt:{}}).opt.headers);
    ok('결과 목록: 가게명·시장명·시도·취급품목',/힛트농산물/.test(b.text())&&/노암길골목형상점가/.test(b.text())&&/강원/.test(b.text())&&/과일/.test(b.text()));
    ok('결과: 지류/디지털 가능 여부, 취급품목 없음 표시',/지류형 가능/.test(b.text())&&/디지털 가능/.test(b.text())&&/디지털 정보 없음/.test(b.text())&&/취급품목 정보 없음/.test(b.text()));
    ok('결과: 총 건수와 데이터 기준일, 주소 한계 안내',/총 2곳 중 2곳 표시/.test(b.text())&&/데이터 기준 2026-07-31/.test(b.text())&&/번지 주소가 없어/.test(b.text()));
    ok('결과 화면에도 키가 없고 로그에도 없음',!b.html().includes(KEY)&&!b.logs.join('\n').includes(KEY));
    const xs=boot({user:{uid:'u1'},doc:{onnuriKey:KEY},fetchImpl:api([row({'가맹점명':'<img src=x onerror=alert(1)>','소속 시장명(또는 상점가)':'<script>alert(2)</script>'})],1)});await xs.signIn();xs.M.setQ('name','a');await xs.M.search(false);
    ok('XSS 방어(재확인): <img>, <script> 태그가 그대로 들어가지 않음',!xs.html().includes('<img src=x')&&!xs.html().includes('<script>alert(2)')&&xs.html().includes('&lt;img src=x')&&xs.html().includes('&lt;script&gt;'));
    // 더 보기
    const ALLROWS=Array.from({length:45},(_,i)=>row({'가맹점명':'가게'+i}));
    const b2=boot({user:{uid:'u1'},doc:{onnuriKey:KEY},fetchImpl:async(u)=>{if(u.includes('infuser'))return jres(200,SWG);const pg=+new URL(u).searchParams.get('page');return page(ALLROWS.slice((pg-1)*20,pg*20),45)}});await b2.signIn();
    b2.M.setQ('name','가게');await b2.M.search(false);
    ok('더 보기 버튼: 남은 건수 표시(45 중 20 → 25곳 남음)',/더 보기 \(25곳 남음\)/.test(b2.text())&&b2.M.S.rows.length===20);
    await b2.M.search(true);ok('더 보기: 다음 페이지를 이어 붙임(page=2, 40곳, 중복 없음)',b2.M.S.rows.length===40&&b2.M.S.page===2&&new Set(b2.M.S.rows.map(r=>r.name)).size===40&&/더 보기 \(5곳 남음\)/.test(b2.text()));
    ok('2페이지 요청 주소에 page=2',new URL(b2.fetches.filter(f=>f.url.includes('odcloud.kr/api')).pop().url).searchParams.get('page')==='2');
    await b2.M.search(true);ok('마지막 페이지(45곳) 이후엔 더 보기 버튼 없음',b2.M.S.rows.length===45&&!/더 보기/.test(b2.text())&&/총 45곳 중 45곳 표시/.test(b2.text()));
    await b2.M.search(false);ok('새로 조회하면 1페이지부터 다시(20곳)',b2.M.S.rows.length===20&&b2.M.S.page===1);
    const big=boot({user:{uid:'u1'},doc:{onnuriKey:KEY},fetchImpl:api([row()],771)});await big.signIn();big.M.setQ('name','약국');await big.M.search(false);
    ok('많은 결과(771곳) → "같은 이름의 가게가 많아요" 좁히기 안내',/같은 이름의 가게가 많아요/.test(big.text())&&/총 771곳/.test(big.text()));
    const none=boot({user:{uid:'u1'},doc:{onnuriKey:KEY},fetchImpl:api([],0)});await none.signIn();none.M.setQ('name','없는가게');await none.M.search(false);
    ok('결과 0건 → 안내(일부만 입력/시장명으로/공식 조회)',/조회된 가맹점이 없어요/.test(none.text())&&/가게명의 일부만/.test(none.text()))}
  // ── 입력 검증 · 오류 처리 ──
  { const mk=(fetchImpl)=>boot({user:{uid:'u1'},doc:{onnuriKey:KEY},fetchImpl});
    let b=mk(api([row()]));await b.signIn();
    b.M.setQ('sido','경기');await b.M.search(false);ok('시·도만 고르고 검색 → 호출 없이 안내(결과 수만 건 방지)',/가게명이나 시장·상점가명을 입력해 주세요/.test(b.text())&&b.fetches.length===0);
    b.M.setQ('name','x'.repeat(31));await b.M.search(false);ok('31자 이상 검색어 → 30자 안내, 호출 없음',/30자 이내/.test(b.text())&&b.fetches.length===0);
    b.M.setQ('name','   ');b.M.setQ('market','  ');await b.M.search(false);ok('공백만 입력 → 호출 없음',b.fetches.length===0);
    b.M.setQ('name','');b.M.setQ('market','남문시장');await b.M.search(false);{const u=new URL(b.fetches.at(-1).url);ok('시장·상점가명만으로도 조회 가능(가게명 조건 없이)',u.searchParams.get('cond[소속 시장명(또는 상점가)::LIKE]')==='남문시장'&&!u.searchParams.has('cond[가맹점명::LIKE]'),b.fetches.at(-1).url)}
    for(const [st,re] of [[401,/키가 유효하지 않아요/],[403,/키가 유효하지 않아요/],[429,/조회 가능한 횟수를 넘었어요/],[500,/코드 500/]]){
      const x=mk(async(u)=>u.includes('infuser')?jres(200,SWG):jres(st,{}));await x.signIn();x.M.setQ('name','약국');await x.M.search(false);
      ok(`HTTP ${st} → 사용자 안내(키 미포함)`,re.test(x.text())&&!x.html().includes(KEY)&&!x.logs.join('').includes(KEY)&&x.M.S.rows.length===0,x.text().slice(0,200))}
    const nerr=mk(async(u)=>{if(u.includes('infuser'))return jres(200,SWG);throw new TypeError('Failed to fetch '+KEY)});await nerr.signIn();nerr.M.setQ('name','약국');await nerr.M.search(false);
    ok('네트워크 오류 → 안내, 오류 원문(키 포함 가능)을 화면에 노출하지 않음',/네트워크 오류로 조회하지 못했어요/.test(nerr.text())&&!nerr.html().includes(KEY));
    const body=mk(async(u)=>u.includes('infuser')?jres(200,SWG):jres(200,{code:-4,msg:'SERVICE KEY IS NOT REGISTERED'}));await body.signIn();body.M.setQ('name','약국');await body.M.search(false);
    ok('200이어도 본문 code<0이면 오류 처리',/조회 중 오류가 났어요 \(코드 -4\)/.test(body.text())&&body.M.S.rows.length===0);
    const sw=mk(async(u)=>{if(u.includes('infuser'))throw new Error('swagger down');return page([row()],1)});await sw.signIn();sw.M.setQ('name','힛트');await sw.M.search(false);
    ok('swagger를 못 읽어도 내장 경로(2026-07-31)로 조회 계속',sw.M.S.rows.length===1&&sw.fetches.at(-1).url.includes('uddi:2fec9daf-aa5a-4139-9109-e5541b4a6bae')&&sw.M.S.dataDate==='20260731');
    const c1=sw.fetches.filter(f=>f.url.includes('infuser')).length;await sw.M.search(false);ok('swagger 재호출 없음(캐시)',sw.fetches.filter(f=>f.url.includes('infuser')).length===c1);
    const out=boot({user:null,fetchImpl:api([row()])});await out.signIn();out.M.setQ('name','약국');await out.M.search(false);ok('로그인 안 하면 조회 불가(호출 없음)',out.fetches.length===0)}
  // ── 현재 위치 버튼 ──
  { const geo=(lat,lon)=>({getCurrentPosition:(ok_,err)=>ok_({coords:{latitude:lat,longitude:lon}})});
    let b=boot({user:{uid:'u1'},doc:{onnuriKey:KEY},fetchImpl:api([]),geo:geo(37.3947,127.1112)});await b.signIn();b.M.locate();
    ok('현재 위치(판교) → 시·도 "경기"를 자동 선택하고 추정임을 안내',b.M.S.q.sido==='경기'&&/경기\(으\)로 추정했어요/.test(b.text())&&/틀리면 직접 바꿔 주세요/.test(b.text()));
    ok('위치 정보는 외부로 보내지 않음(위치 때문에 발생한 네트워크 요청 없음)',b.fetches.length===0&&/어디로도 보내지 않아요/.test(b.text()));
    ok('선택 상자에 반영',b.html().includes('<option value="경기" selected>'));
    b=boot({user:{uid:'u1'},doc:{onnuriKey:KEY},fetchImpl:api([]),geo:geo(34.81,126.43)});await b.signIn();b.M.locate();ok('목포 → "전남·광주"(값 전남광주)',b.M.S.q.sido==='전남광주'&&/전남·광주\(으\)로 추정/.test(b.text()));
    b=boot({user:{uid:'u1'},doc:{onnuriKey:KEY},fetchImpl:api([]),geo:geo(35.68,139.69)});await b.signIn();b.M.locate();ok('국내가 아니면 직접 선택 안내, 기존 선택은 유지',b.M.S.q.sido===''&&/국내 시·도를 찾지 못했어요/.test(b.text()));
    for(const [code,re] of [[1,/위치 권한이 거부됐어요/],[3,/시간이 초과됐어요/],[2,/위치를 확인할 수 없어요/]]){
      b=boot({user:{uid:'u1'},doc:{onnuriKey:KEY},fetchImpl:api([]),geo:{getCurrentPosition:(s,e)=>e({code})}});await b.signIn();b.M.locate();ok(`위치 오류(code ${code}) → 안내`,re.test(b.text()))}
    b=boot({user:{uid:'u1'},doc:{onnuriKey:KEY},fetchImpl:api([]),geo:undefined});await b.signIn();b.M.locate();ok('위치 기능 미지원 브라우저 → 안내',/위치 기능을 지원하지 않아요/.test(b.text()))}
  // ── 화면 구성 ──
  { const b=boot({user:{uid:'u1'},doc:{onnuriKey:KEY},fetchImpl:api([])});await b.signIn();
    ok('경기지역화폐 영역: "준비 중" 안내 + 공식 조회 링크(새 창, noopener)',/경기지역화폐/.test(b.text())&&/준비 중/.test(b.text())&&/search\.konacard\.co\.kr\/payable-merchants/.test(b.html())&&/target="_blank" rel="noopener noreferrer"/.test(b.html()));
    ok('온누리 공식 사이트 링크',b.html().includes('https://www.onnuri.gift/'));
    ok('앱으로 돌아가는 링크(index.html)',/<a class="back" href="index\.html">/.test(HTML));
    ok('시·도 선택 상자: 전국 + 16개, "전남·광주" 표기',(b.html().match(/<option value="/g)||[]).length===17&&/전남·광주/.test(b.html()));
    ok('페이지에 API 키·서비스키가 하드코딩되어 있지 않음',!/a1a5b23b|Infuser [A-Za-z0-9]{20,}|serviceKey\s*[:=]\s*['"][A-Za-z0-9]{20,}/.test(HTML));
    ok('PWA: manifest·아이콘 링크, 뷰포트',/rel="manifest" href="manifest\.json"/.test(HTML)&&/name="viewport"/.test(HTML));
    ok('다크 모드 색상 변수 정의',/prefers-color-scheme:dark/.test(HTML))}
  console.log(`${fail?'FAILED':'PASS  '} merchant: ${pass} ok, ${fail} fail`);process.exit(fail?1:0);
})().catch(e=>{console.log('CRASH',e);process.exit(2)});
