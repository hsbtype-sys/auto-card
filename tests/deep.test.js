const {boot,ok,done}=require('./harness');
const ids=['shinhan','hana','samsung'];
const mk=(prev={},o={})=>{const b=boot(o);const S=b.X.blank();S.monthKey='2026-10';for(const k in prev)S.cards[k].prev=prev[k];b.X.S=S;return b};
const tx=o=>Object.assign({amount:0,cat:'etc',date:'2026-10-05',sp:false,ov:false,pt:'m',op:'',wk:false},o);   // 10/5 = 월요일
const SAT='2026-10-03',SUN='2026-10-04';
const D=(b,c,o)=>b.X.calc(c,tx(o)).disc;
let b=mk();const opIdx=n=>String(b.X.CHARGERS.findIndex(c=>c[0].startsWith(n)));

// ── A. 실적 구간 경계 (한도) ──
const lim=(c,pid,p)=>b.X.POOLS[c][pid].lim(p);
const T=[[299999,0],[300000,1],[499999,1],[500000,2],[999999,2],[1000000,3]];
for(const [p,t] of T)ok(`신한 생활한도 @${p}`,lim('shinhan','life',p)===[0,1e4,2e4,3e4][t]);
for(const [p,t] of [[299999,0],[3e5,15e3],[599999,15e3],[6e5,3e4],[999999,3e4],[1e6,6e4]])ok(`하나 한도 @${p}`,lim('hana','main',p)===t);
for(const [p,t] of [[299999,0],[3e5,2e4],[599999,2e4],[6e5,3e4]])ok(`삼성 충전한도 @${p}`,lim('samsung','charge',p)===t);
for(const [p,t] of [[299999,0],[3e5,5e3],[599999,5e3],[6e5,1e4]])ok(`삼성 배달한도 @${p}`,lim('samsung','deliv',p)===t);
for(const [c,pid] of [['shinhan','charge'],['shinhan','hipass'],['samsung','park'],['samsung','stream']]){
  ok(`${c}.${pid} 29만9999→0, 30만→>0`,lim(c,pid,299999)===0&&lim(c,pid,3e5)>0)}
ok('삼성 해외 무실적/무한도',lim('samsung','abroad',0)===Infinity);
// 충전율 경계
for(const [p,e] of [[299999,0],[3e5,6000],[599999,6000],[6e5,10000]]){b=mk({shinhan:p});ok(`신한 충전 2만원 @${p}`,D(b,'shinhan',{amount:2e4,cat:'charge',op:opIdx('환경부')})===e,D(b,'shinhan',{amount:2e4,cat:'charge',op:opIdx('환경부')}))}
for(const [p,e] of [[299999,0],[3e5,10000],[599999,10000],[6e5,14000]]){b=mk({samsung:p});ok(`삼성 충전 2만원 @${p}`,D(b,'samsung',{amount:2e4,cat:'charge',op:opIdx('환경부')})===e)}

