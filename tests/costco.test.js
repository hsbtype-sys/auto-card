// 코스트코: 현대카드만 결제 가능 → 내 카드 3장은 '결제 불가'로 안내하고 기록도 막는다
const {boot,ok,done}=require('./harness');
const SAT='2026-10-03';
const mk=(prev)=>{const b=boot();const S=b.X.blank();S.monthKey='2026-10';for(const k in prev)S.cards[k].prev=prev[k];b.X.S=S;return b};
const ALL={shinhan:6e5,hana:6e5,samsung:6e5};
let b=mk(ALL);
ok('카테고리 목록에 코스트코(현대카드만 가능 표기)',b.X.CATS.some(([k,l])=>k==='costco'&&/코스트코/.test(l)&&/현대카드/.test(l)));
b.X.form({cat:'costco',amount:100000,date:SAT,ov:false,pt:'m',op:''});
const r=b.X.rank();
ok('세 카드 모두 결제 불가, 할인 0',r.length===3&&r.every(x=>x.blocked===true&&x.disc===0&&/결제 불가/.test(x.why)&&/현대카드/.test(x.why)));
b.X.setTab('rec');let html=b.X.vRec();
ok('상단 안내: 코스트코는 현대카드만 결제 가능',/코스트코는 현대카드만 결제할 수 있어요/.test(html));
ok('세 카드 이름 + "결제 불가" 표시',['신한카드 EV','MG+ S 하나카드','삼성 iD EV'].every(n=>html.includes(n))&&(html.match(/결제 불가<\/span>/g)||[]).length===3);
ok('불가능한 결제라 "결제 기록" 버튼 없음',!html.includes('이 카드로 결제 기록'));
ok('추천 배지·할인 금액 없음',!html.includes('badge')&&!/-\d[\d,]*원/.test(html));
// 실적이 모자라도 "실적 채우면 혜택" 힌트는 나오지 않는다
{const q=mk({shinhan:1e5,hana:1e5,samsung:1e5});q.X.form({cat:'costco',amount:100000,date:SAT,ov:false,pt:'m',op:''});
 ok('실적 미달이어도 "전월 실적을 채우면…" 힌트 없음',!q.X.vRec().includes('전월 실적을 채우면'))}
// 금액을 안 넣어도 카테고리만 골라도 안내가 보인다
b.X.form({cat:'costco',amount:''});html=b.X.vRec();
ok('금액 입력 전에도 안내 배너 표시',/코스트코는 현대카드만 결제할 수 있어요/.test(html)&&!html.includes('결제 불가</span>'));
// 기록 차단
const n0=b.X.S.log.length;b.X.form({cat:'costco',amount:100000,date:SAT});
for(const c of['shinhan','hana','samsung'])b.X.record(c);
ok('record()도 차단: 기록이 추가되지 않음',b.X.S.log.length===n0);
ok('차단 시 토스트 안내',b.dev.toasts.some(t=>/결제 불가/.test(t)));
// 다른 카테고리 회귀
b.X.form({cat:'mart',amount:60000,date:SAT});html=b.X.vRec();const rr=Object.fromEntries(b.X.rank().map(x=>[x.c.id,x]));
ok('이마트(대형마트)는 영향 없음: 안내 배너 없음, 하나 6000/신한 5000',!/코스트코는 현대카드만 결제할 수 있어요/.test(html)&&rr.hana.disc===6000&&rr.shinhan.disc===5000&&!rr.hana.blocked);
b.X.form({cat:'mart',amount:60000,date:SAT});b.X.record('shinhan');ok('이마트는 정상 기록됨',b.X.S.log.length===n0+1&&b.X.S.log[0].disc===5000);
// 다른 카테고리로 바꾸면 배너가 사라짐
b.X.form({cat:'cvs',amount:5000});ok('카테고리 변경 시 배너 사라짐',!/코스트코는 현대카드만 결제할 수 있어요/.test(b.X.vRec()));
// 말로 입력: 코스트코를 인식
(async()=>{
const gem=o=>({status:200,ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(o)}]}}]})});
{const calls=[];const x=boot({fetch:async(u,i)=>{calls.push(i.body);return gem({amount:150000,category:'costco',date:'2026-10-03'})}});await x.X.gkSave('AIzaSyFAKE_KEY_FOR_TEST_1234567890abcdef');
 const q=await x.X.parseNaturalLanguage('토요일 코스트코 15만원');
 ok('말로 입력: 코스트코 카테고리 인식',q.cat==='costco'&&q.amount===150000);
 ok('Gemini 프롬프트에 코스트코 카테고리 포함',/costco=코스트코/.test(calls[0]))}
// 저장된 기록/백업에 costco가 있어도 방어 로직이 받아들임
{const s0=b.X.blank();s0.log=[{id:'c1',date:'2026-10-01',card:'shinhan',cat:'costco',amount:1,disc:0,pool:null,ck:null}];
 const d=boot({promptVal:JSON.stringify(s0)});d.X.imp();ok('costco 카테고리 기록도 복원 시 유지',d.X.S.log.length===1&&d.X.S.log[0].cat==='costco')}
process.exit(done('costco')?1:0);
})();
