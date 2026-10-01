// 말로 입력의 날짜 해석: '토요일'은 오늘 기준 다가오는 토요일 (지난주 토요일로 잡히던 문제)
const {boot,ok,done}=require('./harness');
const X=boot().X;
const R=(t,base)=>X.resolveDateFromText(t,base);
const dayName=d=>'일월화수목금토'[new Date(d+'T00:00').getDay()];
// 기준: 2026-10-01(목). 이 달 달력: 9/26(토) 9/27(일) 9/28(월) … 10/3(토) 10/4(일)
const T0='2026-10-01',SAT='2026-10-03',SUN='2026-10-04';
console.log('기준일 요일:',dayName(T0),' / 10-03:',dayName('2026-10-03'),' / 09-26:',dayName('2026-09-26'));
const cases=[
 // 사용자가 겪은 문제: '토요일 마트 20000원' → 지난주(9/26)가 아니라 다가오는 토요일
 ['토요일 마트 20000원',T0,'2026-10-03'],['토요일에 마트 2만원',T0,'2026-10-03'],['이번 토요일 마트',T0,'2026-10-03'],
 ['목요일 마트',T0,'2026-10-01'],            // 오늘이 그 요일이면 오늘
 ['금요일',T0,'2026-10-02'],['월요일',T0,'2026-10-05'],['수요일',T0,'2026-10-07'],['일요일',T0,'2026-10-04'],
 ['토욜 마트 2만원',T0,'2026-10-03'],
 ['지난 토요일',T0,'2026-09-26'],['저번 토요일 이마트',T0,'2026-09-26'],['지난 목요일',T0,'2026-09-24'],   // 오늘과 같은 요일의 '지난'은 일주일 전
 ['다음 토요일',T0,'2026-10-03'],['다음 목요일',T0,'2026-10-08'],
 ['이번 주 토요일',T0,'2026-10-03'],['이번주 월요일',T0,'2026-09-28'],['지난주 토요일',T0,'2026-09-26'],['저번 주 수요일',T0,'2026-09-23'],
 ['다음주 토요일',T0,'2026-10-10'],['담주 월요일',T0,'2026-10-05'],['다음 주 일요일',T0,'2026-10-11'],
 // 오늘이 토요일/일요일일 때
 ['토요일',SAT,'2026-10-03'],['다음 토요일',SAT,'2026-10-10'],['지난 토요일',SAT,'2026-09-26'],['이번 주 토요일',SAT,'2026-10-03'],
 ['토요일',SUN,'2026-10-10'],['이번 주 토요일',SUN,'2026-10-03'],['이번 주 일요일',SUN,'2026-10-04'],['다음 주 월요일',SUN,'2026-10-05'],
 // 상대 날짜
 ['어제 이마트',T0,'2026-09-30'],['그저께',T0,'2026-09-29'],['그제 마트',T0,'2026-09-29'],['내일 마트',T0,'2026-10-02'],['모레',T0,'2026-10-03'],['내일모레',T0,'2026-10-03'],['오늘 마트',T0,'2026-10-01'],
 // 명시 날짜
 ['10월 3일 이마트',T0,'2026-10-03'],['10/3 이마트',T0,'2026-10-03'],['12월 25일',T0,'2026-12-25'],['3월 1일 스벅',T0,'2026-03-01'],
 // 월·연 경계
 ['토요일','2026-12-30','2027-01-02'],['다음 주 월요일','2026-12-31','2027-01-04'],['지난 금요일','2027-01-02','2027-01-01'],['지난 토요일','2027-01-02','2026-12-26'],['내일','2026-12-31','2027-01-01'],['어제','2027-03-01','2027-02-28'],['어제','2028-03-01','2028-02-29'],
 // 날짜 표현이 아닌 것은 해석하지 않음
 ['이마트 6.5만원',T0,null],['마트 20000원',T0,null],['이마트 3만원',T0,null],['2월 30일',T0,null],['13월 1일',T0,null],['오늘의집 3만원 결제 요일 없음',T0,'2026-10-01'],['',T0,null],['10월 3일 토요일',T0,'2026-10-03'],
];
for(const [t,b,e] of cases){const g=R(t,b);ok(`${b}(${dayName(b)}) "${t}" → ${e}`,g===e,`got ${g}`)}
// 날짜 숫자가 요일보다 우선 (명시 날짜 우선)
ok('명시 날짜가 요일보다 우선: "10월 10일 토요일" → 10-10',R('10월 10일 토요일',T0)==='2026-10-10');