// ── B. 금액 공식 표 ──
const rows=[
 // [설명, prev, 카드, 옵션, 기대]
 ['신한 편의점 5천→500',{shinhan:6e5},'shinhan',{cat:'cvs',amount:5000},500],
 ['신한 편의점 2만→1천(건당 1만 인정)',{shinhan:6e5},'shinhan',{cat:'cvs',amount:2e4},1000],
 ['신한 병원 1만→1천',{shinhan:6e5},'shinhan',{cat:'hosp',amount:1e4},1000],
 ['신한 커피 4500→450',{shinhan:6e5},'shinhan',{cat:'coffee',amount:4500},450],
 ['신한 커피 3만→1천',{shinhan:6e5},'shinhan',{cat:'coffee',amount:3e4},1000],
 ['신한 대중교통 12500→1250',{shinhan:6e5},'shinhan',{cat:'transit',amount:12500},1250],
 ['신한 택시 3만→3천',{shinhan:6e5},'shinhan',{cat:'taxi',amount:3e4},3000],
 ['신한 마트 평일→0',{shinhan:6e5},'shinhan',{cat:'mart',amount:6e4},0],
 ['신한 마트 토 3만→3천',{shinhan:6e5},'shinhan',{cat:'mart',amount:3e4,date:SAT,wk:true},3000],
 ['신한 마트 일 10만→5천(건당 5만 인정)',{shinhan:6e5},'shinhan',{cat:'mart',amount:1e5,date:SUN,wk:true},5000],
 ['신한 하이패스 1만→1천',{shinhan:6e5},'shinhan',{cat:'hipass',amount:1e4},1000],
 ['신한 하이패스 10만→5천(월한도)',{shinhan:6e5},'shinhan',{cat:'hipass',amount:1e5},5000],
 ['신한 하이패스 29만9999→0',{shinhan:299999},'shinhan',{cat:'hipass',amount:1e4},0],
 ['신한 충전 6만@60만→2만(월한도)',{shinhan:6e5},'shinhan',{cat:'charge',amount:6e4,op:'9'},20000],
 ['신한 보험 40만→3만',{shinhan:6e5},'shinhan',{cat:'insurance',amount:4e5},30000],
 ['신한 보험 29만9999→0(최소결제)',{shinhan:6e5},'shinhan',{cat:'insurance',amount:299999},0],
 ['신한 간편결제 마트 토→0',{shinhan:6e5},'shinhan',{cat:'mart',amount:6e4,date:SAT,wk:true,sp:true},0],
 ['하나 간편 9999→0',{hana:6e5},'hana',{cat:'etc',amount:9999,sp:true},0],
 ['하나 간편 1만→1천',{hana:6e5},'hana',{cat:'etc',amount:1e4,sp:true},1000],
 ['하나 간편 10만→1만',{hana:6e5},'hana',{cat:'etc',amount:1e5,sp:true},10000],
 ['하나 간편 20만@30만구간→1만5천(한도)',{hana:3e5},'hana',{cat:'etc',amount:2e5,sp:true},15000],
 ['하나 실물카드 일반결제→0',{hana:6e5},'hana',{cat:'etc',amount:1e5},0],
 ['하나 스트리밍 17000→8500',{hana:6e5},'hana',{cat:'stream',amount:17000},8500],
 ['하나 멤버십(월) 9900→4950',{hana:6e5},'hana',{cat:'member',amount:9900},4950],
 ['하나 스트리밍 10만@30만구간→1만5천(한도)',{hana:3e5},'hana',{cat:'stream',amount:1e5},15000],
 ['삼성 주차 2만→2천',{samsung:6e5},'samsung',{cat:'parking',amount:2e4},2000],
 ['삼성 주차 10만→5천(통합한도)',{samsung:6e5},'samsung',{cat:'parking',amount:1e5},5000],
 ['삼성 대리운전 1만→1천',{samsung:3e5},'samsung',{cat:'driver',amount:1e4},1000],
 ['삼성 하이패스 1만→1천',{samsung:3e5},'samsung',{cat:'hipass',amount:1e4},1000],
 ['삼성 배달 3만→3천',{samsung:3e5},'samsung',{cat:'delivery',amount:3e4},3000],
 ['삼성 배달 20만@60만→1만',{samsung:6e5},'samsung',{cat:'delivery',amount:2e5},10000],
 ['삼성 배달 20만@30만→5천',{samsung:3e5},'samsung',{cat:'delivery',amount:2e5},5000],
 ['삼성 스트리밍 17000→3400',{samsung:3e5},'samsung',{cat:'stream',amount:17000},3400],
 ['삼성 해외 10만→1천(무실적)',{samsung:0},'samsung',{cat:'overseas',amount:1e5},1000],
 ['삼성 보험 30만→3만',{samsung:3e5},'samsung',{cat:'insurance',amount:3e5},30000],
 ['삼성 간편결제 배달→0',{samsung:6e5},'samsung',{cat:'delivery',amount:3e4,sp:true},0],
 ['삼성 충전 테슬라@60만 2만→1만4천',{samsung:6e5},'samsung',{cat:'charge',amount:2e4,op:'T'},14000],
];
const teslaIdx=()=>String(b.X.CHARGERS.findIndex(c=>c[0]==='테슬라'));
for(const [n,prev,cid,o,e] of rows){b=mk(prev);if(o.op==='9')o.op=opIdx('환경부');if(o.op==='T')o.op=teslaIdx();ok(n,D(b,cid,o)===e,`got ${D(b,cid,o)}`)}

