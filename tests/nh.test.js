// 농협 올바른 NEW HAVE 체크 / 원이 체크: 기본적립 0.2% + 스마트적립(영역 1·2위 추가적립, 전월 20만원↑, 월 5천P)
// 기대값은 안내장 규칙에서 손으로 계산 (구현을 따라 쓰지 않음)
const {boot,ok,done}=require('./harness');
const vm=require('vm');
const strip=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const mk=(prev=3e5,id='nhnew')=>{const b=boot();const S=b.X.blank();S.monthKey='2026-10';S.enabled=['shinhan','hana','samsung','nhnew','nhone'];S.cards[id].prev=prev;b.X.S=S;return b};
const F=(b,o)=>b.X.form(Object.assign({amount:'',cat:'etc',date:'2026-10-07',ov:false,pt:'m',op:''},o));
const D=(b,cid,o)=>{F(b,o);return b.X.calcBest(cid,b.X.mkTx(false))};
const rec=(b,cid,o)=>{F(b,o);b.X.record(cid)};

// ── 1) 기본적립 0.2% (모든 가맹점) ──
{const b=mk();
 ok('기타 6만원 → 기본적립 120P (영역 없음, 추가 0)',D(b,'nhnew',{amount:6e4,cat:'etc'}).disc===120);
 ok('보험·충전·하이패스 등 영역 밖도 기본적립 0.2%',['insurance','charge','hipass','parking','member'].every(c=>D(b,'nhnew',{amount:1e5,cat:c}).disc===200));
 ok('499원 → 0P (소수점 이하 버림)',D(b,'nhnew',{amount:499,cat:'etc'}).disc===0);
 ok('한도 없음: 1000만원 → 20,000P',D(b,'nhnew',{amount:1e7,cat:'etc'}).disc===20000);
 ok('전월 실적 0이어도 기본적립은 제공',(()=>{const z=mk(0);return D(z,'nhnew',{amount:1e5,cat:'etc'}).disc===200})());
 ok('원이 체크도 동일한 기본적립',D(mk(3e5,'nhone'),'nhone',{amount:6e4,cat:'etc'}).disc===120)}
// ── 2) 스마트적립: 처음 쓰는 영역은 1위 → 총 0.6% ──
{const b=mk(2e5);
 const r=D(b,'nhnew',{amount:1e5,cat:'mart'});
 ok('마트 10만원(영역② 1위) → 기본 200 + 추가 400 = 600P (0.6%)',r.disc===600&&r.nh.base===200&&r.nh.extra===400&&r.nh.rank===1&&r.nh.area===2);
 ok('전월 실적 정확히 20만원이면 적용',r.disc===600);
 const lo=mk(199999);ok('전월 19만9999원 → 스마트적립 없음, 기본 200P만 + 이유에 20만원',(()=>{const x=D(lo,'nhnew',{amount:1e5,cat:'mart'});return x.disc===200&&x.nh.extra===0&&/200,000원 이상/.test(x.why)})());
 ok('영역 매핑: 배달앱·온라인쇼핑=①, 마트·잡화=②, 구독·통신=③, 교통·택시=④, 커피·편의점=⑤, 해외=⑥',
   [['delivery',1],['online',1],['mart',2],['goods',2],['stream',3],['telecom',3],['transit',4],['taxi',4],['coffee',5],['cvs',5],['overseas',6]].every(([c,a])=>b.X.nhAreaOf(c,false)===a));
 ok('해외 플래그가 있으면 어떤 카테고리든 영역⑥',b.X.nhAreaOf('mart',true)===6&&b.X.nhAreaOf('etc',true)===6)}
