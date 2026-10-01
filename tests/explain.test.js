// "예상 할인 내역" 팝업: 계산 근거를 풀어서 보여주고, 카드 목록의 금액과 항상 일치해야 한다
const {boot,ok,done}=require('./harness');
const vm=require('vm');
const strip=h=>h.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const mk=(prev,o={})=>{const b=boot(o);const S=b.X.blank();S.monthKey='2026-10';for(const k in prev)S.cards[k].prev=prev[k];b.X.S=S;return b};
const F=(b,o)=>b.X.form(Object.assign({amount:'',cat:'etc',date:'2026-10-07',ov:false,pt:'m',op:''},o));
const ex=(b,cid,o)=>{F(b,o);const tx=b.X.mkTx(false);const res=b.X.calcBest(cid,tx);tx.sp=!!res.sp;return{res,txt:strip(b.X.explainHTML(cid,tx,res)),html:b.X.explainHTML(cid,tx,res)}};

// 1) 스크린샷 사례: 하나카드 간편결제 10%, 4만원, 한도 잔여 1.5만 → 4천원
{const b=mk({hana:3e5});const r=ex(b,'hana',{amount:40000,cat:'etc'});
 ok('하나: 예상 할인 -4,000원',r.res.disc===4000&&/예상 할인 -4,000원/.test(r.txt),r.txt);
 ok('하나: 계산식 40,000원 × 10% = 4,000원',/40,000원 × 10% = 4,000원/.test(r.txt));
 ok('하나: 월 한도 15,000원(실적 300,000원 기준), 사용 0, 남은 15,000 → 사용 후 11,000',/월 한도 15,000원 \(실적 300,000원 기준\)/.test(r.txt)&&/남은 한도 15,000원/.test(r.txt)&&/사용 후 남은 한도 11,000원/.test(r.txt));
 ok('하나: 간편결제 결제 방식 + 간편결제 필수 경고',/결제 방식 간편결제/.test(r.txt)&&/간편결제\(네이버페이.*\)로 결제해야 적용/.test(r.txt))}
// 2) 인정금액 상한 + 횟수: 신한 마트 토요일 10만원
{const b=mk({shinhan:6e5});const r=ex(b,'shinhan',{amount:1e5,cat:'mart',date:'2026-10-03'});
 ok('신한 마트: 인정금액 50,000원(1회 상한), 계산 50,000원 × 10% = 5,000원',/할인 인정금액 50,000원 \(1회 상한\)/.test(r.txt)&&/50,000원 × 10% = 5,000원/.test(r.txt)&&r.res.disc===5000);
 ok('신한 마트: 오늘 사용 횟수 0 / 1회, 실물카드 · 직접결제',/오늘 사용 횟수 0 \/ 1회/.test(r.txt)&&/실물카드 · 직접결제/.test(r.txt));
 ok('간편결제 경고는 신한에 없음',!/로 결제해야 적용/.test(r.txt))}
// 3) 월 횟수·한도 소진 반영
{const b=mk({shinhan:6e5});F(b,{amount:5000,cat:'cvs',date:'2026-10-05'});b.X.record('shinhan');F(b,{amount:5000,cat:'cvs',date:'2026-10-06'});b.X.record('shinhan');
 const r=ex(b,'shinhan',{amount:5000,cat:'cvs',date:'2026-10-07'});
 ok('편의점 3번째: 이번 달 사용 횟수 2 / 5회, 오늘 0 / 1회',/이번 달 사용 횟수 2 \/ 5회/.test(r.txt)&&/오늘 사용 횟수 0 \/ 1회/.test(r.txt));
 ok('생활통합 한도 사용분 반영 (1,000원 사용 → 남은 19,000원)',/이번 달 사용 1,000원/.test(r.txt)&&/남은 한도 19,000원/.test(r.txt),r.txt)}