// ── C. 횟수·한도 누적 ──
b=mk({shinhan:6e5});                                            // 월 5회 (편의점)
const rec=(b,cid,o)=>{b.X.form(Object.assign({amount:5000,cat:'cvs',date:'2026-10-05',sp:false,ov:false,pt:'m',op:''},o));b.X.record(cid)};
for(let d=5;d<=9;d++)rec(b,'shinhan',{date:`2026-10-0${d}`});
ok('신한 편의점 5회까지 500원씩',b.X.S.log.filter(l=>l.disc===500).length===5);
ok('신한 편의점 6회째 0 (월 5회)',D(b,'shinhan',{cat:'cvs',amount:5000,date:'2026-10-10'})===0&&b.X.calc('shinhan',tx({cat:'cvs',amount:5000,date:'2026-10-10'})).why.includes('5회'));
ok('편의점 소진해도 병원은 별개 횟수',D(b,'shinhan',{cat:'hosp',amount:5000,date:'2026-10-10'})===500);
ok('편의점 횟수는 다음 달 초기화',D(b,'shinhan',{cat:'cvs',amount:5000,date:'2026-11-02'})===500);
b=mk({shinhan:6e5});rec(b,'shinhan',{cat:'cvs'});                // 같은 날 편의점 2회
ok('신한 편의점 일 1회: 같은 날 2번째 0',D(b,'shinhan',{cat:'cvs',amount:5000})===0);
ok('같은 날 병원은 가능(영역별 각각)',D(b,'shinhan',{cat:'hosp',amount:5000})===500);
b=mk({shinhan:6e5});rec(b,'shinhan',{cat:'coffee',amount:5000});
ok('커피 일 1회',D(b,'shinhan',{cat:'coffee',amount:5000})===0);
b=mk({shinhan:6e5});rec(b,'shinhan',{cat:'mart',amount:3e4,date:SAT});
ok('마트 토요일 1회 후 같은 날 0 / 일요일은 가능',D(b,'shinhan',{cat:'mart',amount:3e4,date:SAT,wk:true})===0&&D(b,'shinhan',{cat:'mart',amount:3e4,date:SUN,wk:true})===3000);
b=mk({shinhan:6e5});rec(b,'shinhan',{cat:'cvs',amount:0});       // 금액 0 기록 → 할인 0이면 횟수 소모 안 함
ok('할인 0원 기록은 횟수를 소모하지 않음',b.X.S.log[0].ck===null&&D(b,'shinhan',{cat:'cvs',amount:5000})===500);
// 풀 누적: 삼성 주차 통합 5천
b=mk({samsung:6e5});
for(const [cat,amt] of [['parking',2e4],['hipass',2e4],['driver',2e4]])rec(b,'samsung',{cat,amount:amt});
ok('삼성 주차·하이패스·대리 통합 5천: 2000+2000+1000',JSON.stringify(b.X.S.log.map(l=>l.disc).reverse())==='[2000,2000,1000]');
ok('통합 한도 소진 후 0',D(b,'samsung',{cat:'parking',amount:2e4})===0);
// 신한 생활 통합 1만(30만구간): 카테고리 섞어서
b=mk({shinhan:3e5});
for(const [cat,amt,dd] of [['transit',6e4,'06'],['taxi',3e4,'07'],['coffee',1e4,'08']])rec(b,'shinhan',{cat,amount:amt,date:`2026-10-${dd}`});
ok('신한 생활통합 1만 공유: 6000+3000+1000',JSON.stringify(b.X.S.log.map(l=>l.disc).reverse())==='[6000,3000,1000]');
ok('통합 소진 후 교통도 0',D(b,'shinhan',{cat:'transit',amount:1e4,date:'2026-10-09'})===0);
// 하나 통합한도 (간편+스트리밍+멤버십)
b=mk({hana:3e5});rec(b,'hana',{cat:'etc',amount:1e5,sp:true});rec(b,'hana',{cat:'stream',amount:2e4});
ok('하나 통합 1만5천: 간편 1만 + 스트리밍 5천',b.X.S.log[1].disc===10000&&b.X.S.log[0].disc===5000);
// 직접입력 사용량(base) 반영
b=mk({samsung:6e5});b.X.S.cards.samsung.base.$park=4000;
ok('앱 밖 사용량 4천 입력 → 삼성 주차 잔여 1천',D(b,'samsung',{cat:'parking',amount:2e4})===1000);