// ── 3) 순위 변동에 따른 한계 증가분 (손계산) ──
{const b=mk(3e5);rec(b,'nhnew',{amount:1e5,cat:'mart',date:'2026-10-01'});rec(b,'nhnew',{amount:5e4,cat:'cvs',date:'2026-10-02'});
 // 현재: ② 10만(1위) → 400, ⑤ 5만(2위) → 100 : 추가 합계 500
 ok('기록 후 이번 달 추가적립 예상 합계 = 500P',b.X.nhExtraTotal(b.X.nhAreaTotals('nhnew','2026-10-07'),3e5)===500);
 // 커피 6만 추가 → ⑤ 11만(1위) 440, ② 10만(2위) 200 → 640 → 증가분 140, 기본 120 → 260P
 const r=D(b,'nhnew',{amount:6e4,cat:'coffee'});
 ok('⑤에 6만원 더하면 순위 역전: 증가분 140 + 기본 120 = 260P',r.disc===260&&r.nh.extra===140&&r.nh.rank===1,JSON.stringify(r.nh));
 // 온라인 1만원 → ① 1만원은 3위 → 추가 0, 기본 20
 const r3=D(b,'nhnew',{amount:1e4,cat:'online'});
 ok('3위 영역(①)에 소액 → 기본 20P만, 추가 0',r3.disc===20&&r3.nh.extra===0&&r3.nh.rank===3);
 // 기록들의 합이 맞아야 한다: 600+... 처음 600(10만 마트), 그다음 cvs 5만: 기본100 + 증가분 100(2위 .002*5만) = 200
 ok('기록된 할인(적립)합계 = 기본 합 + 월말 추가적립 (600+200)',b.X.S.log.reduce((a,l)=>a+l.disc,0)===800)}
// ── 4) 동률은 영역 번호가 앞선 쪽이 우선 ──
{const b=mk();const t=[0,0,5e4,0,0,5e4,0];ok('동률(②=⑤) → 순위 [②,⑤]',JSON.stringify(b.X.nhRanks(t))==='[2,5]');
 ok('금액 0인 영역은 순위에 없음',JSON.stringify(b.X.nhRanks([0,1,0,0,0,0,0]))==='[1]')}
// ── 5) 월 5천P 한도 (추가분만) ──
{const b=mk(3e5);b.X.S.cards.nhnew.area[2]=1e6;           // 앱 밖에서 ②에 100만원 사용 → 추가 4,000P
 ok('직접입력 영역금액이 순위에 반영: ② 100만원 = 추가 4,000P',b.X.nhExtraTotal(b.X.nhAreaTotals('nhnew','2026-10-07'),3e5)===4000);
 const r=D(b,'nhnew',{amount:1e6,cat:'cvs'});   // ⑤ 100만원 → 동률이라 ②가 1위(4000), ⑤ 2위(2000) → 6000 → 한도 5000 → 증가분 1000
 ok('한도 적용: 증가분 1,000 + 기본 2,000 = 3,000P',r.disc===3000&&r.nh.extra===1000,JSON.stringify(r.nh));
 rec(b,'nhnew',{amount:1e6,cat:'cvs'});
 const r2=D(b,'nhnew',{amount:1e6,cat:'cvs'});ok('한도(5,000P) 소진 후엔 추가 0 · 기본만 2,000P',r2.nh.extra===0&&r2.disc===2000);
 ok('기본적립은 한도와 무관 (한도 소진 후에도 지급)',r2.nh.base===2000)}
// ── 6) 해외 / 국내전용(Local) ──
{const b=mk(3e5);
 ok('해외 결제: 영역⑥ 1위 → 총 0.6%',D(b,'nhnew',{amount:1e5,cat:'overseas'}).disc===600);
 F(b,{amount:1e5,cat:'mart',ov:true});const rr=b.X.calcBest('nhnew',b.X.mkTx(false));ok('해외 플래그(마트) → 영역⑥로 계산',rr.nh.area===6&&rr.disc===600);
 b.X.S.cards.nhnew.intl=false;
 const bl=D(b,'nhnew',{amount:1e5,cat:'overseas'});ok('국내전용(Local) 카드는 해외 결제 불가',bl.blocked===true&&/국내전용/.test(bl.why)&&bl.disc===0);
 ok('국내전용이어도 국내 결제는 정상',D(b,'nhnew',{amount:1e5,cat:'mart'}).disc===600);
 F(b,{amount:1e5,cat:'overseas'});const n0=b.X.S.log.length;b.X.record('nhnew');ok('불가 결제는 기록되지 않음',b.X.S.log.length===n0)}