// ── 전수 검증: 2026-01-01 ~ 2027-12-31 모든 기준일 × 7요일 × 표현 ──
{let bad=0,n=0;const wk=d=>{const x=new Date(d+'T00:00');const m=new Date(x);m.setDate(x.getDate()-((x.getDay()+6)%7));return m.toLocaleDateString('sv')};   // 그 날짜가 속한 주의 월요일
 for(let i=0;i<730;i++){const base=X.addDays('2026-01-01',i);
  for(let k=0;k<7;k++){const w='일월화수목금토'[k];
   const chk=(label,t,pred)=>{n++;const g=R(t,base);if(!g||dayName(g)!==w||!pred(g)){bad++;if(bad<8)console.log('BAD',label,base,dayName(base),t,g)}};
   chk('plain',`${w}요일 마트`,g=>g>=base&&g<X.addDays(base,7));
   chk('이번 토',`이번 ${w}요일`,g=>g>=base&&g<X.addDays(base,7));
   chk('지난',`지난 ${w}요일`,g=>g<base&&g>=X.addDays(base,-7));
   chk('다음',`다음 ${w}요일`,g=>g>base&&g<=X.addDays(base,7));
   chk('이번주',`이번 주 ${w}요일`,g=>wk(g)===wk(base));
   chk('지난주',`지난주 ${w}요일`,g=>wk(g)===X.addDays(wk(base),-7));
   chk('다음주',`다음 주 ${w}요일`,g=>wk(g)===X.addDays(wk(base),7));
  }}
 ok(`전수 ${n}건 (730일 × 7요일 × 7표현): 요일 일치 + 범위 규칙 준수`,bad===0,'bad='+bad);}

// ── 통합: Gemini가 날짜를 틀리게(지난주 토요일) 줘도 앱이 바로잡는다 ──
const KEY='AIzaSyFAKE_KEY_FOR_TEST_1234567890abcdef';
const gem=o=>({status:200,ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(o)}]}}]})});
const nextWeekday=(k)=>{let d=new Date();d.setHours(0,0,0,0);while(d.getDay()!==k)d.setDate(d.getDate()+1);return d.toLocaleDateString('sv')};
(async()=>{
 const mkApp=(model)=>{const b=boot({fetch:async()=>gem(model)});return b};
 let b=mkApp({amount:20000,category:'mart',date:'2026-09-26'});await b.X.gkSave(KEY);
 let r=await b.X.parseNaturalLanguage('토요일 마트 20000원');
 ok('통합: 모델이 9/26(지난주)을 줘도 "토요일" → 오늘 기준 다가오는 토요일',r.date===nextWeekday(6)&&r.amount===20000&&r.cat==='mart',r.date+' vs '+nextWeekday(6));
 r=await b.X.parseNaturalLanguage('지난 토요일 마트 20000원');
 ok('통합: "지난 토요일"은 과거(오늘보다 이전)',r.date<new Date().toLocaleDateString('sv')&&new Date(r.date+'T00:00').getDay()===6);
 b=mkApp({amount:5000,category:'cvs',date:'2020-01-01'});await b.X.gkSave(KEY);
 r=await b.X.parseNaturalLanguage('편의점 5천원');
 ok('날짜 표현이 없으면 모델이 준 날짜를 그대로(기존 동작 유지)',r.date==='2020-01-01');
 b=mkApp({amount:5000,category:'cvs'});await b.X.gkSave(KEY);
 r=await b.X.parseNaturalLanguage('편의점 5천원');
 ok('날짜 표현도 모델 날짜도 없으면 오늘',r.date===new Date().toLocaleDateString('sv'));
 // 승격 경로(Lite 금액 누락 → Flash)에서도 날짜 보정 적용
 let n=0;b=boot({fetch:async(u)=>/lite/.test(u)?gem({amount:null,category:'mart',date:'2026-09-26'}):gem({amount:20000,category:'mart',date:'2026-09-26'})});await b.X.gkSave(KEY);
 r=await b.X.parseNaturalLanguage('토요일 마트 2만원');ok('승격(Flash) 결과에도 날짜 보정 적용',r.amount===20000&&r.date===nextWeekday(6));
 // Flash까지 실패해 Lite 결과를 돌려주는 경로에도
 b=boot({fetch:async(u)=>/lite/.test(u)?gem({amount:null,category:'mart',date:'2026-09-26'}):{status:503,ok:false,json:async()=>({})}});await b.X.gkSave(KEY);
 r=await b.X.parseNaturalLanguage('토요일 마트 2만원');ok('Lite 결과 반환 경로에도 날짜 보정 적용',r.amount===''&&r.date===nextWeekday(6));
 // 프롬프트에 날짜 규칙 안내
 const calls=[];b=boot({fetch:async(u,i)=>{calls.push(i.body);return gem({amount:1,category:'cvs'})}});await b.X.gkSave(KEY);await b.X.parseNaturalLanguage('x');
 ok('Gemini 프롬프트에 요일 규칙(다가오는 요일) 안내 포함',/다가오는 그 요일/.test(calls[0])&&/지난\/저번/.test(calls[0]));
 process.exit(done('dates')?1:0);
})();