// ── D. 월/연 분리 ──
b=mk({shinhan:6e5});b.X.S.log.push({id:'a',date:'2026-09-20',card:'shinhan',cat:'transit',amount:1e5,disc:2e4,pool:'life',ck:null});
ok('지난달 사용분은 이번달 한도에 영향 없음',D(b,'shinhan',{cat:'transit',amount:1e4})===1000);
b=mk({shinhan:6e5});b.X.S.log.push({id:'i',date:'2026-03-02',card:'shinhan',cat:'insurance',amount:4e5,disc:3e4,pool:'ins',ck:null});
ok('보험(연 1회): 3월 사용 → 11월 0',D(b,'shinhan',{cat:'insurance',amount:4e5,date:'2026-11-05'})===0);
ok('보험(연 1회): 다음 해 1월 가능',D(b,'shinhan',{cat:'insurance',amount:4e5,date:'2027-01-05'})===30000);
b=mk({hana:6e5});b.X.S.log.push({id:'m',date:'2026-02-01',card:'hana',cat:'member',amount:24000,disc:12000,pool:'main',ck:'memY'});
ok('하나 연 정기결제: 올해 사용 후 0 / 월 정기는 가능',D(b,'hana',{cat:'member',amount:24000,pt:'y',date:'2026-10-05'})===0&&D(b,'hana',{cat:'member',amount:24000,pt:'m'})>0);
ok('하나 연 정기결제: 내년엔 다시 가능',D(b,'hana',{cat:'member',amount:24000,pt:'y',date:'2027-01-05'})===12000);

// ── E. 신규 발급 / 교통 보정 ──
b=mk({shinhan:0});b.X.S.cards.shinhan.newIssue=true;
ok('신규발급: 실적 0이어도 30만 구간(생활 1만)',b.X.eff('shinhan')===3e5&&D(b,'shinhan',{cat:'transit',amount:2e5})===10000);
b=mk({shinhan:7e5});b.X.S.cards.shinhan.newIssue=true;
ok('신규발급: 실적이 더 크면 그대로',b.X.eff('shinhan')===7e5);
b=mk({shinhan:1e6});b.X.S.cards.shinhan.tr1=6e5;
ok('신한 전월 교통 60만 제외 → 40만 (생활 한도 1만)',b.X.eff('shinhan')===4e5&&lim('shinhan','life',b.X.eff('shinhan'))===1e4);
b=mk({shinhan:1e5});b.X.S.cards.shinhan.tr1=5e5;
ok('보정 후 음수 방지 (0)',b.X.eff('shinhan')===0);

// ── F. 월 바뀜 이월 ──
b=mk({shinhan:6e5,hana:6e5,samsung:6e5});{const S=b.X.S;S.monthKey='2026-08';
 S.log.push({id:'1',date:'2026-08-10',card:'shinhan',cat:'transit',amount:1e5,disc:1e4,pool:'life',ck:null},{id:'2',date:'2026-08-11',card:'shinhan',cat:'etc',amount:2e5,disc:0,pool:null,ck:null},
  {id:'3',date:'2026-08-12',card:'samsung',cat:'taxi',amount:5e4,disc:0,pool:null,ck:null},{id:'4',date:'2026-08-13',card:'samsung',cat:'etc',amount:3e5,disc:0,pool:null,ck:null});
 S.cards.shinhan.tr1=7e4;S.cards.shinhan.spend=1e4;S.cards.samsung.exNow=2e4;
 b.X.rollover();
 ok('이월: 신한 tr2←tr1(7만), tr1←이번달 교통(10만), prev←총 31만',S.cards.shinhan.tr2===7e4&&S.cards.shinhan.tr1===1e5&&S.cards.shinhan.prev===31e4);
 ok('이월: 신한 적용실적 = 31−10+7 = 28만',b.X.eff('shinhan')===28e4);
 ok('이월: 삼성 ex1 = 택시5만+직접2만, prev 35만 → 적용 28만',S.cards.samsung.ex1===7e4&&S.cards.samsung.prev===35e4&&b.X.eff('samsung')===28e4);
 ok('이월 후 직접입력·임시값 초기화',S.cards.shinhan.spend===0&&S.cards.samsung.exNow===0);
 ok('이월 후 배너 없음',b.X.rolloverBanner()==='');}