// ── 7) 두 카드는 서로 독립 ──
{const b=mk(3e5,'nhnew');b.X.S.cards.nhone.prev=3e5;rec(b,'nhnew',{amount:1e5,cat:'mart'});
 ok('뉴해브 기록이 원이의 영역 합계에 영향 없음',b.X.nhAreaTotals('nhone','2026-10-07')[2]===0&&b.X.nhAreaTotals('nhnew','2026-10-07')[2]===1e5);
 ok('원이는 여전히 처음 쓰는 것으로 계산(600P)',D(b,'nhone',{amount:1e5,cat:'mart'}).disc===600)}
// ── 8) 다른 달 기록은 이번 달 순위에 안 섞임 ──
{const b=mk(3e5);b.X.S.log.push({id:'o',date:'2026-09-20',card:'nhnew',cat:'mart',amount:5e6,disc:0,pool:'base',ck:null});
 ok('지난 달 기록은 이번 달 순위에 포함 안 됨',b.X.nhAreaTotals('nhnew','2026-10-07')[2]===0&&D(b,'nhnew',{amount:1e5,cat:'cvs'}).nh.extra===400)}
// ── 9) 무작위: 기록 합계가 항상 '기본 합 + 월말 추가적립(한도 적용)'과 일치 (한계 증가분이 빈틈없이 이어짐) ──
{let seed=2026,bad=0;const rnd=()=>(seed=(seed*1664525+1013904223)%4294967296)/4294967296,pick=a=>a[Math.floor(rnd()*a.length)];
 const cats=['online','delivery','mart','goods','stream','telecom','transit','taxi','coffee','cvs','overseas','etc','insurance'];
 for(let run=0;run<60;run++){const b=mk(pick([2e5,3e5,1e6]));let baseSum=0;
  for(let i=0;i<pick([3,8,20,40]);i++){const amount=pick([1000,4999,10000,33000,80000,150000,700000,2000000]);F(b,{amount,cat:pick(cats),date:`2026-10-${String(1+Math.floor(rnd()*27)).padStart(2,'0')}`,ov:rnd()<.1});
   const x=b.X.calcBest('nhnew',b.X.mkTx(false));if(x.disc<0||!Number.isInteger(x.disc))bad++;baseSum+=Math.floor(amount*.002);b.X.record('nhnew')}
  const fin=b.X.nhExtraTotal(b.X.nhAreaTotals('nhnew','2026-10-15'),b.X.S.cards.nhnew.prev);
  const logged=b.X.S.log.reduce((a,l)=>a+l.disc,0);
  if(logged!==baseSum+fin){bad++;if(bad<4)console.log('MISMATCH',logged,baseSum,fin)}}
 ok('무작위 60회: 기록 합계 = 기본적립 합 + 월말 추가적립(한도 적용)',bad===0,'bad='+bad)}
