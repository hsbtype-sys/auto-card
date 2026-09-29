const {boot,ok,done,sleep,allLogs}=require('./harness');
const KEY='AIzaSyFAKE_KEY_FOR_TEST_1234567890abcdef';
const jres=(status,body)=>({status,ok:status>=200&&status<300,json:async()=>body});
const gem=obj=>jres(200,{candidates:[{content:{parts:[{text:typeof obj==='string'?obj:JSON.stringify(obj)}]}}]});
function app(fetchImpl,store={}){const calls=[];const f=async(url,init)=>{calls.push({url,init});return fetchImpl(url,init,calls.length)};const b=boot({fetch:f,store});b.X.setRetryMs(5);b.calls=calls;return b}
const today=()=>new Date().toLocaleDateString('sv');

(async()=>{
  // ── 키 저장/삭제/표시 ──
  let b=app(()=>gem({}));
  ok('처음엔 키 없음',b.X.gkGet()==='');
  await b.X.gkSave(KEY);
  ok('로그아웃 상태: localStorage 캐시에만 저장',b.X.gkGet()===KEY&&b.store['autocard.gemini']===KEY);
  b.X.setTab('cards');const html=b.X.vCards();
  ok('화면(내 카드)에 키 값이 노출되지 않음, ••••••••로 표시',!html.includes(KEY)&&html.includes('••••••••'));
  b.X.setTab('rec');ok('화면(추천)에도 노출 없음',!b.X.vRec().includes(KEY));
  ok('백업 JSON(exp)에 키 미포함',(()=>{let t='';b.ctx.navigator.clipboard={writeText:async x=>{t=x}};b.X.exp();return true})());
  let clip='';const b2=boot({clip:{writeText:async t=>{clip=t}},store:{'autocard.gemini':KEY}});b2.X.exp();await sleep(5);
  ok('exp() 결과에 키 없음',clip.length>10&&!clip.includes(KEY));
  ok('상태(S)에 키 없음',!JSON.stringify(b.X.S).includes(KEY)&&!b.store['autocard.v1']?.includes(KEY));
  b.ctx.confirm=()=>true;await b.X.gkDelete();
  ok('삭제: 캐시 비움',b.X.gkGet()===''&&!('autocard.gemini' in b.store));
  ok('모든 데이터 초기화는 키를 지우지 않음',await (async()=>{await b.X.gkSave(KEY);b.X.resetAll();return b.X.gkGet()===KEY})());

  // ── 입력 검증 UI ──
  b=app(()=>gem({}));b.dev.els.gk={value:'짧음'};await b.X.gkSaveUI();
  ok('너무 짧은 키 거부',b.dev.alerts.length===1&&b.X.gkGet()==='');
  b.dev.els.gk={value:'has space in the middle of key 1234567890'};await b.X.gkSaveUI();
  ok('공백 포함 키 거부',b.dev.alerts.length===2&&b.X.gkGet()==='');
  b.dev.els.gk={value:'  '+KEY+'  '};await b.X.gkSaveUI();
  ok('정상 키 저장(앞뒤 공백 제거) + 입력칸 비움',b.X.gkGet()===KEY&&b.dev.els.gk.value==='');
  ok('토스트에도 키 미포함',!b.dev.toasts.join(' ').includes(KEY));

  // ── parseNaturalLanguage ──
  b=app(()=>gem({amount:60000,category:'mart',date:'2026-10-03',simplePay:true,overseas:false,memberType:null,charger:null}));
  await b.X.gkSave(KEY);
  let r=await b.X.parseNaturalLanguage('토요일 이마트 6만원 SSG페이');
  ok('정상 파싱',r.amount===60000&&r.cat==='mart'&&r.date==='2026-10-03'&&r.sp===true&&r.ov===false&&r.pt==='m'&&r.op==='',JSON.stringify(r));
  const c=b.calls[0];
  ok('요청: POST + 키는 헤더(x-goog-api-key), URL에는 없음',c.init.method==='POST'&&c.init.headers['x-goog-api-key']===KEY&&!c.url.includes(KEY)&&!c.url.includes('key='));
  ok('요청: generateContent 엔드포인트 + JSON 응답 요청',/generativelanguage\.googleapis\.com\/v1beta\/models\/[^/]+:generateContent$/.test(c.url)&&JSON.parse(c.init.body).generationConfig.responseMimeType==='application/json');
  ok('요청 본문에 키 없음',!c.init.body.includes(KEY));
  ok('프롬프트에 오늘 날짜/요일과 카테고리 id 포함',c.init.body.includes(today())&&c.init.body.includes('mart=')&&c.init.body.includes('charge='));

  // 모델 출력 검증 (신뢰하지 않음)
  const nl=async(o)=>{const x=app(()=>gem(o));await x.X.gkSave(KEY);return x.X.parseNaturalLanguage('테스트')};
  r=await nl({amount:'12,000',category:'없는카테고리',date:'내일',simplePay:'yes',overseas:1,memberType:'z',charger:123});
  ok('이상한 값 → 안전한 기본값 (etc / 오늘 / 불리언 엄격 / 월정기)',r.cat==='etc'&&r.date===today()&&r.sp===false&&r.ov===false&&r.pt==='m'&&r.amount==='',JSON.stringify(r));
  r=await nl({amount:-500,category:'cvs'});ok('음수 금액 무시',r.amount==='');
  r=await nl({amount:1e12,category:'cvs'});ok('비현실적 금액(1e12) 무시',r.amount==='');
  r=await nl({amount:5000.7,category:'cvs',date:'2026-13-45'});ok('소수 금액 반올림, 잘못된 날짜는 오늘',r.amount===5001&&r.date===today());
  r=await nl({amount:20000,category:'charge',charger:'플러그링크'});
  { const x=app(()=>gem({amount:20000,category:'charge',charger:'플러그링크'}));await x.X.gkSave(KEY);const q=await x.X.parseNaturalLanguage('x');ok('충전 사업자명 → 목록 인덱스 매칭',q.cat==='charge'&&x.X.CHARGERS[+q.op][0]==='플러그링크')}
  { const x=app(()=>gem({amount:20000,category:'charge',charger:'테슬라'}));await x.X.gkSave(KEY);const q=await x.X.parseNaturalLanguage('테슬라 충전 2만');ok('충전 사업자 매칭(테슬라)',x.X.CHARGERS[+q.op][0]==='테슬라')}
  { const x=app(()=>gem({amount:20000,category:'mart',charger:'테슬라'}));await x.X.gkSave(KEY);const q=await x.X.parseNaturalLanguage('x');ok('충전이 아니면 사업자 무시',q.op==='')}
  { const x=app(()=>gem('```json\n{"amount":3000,"category":"cvs"}\n```'));await x.X.gkSave(KEY);const q=await x.X.parseNaturalLanguage('x');ok('코드펜스로 감싼 JSON도 처리',q.amount===3000)}
  { const x=app(()=>gem('이건 JSON이 아닙니다'));await x.X.gkSave(KEY);let e='';try{await x.X.parseNaturalLanguage('x')}catch(er){e=er.message}ok('JSON 아닌 응답 → 에러(앱은 안 죽음)',/해석/.test(e),e)}
  { const x=app(()=>jres(200,{candidates:[]}));await x.X.gkSave(KEY);let e='';try{await x.X.parseNaturalLanguage('x')}catch(er){e=er.message}ok('빈 candidates → 에러',/해석/.test(e),e)}

  // 에러 처리 & 키 누출 방지
  b=boot({fetch:async()=>{throw new Error('boom '+KEY)}});await b.X.gkSave(KEY);
  let e='';try{await b.X.parseNaturalLanguage('x')}catch(er){e=er.message}
  ok('네트워크 오류: 사용자 메시지, 키 미포함',/네트워크/.test(e)&&!e.includes(KEY),e);
  for(const [st,re] of [[400,/키가 올바르지/],[401,/키가 올바르지/],[403,/키가 올바르지/],[429,/한도/],[500,/혼잡/],[503,/혼잡/],[418,/응답 오류/]]){
    const x=app(()=>jres(st,{error:{message:'API key not valid '+KEY}}));await x.X.gkSave(KEY);let m='';try{await x.X.parseNaturalLanguage('x')}catch(er){m=er.message}
    ok(`HTTP ${st} → 안내 메시지, 키 미포함`,re.test(m)&&!m.includes(KEY),m)}
  // ── 503 등 일시 오류: 재시도 → 모델 전환 ──
  { let n=0;const x=app(()=>++n===1?jres(503,{}):gem({amount:2000,category:'cvs'}));await x.X.gkSave(KEY);const q=await x.X.parseNaturalLanguage('x');
    ok('503 한 번 → 같은 모델 재시도로 성공',q.amount===2000&&x.calls.length===2&&x.calls[0].url===x.calls[1].url)}
  { let n=0;const x=app(()=>++n<=2?jres(503,{}):gem({amount:3000,category:'cvs'}));await x.X.gkSave(KEY);const q=await x.X.parseNaturalLanguage('x');
    ok('503 두 번(첫 모델 포기) → 다음 모델로 성공',q.amount===3000&&x.calls.length===3&&x.calls[2].url.includes('gemini-3.5-flash:'),x.calls.map(c=>c.url.split('/models/')[1]).join(','))}
  { const x=app(()=>jres(503,{error:{message:'overloaded '+KEY}}));await x.X.gkSave(KEY);let m='';const st=[];try{await x.X.parseNaturalLanguage('x',s=>st.push(s))}catch(er){m=er.message}
    ok('모든 모델 503 → 혼잡 안내(키 미포함), 총 8회 시도',/혼잡/.test(m)&&!m.includes(KEY)&&x.calls.length===8,x.calls.length+' '+m);
    ok('재시도 중 상태 문구 콜백 호출',st.some(t=>/다시 시도/.test(t)))}
  { let n=0;const x=app(()=>++n===1?jres(429,{}):gem({amount:4000,category:'cvs'}));await x.X.gkSave(KEY);const q=await x.X.parseNaturalLanguage('x');
    ok('429(한도) → 재시도 없이 바로 다음 모델로',q.amount===4000&&x.calls.length===2&&x.calls[0].url!==x.calls[1].url)}
  { const x=app(()=>jres(400,{}));await x.X.gkSave(KEY);try{await x.X.parseNaturalLanguage('x')}catch(e){}
    ok('400/403(키 문제)은 재시도하지 않음',x.calls.length===1)}
  { let n=0;const x=app(async()=>{if(++n===1)throw new Error('net');return gem({amount:5000,category:'cvs'})});await x.X.gkSave(KEY);const q=await x.X.parseNaturalLanguage('x');
    ok('일시적 네트워크 오류도 1회 재시도',q.amount===5000&&n===2)}
  { let n=0;const x=app((u)=>{n++;return u.includes('gemini-3.8-flash')?jres(404,{}):gem({amount:1000,category:'cvs'})});await x.X.gkSave(KEY);const q=await x.X.parseNaturalLanguage('x');
    ok('첫 모델 404 → 다음 모델로 자동 대체',q.amount===1000&&n===2&&x.calls[1].url.includes('gemini-3.5-flash:'))}
  { const x=app(()=>jres(404,{}));await x.X.gkSave(KEY);let m='';try{await x.X.parseNaturalLanguage('x')}catch(er){m=er.message}ok('모든 모델 404 → 에러',/모델을 찾지 못/.test(m)&&x.calls.length===4)}
  { const x=app(()=>gem({}));let m='';try{await x.X.parseNaturalLanguage('x')}catch(er){m=er.message}ok('키 없음 → 에러(호출 안 함)',/키가 없습니다/.test(m)&&x.calls.length===0)}
  { const x=app(()=>gem({}));await x.X.gkSave(KEY);let m='';try{await x.X.parseNaturalLanguage('   ')}catch(er){m=er.message}ok('빈 입력 → 에러(호출 안 함)',/입력하세요/.test(m)&&x.calls.length===0)}
  { const x=app(()=>gem({amount:1,category:'cvs'}));await x.X.gkSave(KEY);await x.X.parseNaturalLanguage('가'.repeat(5000));ok('입력은 300자로 제한',JSON.parse(x.calls[0].init.body).contents[0].parts[0].text.split('가').length-1<=300)}

  // UI 흐름 (nlRun → 폼 반영)
  b=app(()=>gem({amount:60000,category:'mart',date:'2026-10-03',simplePay:true}));await b.X.gkSave(KEY);
  b.dev.els.nlst={};b.X.setNl('토요일 이마트 6만원 SSG페이');await b.X.nlRun();
  const f=b.X.getForm();ok('nlRun: 폼에 반영(금액/카테고리/날짜/간편결제)',f.amount===60000&&f.cat==='mart'&&f.date==='2026-10-03'&&f.sp===true);
  ok('nlRun: 상태 문구에 키 없음',!String(b.dev.els.nlst.textContent).includes(KEY)&&/인식/.test(b.dev.els.nlst.textContent));
  b=app(()=>jres(403,{}));await b.X.gkSave(KEY);b.dev.els.nlst={};b.X.setNl('x');await b.X.nlRun();
  ok('nlRun 실패: 폼 그대로, 안내 문구, 이후 재시도 가능',/키가 올바르지/.test(b.dev.els.nlst.textContent)&&b.X.getForm().amount==='');
  // 콘솔 로그에 키 절대 없음
  ok('콘솔 출력 어디에도 키 없음(전 테스트 통틀어)',!allLogs.join('\n').includes(KEY));
  process.exit(done('gemini')?1:0);
})().catch(e=>{console.log('CRASH',e);process.exit(2)});
