// 간편결제 체크박스 제거 후: 카드별로 유리한 결제방식을 자동 비교하고, 간편결제가 필요한 카드에는 주의 문구를 표시
const {boot,ok,done}=require('./harness');
const SAT='2026-10-03',WED='2026-10-07';
const mk=(prev)=>{const b=boot();const S=b.X.blank();S.monthKey='2026-10';for(const k in prev)S.cards[k].prev=prev[k];b.X.S=S;return b};
const run=(b,o)=>{b.X.form(Object.assign({amount:'',cat:'etc',date:WED,sp:false,ov:false,pt:'m',op:''},o));return b.X.rank()};
const by=(r)=>Object.fromEntries(r.map(x=>[x.c.id,x]));
const ALL={shinhan:6e5,hana:6e5,samsung:6e5};
let b=mk(ALL),r;

r=by(run(b,{cat:'mart',amount:6e4,date:SAT}));
ok('토 이마트 6만: 한 화면에서 하나 6000(간편결제) / 신한 5000 / 삼성 0',r.hana.disc===6000&&r.shinhan.disc===5000&&r.samsung.disc===0,JSON.stringify(Object.values(r).map(x=>x.disc)));
ok('하나는 간편결제 방식, 신한은 직접결제 방식으로 계산',r.hana.sp===true&&r.shinhan.sp===false);
ok('순위: 하나가 1위',run(b,{cat:'mart',amount:6e4,date:SAT})[0].c.id==='hana');
b.X.form({cat:'mart',amount:6e4,date:SAT});b.X.setTab('rec');
let html=b.X.vRec();
ok('체크박스(간편결제로 결제) UI 제거',!html.includes('간편결제로 결제')&&!html.includes("setF('sp'"));
const cards=html.split('<div class="res').slice(1);
const warnCards=cards.filter(c=>c.includes('간편결제(네이버페이'));
ok('주의 문구는 MG+ S 카드 아래에만 표시',warnCards.length===1&&warnCards[0].includes('MG+ S 하나카드'));
ok('주의 문구에 결제수단 목록과 "실물카드 0원" 설명',/네이버페이·카카오페이·토스페이·SSG페이·11pay·스마일페이/.test(warnCards[0])&&/할인이 없어요/.test(warnCards[0]));
ok('힌트 "간편결제로 결제하면…" 배너는 더 이상 없음',!html.includes('💡 간편결제'));

r=by(run(b,{cat:'mart',amount:6e4,date:WED}));
ok('평일 이마트: 하나만 6000, 신한 0',r.hana.disc===6000&&r.shinhan.disc===0);
r=by(run(b,{cat:'stream',amount:17000}));
ok('스트리밍: 하나는 직접 정기결제 50% (8500, 간편결제 아님) → 주의 문구 없음',r.hana.disc===8500&&r.hana.sp===false&&r.samsung.disc===3400);
b.X.form({cat:'stream',amount:17000});ok('스트리밍 화면엔 주의 문구 없음',!b.X.vRec().includes('간편결제(네이버페이'));
r=by(run(b,{cat:'member',amount:9900}));ok('멤버십: 하나 직접 50%',r.hana.disc===4950&&r.hana.sp===false);
r=by(run(b,{cat:'cvs',amount:5000}));
ok('편의점 5천원: 신한 500 / 하나 0 (1만원 미만) — 이유에 최소금액 안내',r.shinhan.disc===500&&r.hana.disc===0&&/10,000원 이상/.test(r.hana.why),r.hana.why);
b.X.form({cat:'cvs',amount:5000});ok('하나가 0원이면 주의 문구 없음',!b.X.vRec().includes('간편결제(네이버페이'));
r=by(run(b,{cat:'charge',amount:2e4,op:String(b.X.CHARGERS.findIndex(c=>c[0]==='플러그링크'))}));
ok('충전(플러그링크): 신한 10000 / 하나 간편결제 10%=2000 / 삼성 0(대상 아님)',r.shinhan.disc===1e4&&r.hana.disc===2000&&r.samsung.disc===0);
r=by(run(b,{cat:'overseas',amount:1e5}));ok('해외: 삼성 1000, 하나 간편결제 10%=10000이 1위(주의 표시)',r.samsung.disc===1000&&r.hana.disc===1e4);
ok('실적 미달이면 하나도 0 + 이유가 실적 미달',(()=>{const q=mk({hana:2e5});return by(run(q,{cat:'mart',amount:6e4,date:WED})).hana.why.includes('실적 미달')})());

// 기록: 하나 추천 → 간편결제 방식으로 계산된 할인이 저장되고 한도가 소진됨
b=mk(ALL);b.X.form({cat:'mart',amount:6e4,date:SAT,sp:false,ov:false,pt:'m',op:''});
b.X.record('hana');
ok('하나 기록: 6000원 저장, 풀 main',b.X.S.log[0].disc===6000&&b.X.S.log[0].pool==='main');
b.X.form({cat:'mart',amount:6e4,date:SAT});ok('기록 후 한도 잔여 반영(3만-6천)',b.X.usedAmt('hana','main',SAT)===6000);
b.X.record('shinhan');ok('신한 기록: 직접결제 5000',b.X.S.log[0].disc===5000&&b.X.S.log[0].card==='shinhan');
// 회귀: 수동 form.sp가 남아 있어도(구버전 저장값 등) 결과는 동일
b.X.form({sp:false});const j1=JSON.stringify(b.X.rank().map(x=>[x.c.id,x.disc,x.sp]));b.X.form({sp:true});const j2=JSON.stringify(b.X.rank().map(x=>[x.c.id,x.disc,x.sp]));ok('form.sp 값과 무관하게 동일 결과',j1===j2,j1+' vs '+j2);
// 랜덤 회귀: rank의 모든 결과는 calc(sp=false/true) 중 최대
{let bad=0;for(const cat of b.X.CATS.map(c=>c[0]))for(const amount of[5000,10000,60000]){const q=mk(ALL);q.X.form({cat,amount,date:SAT,ov:false,pt:'m',op:''});
  for(const x of q.X.rank()){const t=q.X.mkTx(false);const m=Math.max(q.X.calc(x.c.id,{...t,sp:false}).disc,q.X.calc(x.c.id,{...t,sp:true}).disc);if(x.disc!==m)bad++}}
 ok('모든 카테고리×금액: 카드별 결과 = 두 결제방식 중 최대',bad===0,'bad='+bad)}
process.exit(done('rank')?1:0);