// 4) 한도 부족으로 일부만
{const b=mk({samsung:6e5});b.X.S.cards.samsung.base.$park=4000;const r=ex(b,'samsung',{amount:2e4,cat:'parking'});
 ok('삼성 주차: 한도 부족 → 2,000원 중 1,000원만',r.res.disc===1000&&/한도 부족 2,000원 중 1,000원만 적용/.test(r.txt)&&/사용 후 남은 한도 0원/.test(r.txt),r.txt)}
// 5) 정액·연 단위
{const b=mk({shinhan:6e5});const r=ex(b,'shinhan',{amount:4e5,cat:'insurance'});
 ok('신한 보험: 정액 30,000원, 연 한도 표기',/정액 30,000원/.test(r.txt)&&/연 한도 30,000원/.test(r.txt)&&/이번 해 사용 0원/.test(r.txt)&&!/계산 /.test(r.txt))}
// 6) 한도 없음 (삼성 해외)
{const b=mk({samsung:0});const r=ex(b,'samsung',{amount:1e5,cat:'overseas'});
 ok('삼성 해외 1%: 한도 없음 + 1,000원',/한도 없음/.test(r.txt)&&r.res.disc===1000&&!/남은 한도/.test(r.txt))}
// 7) 삼성 실적 제외 안내 / 충전 사업자 경고
{const b=mk({samsung:6e5});const r=ex(b,'samsung',{amount:1e4,cat:'hipass'});
 ok('삼성 하이패스: 전월 실적 제외 경고',/삼성 전월 실적에서 제외/.test(r.txt));
 const r2=ex(b,'samsung',{amount:2e4,cat:'charge',op:''});ok('충전 사업자 미선택 경고가 팝업에도 표시',/충전 사업자 미선택/.test(r2.txt),r2.txt)}
// 8) 할인 0원: 이유 + 이 카드의 해당 혜택 설명
{const b=mk({shinhan:2e5});const r=ex(b,'shinhan',{amount:5e4,cat:'mart',date:'2026-10-03'});
 ok('실적 미달 0원: 이유 + 적용 실적 200,000원',r.res.disc===0&&/예상 할인 0원/.test(r.txt)&&/전월 실적 미달/.test(r.txt)&&/적용 중인 전월 실적 200,000원/.test(r.txt));
 ok('0원이어도 이 카드의 대형마트 혜택 설명(10% · 주말 · 5만원 · 일 1회)',/이 카드의 .*대형마트.* 혜택/.test(r.txt)&&/10% · 1회 50,000원까지 인정 · 주말\(토·일\)만/.test(r.txt)&&/일 1회/.test(r.txt),r.txt);
 const m=mk({samsung:6e5});const r2=ex(m,'samsung',{amount:5e4,cat:'mart'});
 ok('혜택이 아예 없는 카테고리: "해당 혜택이 없습니다"',/이 카드에는 해당 혜택이 없습니다/.test(r2.txt));
 const h=mk({hana:6e5});const r3=ex(h,'hana',{amount:5000,cat:'cvs'});
 ok('하나 5천원: 0원 + "10,000원 이상 결제" 안내',r3.res.disc===0&&/10,000원 이상 결제/.test(r3.txt),r3.txt)}