// ── 10) 화면 ──
{const b=mk(3e5);b.X.S.cards.shinhan.prev=6e5;b.X.S.cards.hana.prev=6e5;b.X.S.cards.samsung.prev=6e5;
 F(b,{amount:1e5,cat:'mart',date:'2026-10-07'});const h=b.X.vRec(),t=strip(h);
 ok('결과 목록에 농협 카드가 "+600P"로 표시',/농협 올바른 NEW HAVE 체크/.test(t)&&/\+600P/.test(t));
 ok('적립형 안내문(1P=1원 환산, 순위는 월말 확정)',/1P=1원/.test(t)&&/월말 이용금액으로 확정/.test(t));
 ok('버튼 문구: 농협은 "예상 적립 내역", 다른 카드는 "예상 할인 내역"',/예상 적립 내역/.test(t)&&/예상 할인 내역/.test(t));
 vm.runInContext("showExplain('nhnew')",b.ctx);const pop=strip(b.dev.els.pop.innerHTML);
 ok('팝업(적립): 기본적립 계산, 영역, 순위, 추가적립, 예상 적립 +600P',/예상 적립 내역/.test(pop)&&/100,000원 × 0.2% = 200P/.test(pop)&&/② 오프라인쇼핑·잡화/.test(pop)&&/1위/.test(pop)&&/예상 적립 \+600P/.test(pop),pop);
 ok('팝업: 순위는 월말 확정·익월 15일 적립 안내',/월말 이용금액으로 확정/.test(pop)&&/익월 15일 이후/.test(pop));
 ok('팝업: 커피·편의점 입점 제외 안내 / 대중교통 RF 안내',(()=>{F(b,{amount:1e4,cat:'coffee'});vm.runInContext("showExplain('nhnew')",b.ctx);const a=strip(b.dev.els.pop.innerHTML);F(b,{amount:1e4,cat:'transit'});vm.runInContext("showExplain('nhnew')",b.ctx);const c=strip(b.dev.els.pop.innerHTML);return /아울렛\) 입점 매장/.test(a)&&/후불교통\(RF\)/.test(c)})());
 F(b,{amount:1e5,cat:'mart'});b.X.record('nhnew');
 ok('기록 화면: 농협은 "+600P" / 토스트 "적립 600P"',/\+600P/.test(strip(b.X.vLog()))&&b.dev.toasts.some(x=>/적립 600P/.test(x)));
 const c=strip(b.X.vCards());
 const cv=b.X.vCards();
 ok('내 카드: 농협 카드에 해외겸용 설정, 영역별 이용금액 입력',/해외겸용 카드/.test(c)&&/① 온라인쇼핑·배달앱/.test(c)&&/⑥ 해외/.test(c));
 ok('내 카드: 농협 카드엔 신규발급 보장 체크박스가 없고(안내문만), 다른 카드엔 있음',!/S\.cards\['nhnew'\]\.newIssue/.test(cv)&&!/S\.cards\['nhone'\]\.newIssue/.test(cv)&&/S\.cards\['shinhan'\]\.newIssue/.test(cv)&&/신규 발급 보장 조항은/.test(c))
}
// ── 11) 월 이월/초기화 ──
{const b=mk(3e5);b.X.S.monthKey='2026-08';b.X.S.cards.nhnew.area[3]=77777;b.X.S.log.push({id:'q',date:'2026-08-10',card:'nhnew',cat:'mart',amount:123000,disc:0,pool:'base',ck:null});
 b.X.rollover();ok('이월: 영역 직접입력 초기화, 전월 실적 = 이번달 누적',Object.keys(b.X.S.cards.nhnew.area).length===0&&b.X.S.cards.nhnew.prev===123000);
 const c=mk(3e5);c.X.S.cards.nhnew.area[1]=5;c.ctx.confirm=()=>true;vm.runInContext('resetMonth()',c.ctx);ok('이번달 초기화: 영역 직접입력 초기화',Object.keys(c.X.S.cards.nhnew.area).length===0)}
// ── 12) 새 카테고리 / 다른 카드 영향 없음 ──
{const b=mk(6e5);b.X.S.cards.hana.prev=6e5;
 ok('새 카테고리(온라인·잡화·이동통신)가 선택 목록에 있음',['online','goods','telecom'].every(k=>b.X.CATS.some(c=>c[0]===k)));
 ok('하나 간편결제 10%는 새 카테고리에도 그대로 적용',D(b,'hana',{amount:5e4,cat:'online'}).disc===5000);
 ok('신한·삼성은 새 카테고리에 혜택 없음(0원)',D(b,'shinhan',{amount:5e4,cat:'online'}).disc===0&&D(b,'samsung',{amount:5e4,cat:'telecom'}).disc===0);
 const calls=[];const x=boot({fetch:async(u,i)=>{calls.push(i.body);return{status:200,ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({amount:30000,category:'online',date:'2026-10-03'})}]}}]})}}});
 (async()=>{await x.X.gkSave('AIzaSyFAKE_KEY_FOR_TEST_1234567890abcdef');const q=await x.X.parseNaturalLanguage('쿠팡 3만원');
  ok('말로 입력: 쿠팡 → online 카테고리, 프롬프트에 새 카테고리 포함',q.cat==='online'&&/online=온라인쇼핑/.test(calls[0])&&/goods=잡화/.test(calls[0])&&/telecom=이동통신/.test(calls[0]));
  process.exit(done('nh')?1:0)})()}
