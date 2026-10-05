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
function boot({user=null,doc,docErr,ggDoc,ggErr,fetchImpl,geo,noFirebase=false}={}){
  const els={},logs=[],fetches=[],keyHandlers=[];
  const authCbs=[];
  const fb=noFirebase?undefined:(()=>{const f={initializeApp(){},auth(){return{onAuthStateChanged(cb){authCbs.push(cb)},getRedirectResult:()=>Promise.resolve(),signInWithPopup:async()=>{const u={uid:'u1',email:'a@x.com'};authCbs.forEach(c=>c(u))},signInWithRedirect(){}}},
    firestore(){return{doc:p=>({get:async()=>{const isGg=p==='config/gg',e=isGg?ggErr:docErr,d=isGg?ggDoc:doc;if(e){throw e}if(!d)return{exists:false,data:()=>({})};return{exists:true,data:()=>d}}})}}};f.auth.GoogleAuthProvider=function(){};return f})();
  const ctx={document:{getElementById:id=>els[id]=els[id]||{value:''}},navigator:{geolocation:geo},console:{log:(...a)=>logs.push(a.join(' ')),warn:(...a)=>logs.push(a.join(' ')),error:(...a)=>logs.push(a.join(' '))},
    fetch:async(u,o)=>{fetches.push({url:String(u),opt:o});return fetchImpl(String(u),o)},AbortController,URLSearchParams,setTimeout,clearTimeout,Promise,JSON,Math,Date,Number,Object,Array,String,isFinite,window:{addEventListener:(e,f)=>{if(e==='keydown')keyHandlers.push(f)}}};
  if(fb)ctx.firebase=fb;
  vm.createContext(ctx);
  vm.runInContext(SRC+';globalThis.M={G,SIGUN,GG_URL,GG_KEY_RE,ggBuildUrl,ggParse,ggNorm,ggTypeLabel,ggOpen,ggStatusLabel,ggView,ggSearch,ggMore,ggSet,ggToggle,ggOpenStore,ggCloseStore,ggPopup,ggClean,guessSigun,distKm,fmtKm,loadGgKey,openStore,closeStore,storePopup,mapQuery,S,render,esc,guessSido,buildUrl,latestPath,normRow,search,locate,onSearch,setQ,loadKey,login,resolvePath,SIDO,SIDO_PTS,KEY_RE,PER_PAGE,authBox,resultsBox,fmtDate}',ctx);
  const html=()=>els.app.innerHTML;
  const signIn=async()=>{authCbs.forEach(c=>c(user));await sleep(20)};
  return{M:ctx.M,ctx,els,logs,fetches,html,keyHandlers,signIn,text:()=>html().replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')};
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
  // ── 가게 상세 팝업 ──
  { const R=[row({'가맹점명':'희망약국','소속 시장명(또는 상점가)':'풍덕천 골목형상점가','소재지':'경기','취급품목':'의약품','가맹 등록년도':2025}),
             row({'가맹점명':'봄약국','소속 시장명(또는 상점가)':null,'소재지':'전남광주','취급품목':null,'디지털형 가맹 여부':'N','지류형 가맹 여부':'Y','가맹 등록년도':null})];
    const mk=async()=>{const b=boot({user:{uid:'u1'},doc:{onnuriKey:KEY},fetchImpl:api(R,2)});await b.signIn();b.M.setQ('name','약국');await b.M.search(false);return b};
    let b=await mk();
    ok('목록 항목이 눌러서 상세를 여는 버튼(role=button, 키보드 접근, "상세 ›" 표시)',(b.html().match(/class="store tap" role="button" tabindex="0" onclick="openStore\(\d+\)"/g)||[]).length===2&&/상세 ›/.test(b.text()));
    ok('처음엔 팝업 없음',!/role="dialog"/.test(b.html())&&b.M.S.sel===-1);
    b.M.openStore(0);let t=b.text(),h=b.html();
    ok('팝업: 접근성 속성(role=dialog, aria-modal, aria-label)',/role="dialog" aria-modal="true" aria-label="희망약국 상세"/.test(h));
    ok('팝업: API 정보 6가지(시장·시도·취급품목·지류·디지털·등록년도)',/소속 시장·상점가 풍덕천 골목형상점가/.test(t)&&/시·도 경기/.test(t)&&/취급품목 의약품/.test(t)&&/지류형 가맹 가능/.test(t)&&/디지털형 가맹 가능/.test(t)&&/가맹 등록 2025년/.test(t),t);
    ok('팝업(디지털 가능): 앱에 카드 등록·충전·카드/QR 결제 안내',/디지털 온누리상품권으로 결제할 때/.test(t)&&/본인 카드를 등록해 충전/.test(t)&&/카드나 QR로 결제/.test(t));
    ok('팝업: "가게마다 되는 카드가 다른 게 아니라 앱 단위" + 카드사 목록(변경 가능 고지)',/가게마다 되는 카드가 다른 게 아니라/.test(t)&&/신한·현대·삼성·농협·하나·BC·KB국민·롯데로 알려져 있어요/.test(t)&&/바뀔 수 있으니/.test(t));
    ok('팝업: 공공데이터가 아닌 일반 정보라는 출처 고지 + 앱/공식 사이트 확인 권유',/공공데이터가 아니라 일반 정보예요/.test(t)&&/디지털온누리 앱이나 공식 사이트에서 확인/.test(t));
    ok('팝업: 카드 실적·혜택 제외 가능 주의',/카드 실적·혜택 참고/.test(t)&&/전월 실적이나 할인 혜택에서 제외될 수 있어요/.test(t)&&/카드사에 확인/.test(t));
    const dlg=h.slice(h.indexOf('role="dialog"'),h.indexOf('>닫기</button>',h.indexOf('role="dialog"')));   // 팝업 안쪽만
    const links=[...dlg.matchAll(/<a class="btn ghost" href="([^"]+)" target="_blank" rel="noopener noreferrer">([^<]+)<\/a>/g)].map(m=>[m[1],m[2]]);
    ok('지도 링크: 카카오맵·네이버지도에 "가게명 + 시장명"으로 검색',links.some(([u,n])=>n==='카카오맵에서 찾기 ↗'&&u==='https://map.kakao.com/?q='+encodeURIComponent('희망약국 풍덕천 골목형상점가'))&&links.some(([u,n])=>n==='네이버지도에서 찾기 ↗'&&u==='https://map.naver.com/p/search/'+encodeURIComponent('희망약국 풍덕천 골목형상점가')),JSON.stringify(links));
    ok('지도 링크: 새 창 + noopener noreferrer, 공식 사이트 링크 포함',links.length===3&&links.some(([u])=>u==='https://www.onnuri.gift/'));
    // 닫기
    b.M.closeStore();ok('닫기(closeStore) → 팝업 사라짐',b.M.S.sel===-1&&!/role="dialog"/.test(b.html()));
    b.M.openStore(0);ok('✕ 버튼과 아래 "닫기" 버튼, 바깥 영역 클릭 닫기 핸들러가 모두 있음',/id="pop_close" aria-label="닫기" onclick="closeStore\(\)"/.test(b.html())&&/<div class="pop" onclick="closeStore\(\)">/.test(b.html())&&/onclick="event\.stopPropagation\(\)"/.test(b.html())&&/>닫기<\/button><\/div><\/div><\/div>/.test(b.html()));
    ok('Esc 키 핸들러 등록, Esc로 닫힘',b.keyHandlers.length===1&&(b.keyHandlers[0]({key:'x'}),b.M.S.sel===0)&&(b.keyHandlers[0]({key:'Escape'}),b.M.S.sel===-1));
    ok('열릴 때 닫기 버튼에 포커스 이동 시도(키보드 사용자)',(()=>{let f=0;b.els.pop_close={focus(){f++}};b.M.openStore(0);return f===1})());
    // 디지털 불가 / 정보 없음 / 지역 표기
    b.M.openStore(1);t=b.text();
    ok('디지털 불가 가게: 카드 안내 대신 "디지털 가맹으로는 등록돼 있지 않아요" 안내',/디지털 가맹으로는 등록돼 있지 않아요/.test(t)&&!/본인 카드를 등록해 충전/.test(t)&&!/카드 실적·혜택 참고/.test(t)&&/디지털형 가맹 정보 없음/.test(t));
    ok('정보 없는 항목은 "정보 없음", 등록년도 없으면 줄 생략, 전남광주 → 전남·광주',/소속 시장·상점가 정보 없음/.test(t)&&/취급품목 정보 없음/.test(t)&&!/가맹 등록/.test(t)&&/시·도 전남·광주/.test(t));
    ok('시장명이 없으면 지도 검색어에 시·도를 사용(전남·광주 → "전남 광주")',b.M.mapQuery(b.M.S.rows[1])==='봄약국 전남 광주'&&b.M.mapQuery({name:'가',market:'나'})==='가 나'&&b.M.mapQuery({})==='');
    // 안전
    b.M.openStore(-1);b.M.openStore(99);b.M.openStore(NaN);b.M.openStore(undefined);ok('잘못된 번호로 열어도 오류 없이 무시',b.M.S.sel===1);
    b.M.closeStore();b.M.closeStore();ok('이미 닫혀 있을 때 또 닫아도 안전',b.M.S.sel===-1);
    // 이스케이프 (가게명·시장명·검색 링크)
    const evil=boot({user:{uid:'u1'},doc:{onnuriKey:KEY},fetchImpl:api([row({'가맹점명':'"><img src=x onerror=alert(1)>','소속 시장명(또는 상점가)':'<script>alert(2)</script>&q=1','취급품목':'<b>x</b>'})],1)});await evil.signIn();evil.M.setQ('name','a');await evil.M.search(false);evil.M.openStore(0);
    const eh=evil.html();
    ok('XSS 방어(팝업): 태그·따옴표가 이스케이프되고 링크가 깨지지 않음',!eh.includes('<img src=x')&&!eh.includes('<script>alert')&&!eh.includes('<b>x</b>')&&/aria-label="&quot;&gt;&lt;img/.test(eh));
    ok('XSS 방어(링크): 검색어가 URL 인코딩되어 속성 밖으로 못 나감',!/href="[^"]*[<>]/.test(eh)&&[...eh.matchAll(/href="(https:\/\/map\.[^"]+)"/g)].every(m=>!/[<>" ]/.test(m[1])));
    // 새 조회/더 보기 시 팝업 닫힘
    b=await mk();b.M.openStore(0);await b.M.search(false);ok('새로 조회하면 팝업이 닫힘',b.M.S.sel===-1);
    b.M.openStore(1);await b.M.search(true);ok('더 보기를 누르면 팝업이 닫힘',b.M.S.sel===-1);
    ok('팝업을 열고 닫아도 키·검색 상태는 그대로',(()=>{b.M.openStore(0);b.M.closeStore();return b.M.S.key===KEY&&b.M.S.q.name==='약국'})());
    ok('팝업이 열린 화면에도 키가 없음',(()=>{b.M.openStore(0);return !b.html().includes(KEY)&&!b.logs.join('\n').includes(KEY)})())}
  // ═════════ 경기지역화폐 (경기데이터드림) ═════════
  const GKEY='4b5b7651f0004801ab7a37ab6440907e';
  // 사장님이 붙여 주신 실제 응답 (사업자번호 포함 원본 형태)
  const REAL_ROW1={"CMPNM_NM":"지에스25 용인수지고","INDUTYPE_NM":"5202(편의점/편의점)","REFINE_LOTNO_ADDR":"경기도 용인시 수지구 풍덕천동 663-1번지 상가동 101호,102호","REFINE_ROADNM_ADDR":"경기도 용인시 수지구 수풍로 64","REFINE_ZIPNO":"16830","REFINE_WGS84_LOGT":127.0930495000,"REFINE_WGS84_LAT":37.3296936000,"SIGUN_NM":"용인시","BIZREGNO":"4071195475","INDUTYPE_CD":"5202","FRCS_NO":"911333525","LEAD_TAX_MAN_STATE":"폐업자","CLSBIZ_DAY":"20251011","LEAD_TAX_MAN_STATE_CD":"03"};
  const REAL_ROW2={"CMPNM_NM":"화용맛집철물","INDUTYPE_NM":"(일반음식점일반음식점)","REFINE_LOTNO_ADDR":"경기도 동두천시 보산동 410-3번지","REFINE_ROADNM_ADDR":"경기도 동두천시 중앙로373번길 4","REFINE_ZIPNO":"11311","REFINE_WGS84_LOGT":127.0585024000,"REFINE_WGS84_LAT":37.9132873000,"SIGUN_NM":"동두천시","BIZREGNO":"1273215769","INDUTYPE_CD":"2301","FRCS_NO":"971314232","LEAD_TAX_MAN_STATE":"폐업자","CLSBIZ_DAY":"20260722","LEAD_TAX_MAN_STATE_CD":"03"};
  const ggOkBody=(rows,total)=>({RegionMnyFacltStus:[{head:[{list_total_count:total??rows.length},{RESULT:{CODE:'INFO-000',MESSAGE:'정상 처리되었습니다.'}},{api_version:'1.0'}]},{row:rows}]});
  const GG_NONE={RESULT:{CODE:'INFO-200',MESSAGE:'해당하는 데이터가 없습니다.'}};
  const open=(o={})=>({...REAL_ROW1,CMPNM_NM:'새서울약국',INDUTYPE_NM:'(약국/약국)',LEAD_TAX_MAN_STATE:'계속사업자',LEAD_TAX_MAN_STATE_CD:'01',CLSBIZ_DAY:'',REFINE_ROADNM_ADDR:'경기도 용인시 수지구 수풍로 70',...o});
  // ── 순수 함수 ──
  { const M=boot({fetchImpl:api([])}).M;
    const u=new URL(M.ggBuildUrl(GKEY,{sigun:'용인시',name:'약국',page:2,size:500}));
    ok('경기 주소: 기본 파라미터(KEY, Type=json, pIndex, pSize) + 시군 · 상호 조건',u.origin+u.pathname==='https://openapi.gg.go.kr/RegionMnyFacltStus'&&u.searchParams.get('KEY')===GKEY&&u.searchParams.get('Type')==='json'&&u.searchParams.get('pIndex')==='2'&&u.searchParams.get('pSize')==='500'&&u.searchParams.get('SIGUN_NM')==='용인시'&&u.searchParams.get('CMPNM_NM')==='약국');
    ok('경기 주소: pSize는 1~1000으로 제한(5000 → 1000, 0 → 500 기본)',new URL(M.ggBuildUrl(GKEY,{name:'a',size:5000})).searchParams.get('pSize')==='1000'&&new URL(M.ggBuildUrl(GKEY,{name:'a',size:0})).searchParams.get('pSize')==='500');
    ok('경기 주소: 시군·상호가 비면 조건에서 빠짐',(()=>{const x=new URL(M.ggBuildUrl(GKEY,{page:1}));return !x.searchParams.has('SIGUN_NM')&&!x.searchParams.has('CMPNM_NM')})());
    ok('특수문자 제거(%약국% → 약국, *·_·따옴표·; 등) — 서버 500 오류를 일으켰던 입력',M.ggClean('%약국%')==='약국'&&M.ggClean('*약국*')==='약국'&&M.ggClean("a_b'c\"d;e<f>")==='abcdef'&&M.ggClean('  지에스25   용인  ')==='지에스25 용인'&&M.ggClean('%%')==='');
    const real=M.ggParse(ggOkBody([REAL_ROW1,REAL_ROW2],413762));
    ok('응답 해석: 실제 응답 형태(전체 413,762, 2행, INFO-000)',real.code==='INFO-000'&&real.total===413762&&real.rows.length===2&&real.rows[0].CMPNM_NM==='지에스25 용인수지고');
    ok('응답 해석: 데이터 없음 형태(최상위 RESULT INFO-200)',(()=>{const x=M.ggParse(GG_NONE);return x.code==='INFO-200'&&x.rows.length===0&&x.total===0})());
    ok('응답 해석: 이상한 응답은 BAD(앱이 죽지 않음)',M.ggParse(null).code==='BAD'&&M.ggParse({}).code==='BAD'&&M.ggParse('x').code==='BAD'&&M.ggParse({RegionMnyFacltStus:[]}).rows.length===0);
    const n=M.ggNorm(REAL_ROW1);
    ok('정리: 상호·업종("편의점")·도로명·지번·우편번호·시군·좌표·상태',n.name==='지에스25 용인수지고'&&n.type==='편의점'&&n.road==='경기도 용인시 수지구 수풍로 64'&&n.zip==='16830'&&n.sigun==='용인시'&&Math.abs(n.lat-37.3296936)<1e-9&&Math.abs(n.lon-127.0930495)<1e-9&&n.stCode==='03'&&n.closed==='20251011');
    ok('정리: 사업자등록번호·가맹점번호는 버림(화면·저장에 쓰지 않음)',!JSON.stringify(n).includes('4071195475')&&!JSON.stringify(n).includes('911333525')&&!('bizregno' in n));
    ok('업종 표기 정리: 코드(괄호) 제거, 중복 제거',M.ggTypeLabel('5202(편의점/편의점)')==='편의점'&&M.ggTypeLabel('(일반음식점일반음식점)')==='일반음식점'&&M.ggTypeLabel('일반음식점')==='일반음식점'&&M.ggTypeLabel('')===''&&M.ggTypeLabel(null)===''&&M.ggTypeLabel('2301(소매/의류)')==='소매/의류');
    ok('좌표가 이상하면 null(0, 문자, 범위 밖) — 거리 계산에서 제외',(()=>{const a=M.ggNorm({REFINE_WGS84_LAT:0,REFINE_WGS84_LOGT:0}),b=M.ggNorm({REFINE_WGS84_LAT:'x',REFINE_WGS84_LOGT:null}),c=M.ggNorm({REFINE_WGS84_LAT:127,REFINE_WGS84_LOGT:37});return a.lat===null&&b.lat===null&&c.lat===null&&M.ggNorm(null).name===undefined})());
    const st=c=>M.ggNorm({LEAD_TAX_MAN_STATE_CD:c,LEAD_TAX_MAN_STATE:'x',CLSBIZ_DAY:'20260722'});
    ok('영업 상태: 01 영업 중 / 02 휴업 / 03 폐업(폐업일 표시), 모르는 코드는 숨기지 않음',M.ggOpen(st('01'))&&!M.ggOpen(st('02'))&&!M.ggOpen(st('03'))&&M.ggOpen(st(''))&&M.ggOpen(st('99'))&&M.ggStatusLabel(st('03'))==='폐업 (2026-07-22)'&&M.ggStatusLabel(st('02'))==='휴업'&&M.ggStatusLabel(st('01'))==='영업 중'&&M.ggStatusLabel(st('99'))==='x');
    const d=M.distKm({lat:37.5665,lon:126.9780},{lat:37.2636,lon:127.0286});
    ok('거리 계산: 서울시청~수원시청 약 33~35km, 같은 점은 0',d>33&&d<35.5&&M.distKm({lat:37,lon:127},{lat:37,lon:127})===0);
    ok('거리 표기: 120m / 1.2km / 13km',M.fmtKm(0.123)==='120m'&&M.fmtKm(1.234)==='1.2km'&&M.fmtKm(12.6)==='13km'&&M.fmtKm(0.001)==='10m');
    ok('시·군 목록 31개, 중복 없음, 대표 시·군 포함',M.SIGUN.length===31&&new Set(M.SIGUN.map(x=>x[0])).size===31&&['수원시','용인시','연천군','가평군','양평군','화성시'].every(n=>M.SIGUN.some(x=>x[0]===n)));
    ok('시·군 기준점: 모두 경기도 좌표 범위, 넓은 시(용인·화성)는 여러 기준점',(()=>{const src=require('fs').readFileSync(require('path').join(__dirname,'..','merchant.html'),'utf8');const m=src.match(/const SIGUN_PTS=\{([\s\S]*?)\};\nconst SIGUN/)[1];const pts=[...m.matchAll(/\[(\d+\.\d+),(\d+\.\d+)\]/g)].map(x=>[+x[1],+x[2]]);return pts.length>=45&&pts.every(([a,b])=>a>36.9&&a<38.2&&b>126.5&&b<127.8)&&(m.match(/'용인시':\[([^\]]*\],?)+/)||[''])[0].split('],[').length>=3})());
    const sp=[['수지구청',37.3220,127.0950,'용인시'],['기흥역',37.2750,127.1160,'용인시'],['처인구 용인시청',37.2340,127.2010,'용인시'],['화성 향남',37.1330,126.9140,'화성시'],['병점역',37.2070,127.0330,'화성시'],['분당 서현',37.3850,127.1233,'성남시'],['판교',37.3947,127.1112,'성남시'],['수원역',37.2660,127.0000,'수원시'],['성남 모란',37.4320,127.1290,'성남시'],['의정부역',37.7360,127.0460,'의정부시'],['안양 평촌',37.3940,126.9560,'안양시'],['부천역',37.4840,126.7830,'부천시'],['평택역',36.9910,127.0890,'평택시'],['동두천',37.9036,127.0607,'동두천시'],['안산 중앙역',37.3160,126.8390,'안산시'],['일산 호수공원',37.6580,126.7690,'고양시'],['남양주 시청',37.6360,127.2165,'남양주시'],['수지구청',37.3220,127.0950,'용인시'],['파주 운정',37.7160,126.7430,'파주시'],['이천 시청',37.2720,127.4350,'이천시'],['김포 시청',37.6153,126.7156,'김포시'],['화성 동탄',37.2000,127.0960,'화성시'],['일산 킨텍스',37.6690,126.7450,'고양시'],['덕양구청',37.6370,126.8320,'고양시'],['여주',37.2983,127.6374,'여주시'],['연천',38.0966,127.0749,'연천군'],['가평 읍내',37.8315,127.5095,'가평군'],['양평 읍내',37.4917,127.4877,'양평군'],['포천',37.8949,127.2003,'포천시'],['안성',37.0080,127.2797,'안성시'],['하남 미사',37.5600,127.1900,'하남시']];
    const bad=sp.filter(([n,la,lo,e])=>M.guessSigun(la,lo)!==e).map(([n,la,lo,e])=>`${n}→${M.guessSigun(la,lo)}(기대 ${e})`);
    ok(`현재 위치→시·군 추정: 시·군 중심부 ${sp.length}곳`,bad.length===0,bad.join(', '));
    ok('경기도 밖(제주·부산·해외)이면 null, 잘못된 입력도 null',M.guessSigun(33.5,126.5)===null&&M.guessSigun(35.1,129.0)===null&&M.guessSigun(35.68,139.69)===null&&M.guessSigun(NaN,1)===null&&M.guessSigun('37','127')===null)}
  // ── 키 읽기 (config/gg) ──
  { const mk=(o)=>boot({user:{uid:'u1'},doc:{onnuriKey:KEY},fetchImpl:api([]),...o});
    let b=mk({ggDoc:{ggKey:GKEY}});await b.signIn();
    ok('로그인 후 config/gg에서 경기 키 읽기 → 조회 가능',b.M.G.st==='ok'&&b.M.G.key===GKEY&&b.M.S.keyStatus==='ok');
    ok('경기 키가 화면·콘솔에 없음',!b.html().includes(GKEY)&&!b.logs.join('\n').includes(GKEY));
    ok('경기 조회 폼 표시(가게명·시·군·영업 중만 보기)',/id="g_name"/.test(b.html())&&/id="g_sigun"/.test(b.html())&&/영업 중인 곳만 보기/.test(b.text()));
    ok('시·군 선택: 경기도 전체 + 31개',(b.html().match(/<select id="g_sigun"[\s\S]*?<\/select>/)[0].match(/<option/g)||[]).length===32);
    b=mk({});await b.signIn();ok('config/gg 문서가 없으면 관리자 안내(온누리는 정상)',b.M.G.st==='missing'&&/config \/ gg/.test(b.text())&&/ggKey/.test(b.text())&&b.M.S.keyStatus==='ok'&&!/id="g_name"/.test(b.html()));
    b=mk({ggDoc:{ggKey:'짧음'}});await b.signIn();ok('경기 키 형식이 이상하면 사용 안 함',b.M.G.st==='invalid'&&b.M.G.key==='');
    b=mk({ggDoc:{x:1}});await b.signIn();ok('ggKey 필드가 없으면 invalid',b.M.G.st==='invalid');
    b=mk({ggErr:{code:'permission-denied'}});await b.signIn();ok('권한 없음 → 전용 안내',b.M.G.st==='denied'&&/경기도 조회 키를 읽을 권한이 없어요/.test(b.text()));
    b=mk({ggErr:{code:'unavailable'}});await b.signIn();ok('네트워크 오류 → 새로고침 안내',b.M.G.st==='error'&&/경기도 조회 키를 불러오지 못했어요/.test(b.text()));
    b=mk({ggDoc:{ggKey:'  '+GKEY+'  '}});await b.signIn();ok('키 앞뒤 공백 제거',b.M.G.key===GKEY);
    b=boot({user:null,fetchImpl:api([])});await b.signIn();ok('로그아웃 상태: 로그인 안내, 조회 폼 없음',/로그인하면 앱 안에서 조회할 수 있어요/.test(b.text())&&!/id="g_name"/.test(b.html()))}
  // ── 조회 ──
  { const ggFetch=(handler)=>async(u,o)=>u.includes('openapi.gg.go.kr')?handler(u,o):u.includes('infuser')?jres(200,SWG):page([]);
    const mk=async(handler,extra={})=>{const b=boot({user:{uid:'u1'},doc:{onnuriKey:KEY},ggDoc:{ggKey:GKEY},fetchImpl:ggFetch(handler),...extra});await b.signIn();return b};
    const gcalls=b=>b.fetches.filter(f=>f.url.includes('openapi.gg.go.kr'));
    let b=await mk(()=>jres(200,ggOkBody([open(),open({CMPNM_NM:'봄약국',REFINE_ROADNM_ADDR:'경기도 용인시 처인구 중부대로 1'}),REAL_ROW1],456)));
    b.M.ggSet('name','약국');b.M.ggSet('sigun','용인시');await b.M.ggSearch(false);
    const c=gcalls(b)[0],cu=new URL(c.url);
    ok('조회 요청: 시군·상호 조건 + KEY + referrer 미전송(no-referrer)',cu.searchParams.get('SIGUN_NM')==='용인시'&&cu.searchParams.get('CMPNM_NM')==='약국'&&cu.searchParams.get('KEY')===GKEY&&cu.searchParams.get('pSize')==='500'&&c.opt.referrerPolicy==='no-referrer');
    ok('결과: 영업 중 2곳 표시, 폐업 1곳 숨김 안내',/지금 목록 2곳/.test(b.text())&&/폐업·휴업 1곳 숨김/.test(b.text())&&/새서울약국/.test(b.text())&&!/지에스25 용인수지고/.test(b.text()));
    ok('결과: 총 456곳 중 3곳을 불러옴, 업종·시군·도로명·상태 표시',/총 456곳 중 3곳을 불러옴/.test(b.text())&&/약국\/약국|약국 · 용인시/.test(b.text())&&/경기도 용인시 수지구 수풍로 70/.test(b.text())&&/영업 중/.test(b.text()));
    ok('결과 화면·콘솔에 키와 사업자번호가 없음',!b.html().includes(GKEY)&&!b.html().includes('4071195475')&&!b.logs.join('\n').includes(GKEY));
    b.M.ggToggle('openOnly',false);ok('"영업 중인 곳만 보기"를 끄면 폐업 포함 + 폐업 표시(폐업일)',/지에스25 용인수지고/.test(b.text())&&/폐업 \(2025-10-11\)/.test(b.text())&&!/폐업·휴업 \d+곳 숨김/.test(b.text()));
    b.M.ggToggle('openOnly',true);
    // 요청 검증
    for(const [bad,why] of [['','빈 입력'],['   ','공백'],['%%','특수문자뿐'],['x'.repeat(31),'31자']]){
      const x=await mk(()=>jres(200,ggOkBody([])));x.M.ggSet('name',bad);await x.M.ggSearch(false);
      ok(`입력 검증: ${why} → 호출 없음 + 안내`,gcalls(x).length===0&&/가게 이름\(일부\)을 입력해 주세요|30자 이내/.test(x.text()))}
    const sx=await mk(()=>jres(200,ggOkBody([])));sx.M.ggSet('name','%약국%');await sx.M.ggSearch(false);
    ok('특수문자가 섞여도 정리해서 조회(%약국% → 약국)',new URL(gcalls(sx)[0].url).searchParams.get('CMPNM_NM')==='약국');
    const nx=await mk(()=>jres(200,ggOkBody([])));nx.M.ggSet('name','약국');await nx.M.ggSearch(false);
    ok('시·군을 안 고르면 SIGUN_NM 조건 없이 조회(경기도 전체)',!new URL(gcalls(nx)[0].url).searchParams.has('SIGUN_NM'));
    // 오류·없음
    const none=await mk(()=>jres(200,GG_NONE));none.M.ggSet('name','없는가게');await none.M.ggSearch(false);
    ok('데이터 없음(INFO-200) → "조회된 가맹점이 없어요" 안내',/조회된 가맹점이 없어요/.test(none.text())&&none.M.G.all.length===0);
    for(const [code,re] of [['ERROR-290',/경기도 API 키가 유효하지 않아요/],['ERROR-337',/조회 가능한 횟수를 넘었어요/],['ERROR-500',/ERROR-500/]]){
      const e=await mk(()=>jres(200,{RESULT:{CODE:code,MESSAGE:'x'}}));e.M.ggSet('name','약국');await e.M.ggSearch(false);
      ok(`오류 코드 ${code} → 사용자 안내(키 미포함)`,re.test(e.text())&&!e.html().includes(GKEY),e.text().slice(0,160))}
    const h500=await mk(()=>jres(500,{}));h500.M.ggSet('name','약국');await h500.M.ggSearch(false);
    ok('HTTP 500 → 안내(상태 코드 표시)',/코드 500/.test(h500.text())&&!h500.html().includes(GKEY));
    const thr=await mk(()=>{throw new TypeError('Failed to fetch '+GKEY)});thr.M.ggSet('name','약국');await thr.M.ggSearch(false);
    ok('CORS·네트워크 오류(Failed to fetch) → 일반 안내, 원문(키 포함 가능) 미노출',/조회하지 못했어요/.test(thr.text())&&!thr.html().includes(GKEY));
    const bad=await mk(()=>jres(200,{unexpected:true}));bad.M.ggSet('name','약국');await bad.M.ggSearch(false);
    ok('예상 못한 응답 형식 → 오류 안내(응답 형식 오류)',/응답 형식 오류/.test(bad.text()));
    const out=boot({user:null,fetchImpl:api([])});await out.signIn();out.M.ggSet('name','약국');await out.M.ggSearch(false);ok('로그인 안 하면 호출 안 함',gcalls(out).length===0);
    // 페이징: API는 500행씩, 화면은 20곳씩
    const mkRows=(from,n)=>Array.from({length:n},(_,i)=>open({CMPNM_NM:'가게'+(from+i),FRCS_NO:String(from+i)}));
    const pf=async(u)=>{const pg=+new URL(u).searchParams.get('pIndex');return jres(200,ggOkBody(mkRows((pg-1)*500,pg<3?500:300),1300))};
    const pb=await mk(pf);pb.M.ggSet('name','가게');await pb.M.ggSearch(false);
    ok('첫 조회: 500곳을 불러오고 20곳만 표시, 더 보기 버튼',pb.M.G.all.length===500&&pb.M.ggView().length===500&&(pb.html().match(/class="store tap"/g)||[]).length===20&&/더 보기/.test(pb.text())&&/총 1,300곳 중 500곳을 불러옴/.test(pb.text()));
    await pb.M.ggMore();ok('더 보기: 화면에서 20곳 더(40곳), 서버 추가 호출 없음',(pb.html().match(/class="store tap"/g)||[]).length===40&&gcalls(pb).length===1);
    pb.M.G.shown=500;await pb.M.ggMore();ok('불러온 500곳을 다 보면 다음 페이지를 서버에서 가져옴(pIndex=2, 이어 붙임)',gcalls(pb).length===2&&new URL(gcalls(pb)[1].url).searchParams.get('pIndex')==='2'&&pb.M.G.all.length===1000&&new Set(pb.M.G.all.map(r=>r.name)).size===1000);
    pb.M.G.shown=1000;await pb.M.ggMore();ok('마지막 페이지(300곳)까지 불러오면 전체 1,300곳(서버 호출 3번), 아직 화면에 안 보인 곳이 있어 더 보기 유지',pb.M.G.all.length===1300&&gcalls(pb).length===3&&new Set(pb.M.G.all.map(r=>r.name)).size===1300&&/더 보기/.test(pb.text()));
    pb.M.G.shown=1300;await pb.M.ggMore();ok('모두 화면에 표시한 뒤: 추가 서버 호출 없음, 더 보기 버튼 사라짐',gcalls(pb).length===3&&!/>더 보기</.test(pb.html()));
    // 거리순
    const ds=[open({CMPNM_NM:'먼가게',REFINE_WGS84_LAT:37.4,REFINE_WGS84_LOGT:127.2}),open({CMPNM_NM:'가까운가게',REFINE_WGS84_LAT:37.3951,REFINE_WGS84_LOGT:127.1115}),open({CMPNM_NM:'좌표없음',REFINE_WGS84_LAT:0,REFINE_WGS84_LOGT:0}),open({CMPNM_NM:'중간가게',REFINE_WGS84_LAT:37.40,REFINE_WGS84_LOGT:127.14})];
    const nb=await mk(()=>jres(200,ggOkBody(ds,4)));nb.M.G.pos={lat:37.3947,lon:127.1112};nb.M.ggSet('name','가게');await nb.M.ggSearch(false);
    ok('위치가 있으면 가까운 순 정렬(좌표 없는 곳은 맨 뒤)',JSON.stringify(nb.M.ggView().map(x=>x.r.name))==='["가까운가게","중간가게","먼가게","좌표없음"]',JSON.stringify(nb.M.ggView().map(x=>x.r.name)));
    ok('거리 표시: 가까운가게 수십 m, 좌표 없는 곳은 거리 칩 없음',/가까운가게[\s\S]*?\d+m/.test(nb.text())&&(nb.html().match(/class="chip off">\d+(\.\d)?(m|km)</g)||[]).length===3);
    nb.M.ggToggle('nearFirst',false);ok('"가까운 순" 끄면 서버 순서 그대로',JSON.stringify(nb.M.ggView().map(x=>x.r.name))==='["먼가게","가까운가게","좌표없음","중간가게"]');
    const q0=await mk(()=>jres(200,ggOkBody(ds,4)));q0.M.ggSet('name','가게');await q0.M.ggSearch(false);
    ok('위치가 없으면 "가까운 순" 선택지·거리 칩이 없고 서버 순서 그대로',!/가까운 순으로 보기/.test(q0.text())&&!/class="chip off">\d+(\.\d)?(m|km)</.test(q0.html())&&JSON.stringify(q0.M.ggView().map(x=>x.r.name))==='["먼가게","가까운가게","좌표없음","중간가게"]');
    // 새 조회는 처음부터
    nb.M.ggSet('name','약국');await nb.M.ggSearch(false);ok('새로 조회하면 표시 개수·페이지가 처음으로',nb.M.G.shown===20&&nb.M.G.apiPage===1)}
  // ── 가게 상세 팝업 (경기) ──
  { const rowsG=[open({CMPNM_NM:'새서울약국',REFINE_WGS84_LAT:37.3296936,REFINE_WGS84_LOGT:127.0930495}),REAL_ROW1,open({CMPNM_NM:'"><img src=x onerror=alert(1)>',REFINE_ROADNM_ADDR:'<script>alert(2)</script>',INDUTYPE_NM:'<b>x</b>',REFINE_WGS84_LAT:0,REFINE_WGS84_LOGT:0})];
    const mkp=async()=>{const b=boot({user:{uid:'u1'},doc:{onnuriKey:KEY},ggDoc:{ggKey:GKEY},fetchImpl:async(u)=>u.includes('openapi.gg.go.kr')?jres(200,ggOkBody(rowsG,3)):u.includes('infuser')?jres(200,SWG):page([])});await b.signIn();b.M.ggSet('name','약국');b.M.ggToggle('openOnly',false);await b.M.ggSearch(false);return b};
    let b=await mkp();
    ok('목록 항목이 눌러서 상세를 여는 버튼',(b.html().match(/onclick="ggOpenStore\(\d+\)"/g)||[]).length===3&&!/role="dialog"/.test(b.html()));
    b.M.ggOpenStore(0);let h=b.html(),t=b.text();
    ok('팝업: 접근성 속성 + 가게명',/role="dialog" aria-modal="true" aria-label="새서울약국 상세"/.test(h));
    ok('팝업: 업종·시군·도로명·지번·우편번호·영업 상태',/업종 약국/.test(t)&&/시·군 용인시/.test(t)&&/도로명주소 경기도 용인시 수지구 수풍로 70/.test(t)&&/지번주소 경기도 용인시 수지구 풍덕천동/.test(t)&&/우편번호 16830/.test(t)&&/영업 상태 영업 중/.test(t),t);
    const dlg=h.slice(h.indexOf('role="dialog"'),h.indexOf('>닫기</button>',h.indexOf('role="dialog"')));
    const links=[...dlg.matchAll(/<a class="btn ghost" href="([^"]+)" target="_blank" rel="noopener noreferrer">([^<]+)<\/a>/g)].map(m=>[m[1].replace(/&amp;/g,'&'),m[2]]);
    ok('지도 링크: 카카오맵은 좌표 핀(link/map/상호,위도,경도), 네이버는 "상호 + 도로명주소" 검색',links.some(([u,n])=>/카카오맵/.test(n)&&u==='https://map.kakao.com/link/map/'+encodeURIComponent('새서울약국')+',37.3296936,127.0930495')&&links.some(([u,n])=>/네이버지도/.test(n)&&u==='https://map.naver.com/p/search/'+encodeURIComponent('새서울약국 경기도 용인시 수지구 수풍로 70')),JSON.stringify(links));
    ok('공식 매장 검색 링크 + 모든 링크가 새 창(noopener noreferrer)',links.some(([u])=>u==='https://search.konacard.co.kr/payable-merchants')&&links.length===3);
    ok('팝업: 카드사 등록 정보라 실제와 다를 수 있다는 한계 안내',/카드사에 등록된 내용/.test(t)&&/실제와 다를 수 있어요/.test(t)&&/경기지역화폐 앱에서 확인/.test(t));
    ok('팝업: 영업 중인 곳엔 폐업 경고 없음',!/한 곳이에요/.test(t));
    ok('팝업(영업 중)에 사업자번호·키 없음',!h.includes('4071195475')&&!h.includes(GKEY));
    b.M.ggCloseStore();b.M.ggOpenStore(1);t=b.text();
    ok('폐업한 곳: 폐업일 + 이용할 수 없을 수 있다는 경고',/영업 상태 폐업 \(2025-10-11\)/.test(t)&&/폐업한 곳이에요/.test(t)&&/가게에 먼저 확인/.test(t));
    ok('폐업 팝업의 사업자번호도 표시하지 않음(원본에 있어도)',!b.html().includes('4071195475')&&!b.html().includes('911333525'));
    b.M.ggCloseStore();b.M.ggOpenStore(2);h=b.html();
    ok('좌표가 없으면 카카오맵은 검색 링크로 대체',/https:\/\/map\.kakao\.com\/\?q=/.test(h)&&!/link\/map/.test(h.slice(h.indexOf('role="dialog"'))));
    ok('XSS 방어(경기): 상호·주소·업종의 HTML이 이스케이프됨',!h.includes('<img src=x')&&!h.includes('<script>alert')&&!h.includes('<b>x</b>')&&h.includes('&lt;img src=x'));
    ok('XSS 방어(링크): 검색어가 URL 인코딩되어 속성 밖으로 못 나감',[...h.matchAll(/href="(https:\/\/map\.[^"]+)"/g)].every(m=>!/[<>" ]/.test(m[1])));
    b.M.ggCloseStore();b.M.ggOpenStore(-1);b.M.ggOpenStore(99);b.M.ggOpenStore(NaN);ok('잘못된 번호는 무시, 닫혀 있을 때 또 닫아도 안전',b.M.G.sel===-1&&(b.M.ggCloseStore(),true));
    b.M.ggOpenStore(0);ok('Esc로 닫힘(온누리 팝업과 공용 핸들러)',(b.keyHandlers[0]({key:'Escape'}),b.M.G.sel===-1));
    b.M.ggOpenStore(0);await b.M.ggSearch(false);ok('새로 조회하면 팝업이 닫힘',b.M.G.sel===-1);
    b.M.ggOpenStore(0);ok('경기 팝업 목록 번호는 필터와 무관하게 원본 인덱스를 사용(영업 중만 보기 켜도 올바른 가게)',(()=>{b.M.ggToggle('openOnly',true);b.M.ggCloseStore();const v=b.M.ggView();b.M.ggOpenStore(v[0].i);return b.M.G.all[b.M.G.sel].name===v[0].r.name})())}
  // ── 현재 위치 + 경기 ──
  { const geo=(la,lo)=>({getCurrentPosition:(s)=>s({coords:{latitude:la,longitude:lo}})});
    const mkl=async(la,lo)=>{const b=boot({user:{uid:'u1'},doc:{onnuriKey:KEY},ggDoc:{ggKey:GKEY},fetchImpl:api([]),geo:geo(la,lo)});await b.signIn();b.M.locate();return b};
    let b=await mkl(37.3947,127.1112);
    ok('현재 위치(판교): 온누리 시·도=경기, 경기 시·군=성남시, 위치 저장(거리순용)',b.M.S.q.sido==='경기'&&b.M.G.q.sigun==='성남시'&&Math.abs(b.M.G.pos.lat-37.3947)<1e-9&&/성남시\(으\)로 골랐어요/.test(b.text()));
    ok('위치가 저장되면 "가까운 순으로 보기" 선택지가 나타남',/가까운 순으로 보기/.test(b.text()));
    b=await mkl(37.5665,126.9780);ok('서울에서는 경기 시·군을 자동 선택하지 않음(성남 등으로 오판 방지)',b.M.S.q.sido==='서울'&&b.M.G.q.sigun===''&&b.M.G.pos!=null);
    b=await mkl(35.1587,129.1604);ok('부산에서도 경기 시·군 선택 안 함',b.M.S.q.sido==='부산'&&b.M.G.q.sigun==='');
    b=await mkl(35.68,139.69);ok('해외에서는 시·도도 시·군도 선택하지 않음',b.M.S.q.sido===''&&b.M.G.q.sigun==='')}
  // ── 화면 구성 ──
  { const b=boot({user:{uid:'u1'},doc:{onnuriKey:KEY},fetchImpl:api([])});await b.signIn();
    ok('경기지역화폐 영역: 이제 "준비 중"이 아니라 실제 조회 박스(공식 매장 검색 링크 포함, 새 창 + noopener)',!/준비 중/.test(b.text())&&/경기지역화폐 가맹점 조회/.test(b.text())&&/search\.konacard\.co\.kr\/payable-merchants/.test(b.html())&&/target="_blank" rel="noopener noreferrer"/.test(b.html()));
    ok('온누리 공식 사이트 링크',b.html().includes('https://www.onnuri.gift/'));
    ok('앱으로 돌아가는 링크(index.html)',/<a class="back" href="index\.html">/.test(HTML));
    ok('시·도 선택 상자: 전국 + 16개, "전남·광주" 표기',(b.html().match(/<option value="/g)||[]).length===17&&/전남·광주/.test(b.html()));
    ok('페이지에 API 키·서비스키가 하드코딩되어 있지 않음',!/a1a5b23b|Infuser [A-Za-z0-9]{20,}|serviceKey\s*[:=]\s*['"][A-Za-z0-9]{20,}/.test(HTML));
    ok('PWA: manifest·아이콘 링크, 뷰포트',/rel="manifest" href="manifest\.json"/.test(HTML)&&/name="viewport"/.test(HTML));
    ok('다크 모드 색상 변수 정의',/prefers-color-scheme:dark/.test(HTML))}
  console.log(`${fail?'FAILED':'PASS  '} merchant: ${pass} ok, ${fail} fail`);process.exit(fail?1:0);
})().catch(e=>{console.log('CRASH',e);process.exit(2)});