// 9) 결제 불가(코스트코)
{const b=mk({shinhan:6e5});const r=ex(b,'shinhan',{amount:1e5,cat:'costco'});ok('코스트코: 결제 불가 안내',/결과 결제 불가/.test(r.txt)&&/현대카드/.test(r.txt))}
// 10) UI: 버튼 위치/동작/닫기
{const b=mk({shinhan:6e5,hana:6e5,samsung:6e5});F(b,{amount:6e4,cat:'mart',date:'2026-10-03'});const html=b.X.vRec();
 const rows=html.split('<div class="btnrow">').slice(1);
 ok('결과 카드 3개 모두 [결제 기록][예상 할인 내역] 버튼이 한 줄에',rows.length===3&&rows.every(r=>{const seg=r.split('</div>')[0];return seg.indexOf('이 카드로 결제 기록')<seg.indexOf('예상 할인 내역')&&seg.indexOf('예상 할인 내역')>0}));
 const c=mk({shinhan:6e5});F(c,{amount:1e5,cat:'costco'});ok('결제 불가 카드엔 예상 할인 내역 버튼 없음(기록 버튼도 없음)',!c.X.vRec().includes('예상 할인 내역'));
 vm.runInContext("showExplain('hana')",b.ctx);const pop=b.dev.els.pop;
 ok('버튼 → 팝업 열림, 카드 이름/제목 표시',pop.hidden===false&&/MG\+ S 하나카드/.test(strip(pop.innerHTML))&&/예상 할인 내역/.test(strip(pop.innerHTML)));
 ok('팝업에 닫기 버튼(✕, 닫기)',/aria-label="닫기"/.test(pop.innerHTML)&&/closePop\(\)/.test(pop.innerHTML));
 vm.runInContext('closePop()',b.ctx);ok('닫기 → 팝업 숨김',pop.hidden===true);
 F(b,{amount:''});vm.runInContext("showExplain('hana')",b.ctx);ok('금액이 없으면 팝업 안 열림(내용 없음)',pop.hidden===true);
 ok('팝업을 열어도 기록/상태는 변하지 않음(읽기 전용)',(()=>{F(b,{amount:6e4,cat:'mart',date:'2026-10-03'});const n=b.X.S.log.length,j=JSON.stringify(b.X.S);vm.runInContext("showExplain('hana')",b.ctx);vm.runInContext("showExplain('shinhan')",b.ctx);return b.X.S.log.length===n&&JSON.stringify(b.X.S)===j})())}
// 11) 무작위: 팝업의 금액 == 카드 목록 금액 (모든 카테고리·카드·옵션)
{let seed=99,bad=0,n=0;const rnd=()=>(seed=(seed*1664525+1013904223)%4294967296)/4294967296,pick=a=>a[Math.floor(rnd()*a.length)];
 const prevs=[0,3e5,5e5,6e5,1e6];
 for(let run=0;run<20;run++){const b=mk({shinhan:pick(prevs),hana:pick(prevs),samsung:pick(prevs)});
  for(let i=0;i<60;i++){
   const o={amount:pick([1000,5000,9999,10000,20000,60000,150000,400000]),cat:pick(b.X.CATS)[0],date:`2026-10-${String(1+Math.floor(rnd()*28)).padStart(2,'0')}`,ov:rnd()<.2,pt:pick(['m','y']),op:pick(['',String(Math.floor(rnd()*b.X.CHARGERS.length))])};
   F(b,o);const list=b.X.rank();
   for(const x of list){const tx=b.X.mkTx(false);tx.sp=!!x.sp;let html;try{html=b.X.explainHTML(x.c.id,tx,x)}catch(e){bad++;console.log('THROW',e.message,o,x.c.id);continue}
     const t=strip(html);n++;
     if(x.blocked){if(!/결제 불가/.test(t))bad++;continue}
     if(x.disc>0){const m=t.match(/예상 할인 -([\d,]+)원/);if(!m||+m[1].replace(/,/g,'')!==x.disc){bad++;console.log('MISMATCH',o,x.c.id,x.disc,m&&m[1])}}
     else if(!/예상 할인 0원/.test(t)){bad++;console.log('ZERO',o,x.c.id,t.slice(0,120))}
     if(/undefined|NaN|Infinity/.test(t)){bad++;console.log('BAD TEXT',o,x.c.id,t)}}
   if(rnd()<.5){const top=list.find(x=>!x.blocked&&x.disc>0);if(top)b.X.record(top.c.id)}   // 기록을 쌓아 한도/횟수 상태를 다양하게
  }}
 ok(`무작위 ${n}건: 팝업 금액 = 카드 목록 금액, undefined/NaN 없음`,bad===0,'bad='+bad)}
process.exit(done('explain')?1:0);