// ── G. 무작위 시퀀스 불변식 (한도/횟수를 절대 넘지 않는다) ──
{let seed=12345;const rnd=()=>(seed=(seed*1664525+1013904223)%4294967296)/4294967296;const pick=a=>a[Math.floor(rnd()*a.length)];
 const prevs=[0,299999,3e5,499999,5e5,599999,6e5,999999,1e6,2e6];let bad=0,n=0;
 for(let run=0;run<30;run++){
  b=mk({shinhan:pick(prevs),hana:pick(prevs),samsung:pick(prevs)});
  for(let i=0;i<120;i++){
   const day=1+Math.floor(rnd()*28),date=`2026-10-${String(day).padStart(2,'0')}`;
   const o={amount:pick([1000,5000,9999,10000,20000,60000,150000,400000]),cat:pick(b.X.CATS)[0],date,sp:rnd()<.3,ov:rnd()<.2,pt:pick(['m','y']),op:pick(['',String(Math.floor(rnd()*b.X.CHARGERS.length))])};
   const cid=pick(ids);b.X.form(o);
   let e;try{e=b.X.calc(cid,b.X.mkTx(o.sp))}catch(err){bad++;console.log('THROW',err.message,o,cid);continue}
   if(!(Number.isInteger(e.disc)&&e.disc>=0&&e.disc<=o.amount))bad++;
   n++;b.X.record(cid);
  }
  // 불변식 검사
  const S=b.X.S;
  for(const cid of ids){const prev=b.X.eff(cid);
   for(const [pid,P] of Object.entries(b.X.POOLS[cid])){
    const groups={};S.log.filter(l=>l.card===cid&&l.pool===pid).forEach(l=>{const k=P.year?l.date.slice(0,4):l.date.slice(0,7);groups[k]=(groups[k]||0)+l.disc});
    for(const v of Object.values(groups))if(v>P.lim(prev)+1e-9){bad++;console.log('LIMIT',cid,pid,v,P.lim(prev))}}
   for(const r of b.X.RULES[cid]){if(!r.ck)continue;const ls=S.log.filter(l=>l.card===cid&&l.ck===r.ck);
    const byDay={},byMon={},byYr={};ls.forEach(l=>{byDay[l.date]=(byDay[l.date]||0)+1;byMon[l.date.slice(0,7)]=(byMon[l.date.slice(0,7)]||0)+1;byYr[l.date.slice(0,4)]=(byYr[l.date.slice(0,4)]||0)+1});
    if(r.dm&&Object.values(byDay).some(v=>v>r.dm)){bad++;console.log('DAY',cid,r.ck)}
    if(r.mm&&Object.values(byMon).some(v=>v>r.mm)){bad++;console.log('MON',cid,r.ck)}
    if(r.ym&&Object.values(byYr).some(v=>v>r.ym)){bad++;console.log('YR',cid,r.ck)}}}
 }
 ok(`무작위 ${n}건: 예외·음수·한도·횟수 초과 없음`,bad===0,'bad='+bad);}

// ── H. 화면 렌더 스모크 (모든 카테고리 × 옵션 조합) ──
{b=mk({shinhan:6e5,hana:4e5,samsung:7e5});let bad=0,cnt=0;
 for(const [cat] of b.X.CATS)for(const sp of[false,true])for(const ov of[false,true])for(const pt of['m','y'])for(const op of['','0','14'])for(const amount of['',0,'1','60000']){
  b.X.form({cat,sp,ov,pt,op,amount});
  try{const h=b.X.vRec();if(!h||h.includes('undefined')||h.includes('NaN')){bad++;console.log('BADHTML',cat,sp,ov,pt,op,amount)}cnt++}catch(e){bad++;console.log('THROW vRec',cat,e.message)}}
 for(const t of['rec','cards','log','data']){b.X.setTab(t);try{b.X.render()}catch(e){bad++;console.log('THROW render',t,e.message)}}
 const html=b.X.vCards()+b.X.vData()+b.X.vLog();
 ok(`화면 ${cnt}개 조합 렌더: 예외/undefined/NaN 없음`,bad===0&&!html.includes('undefined')&&!html.includes('NaN'));}

// ── I. 손상/이상 데이터 방어 ──
{const cases={
  '알 수 없는 카드의 로그':{cards:null,log:[{id:'x',date:'2026-10-01',card:'zzz',cat:'etc',amount:1,disc:0,pool:null,ck:null}]},
  '카테고리 누락 로그':{log:[{id:'y',date:'2026-10-01',card:'hana',cat:'없는카테고리',amount:1,disc:0,pool:null,ck:null}]},
  '카드 하나 누락':{deleteCard:'samsung'},
  '필드 누락(예전 버전 데이터)':{oldFields:true}};
 for(const [name,c] of Object.entries(cases)){
  const src=boot();const S=src.X.blank();
  if(c.log)S.log=c.log;if(c.deleteCard)delete S.cards[c.deleteCard];
  if(c.oldFields)for(const k in S.cards){const {prev,newIssue,spend,base}=S.cards[k];S.cards[k]={prev,newIssue,spend,base}}
  const dst=boot({promptVal:JSON.stringify(S)});
  let err='';try{dst.X.imp();dst.X.setTab('log');dst.X.render();dst.X.setTab('cards');dst.X.render();dst.X.setTab('rec');dst.X.form({amount:5e4,cat:'etc'});dst.X.render();dst.X.record('samsung')}catch(e){err=e.message}
  ok(`복원 방어: ${name}`,!err,err)}
 // 저장소에 깨진 JSON
 const bad1=boot({store:{'autocard.v1':'{깨진'}});ok('localStorage 깨진 JSON → 빈 상태로 시작',bad1.X.S.log.length===0);
 const bad2=boot({store:{'autocard.v1':'{"cards":{},"log":[1,2,3]}'}});let e2='';try{bad2.X.setTab('log');bad2.X.render();bad2.X.setTab('cards');bad2.X.render()}catch(e){e2=e.message}
 ok('localStorage 구조가 다른 JSON → 앱이 죽지 않음',!e2,e2);}

// ── J. 초기화 기능 ──
{b=mk({shinhan:6e5,hana:6e5,samsung:6e5},{confirmAns:true});
 b.X.S.monthKey=b.X.curMonth();const m=b.X.curMonth();
 rec(b,'shinhan',{cat:'transit',amount:3e4,date:m+'-05'});
 b.X.S.log.push({id:'old',date:'2026-01-05',card:'hana',cat:'etc',amount:1e5,disc:1e3,pool:'main',ck:null});
 b.X.S.cards.shinhan.base.$life=5000;b.X.S.cards.shinhan.spend=12345;b.X.S.cards.samsung.exNow=777;
 b.X.resetMonth();
 ok('이번달 초기화: 이번달 기록 삭제, 지난 기록 유지',b.X.S.log.length===1&&b.X.S.log[0].id==='old');
 ok('이번달 초기화: 직접입력 사용량/실적/보정값 0, 전월 실적 유지',Object.keys(b.X.S.cards.shinhan.base).length===0&&b.X.S.cards.shinhan.spend===0&&b.X.S.cards.samsung.exNow===0&&b.X.S.cards.shinhan.prev===6e5);
 b.X.clearLog();ok('기록 전체 삭제',b.X.S.log.length===0&&b.X.S.cards.shinhan.prev===6e5);
 ok('초기화 후 즉시 저장(localStorage)',JSON.parse(b.store['autocard.v1']).log.length===0);
 b.X.resetAll();ok('모든 데이터 초기화: 빈 상태 + 실적 0',b.X.S.cards.shinhan.prev===0&&b.X.S.log.length===0&&!!b.X.S._ts);
 // 취소하면 아무것도 안 지움
 const c=mk({shinhan:6e5},{confirmAns:false});rec(c,'shinhan',{cat:'transit'});c.X.resetMonth();c.X.clearLog();c.X.resetAll();
 ok('확인창에서 취소하면 그대로',c.X.S.log.length===1&&c.X.S.cards.shinhan.prev===6e5);}

process.exit(done('deep')?1:0);
