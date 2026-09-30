// 전체카드혜택 화면: 내용이 계산 엔진(POOLS/CHARGERS)과 일치하고, PDF 저장(인쇄) 버튼/스타일이 있는지
const {boot,ok,done,HTML}=require('./harness');
const b=boot();const X=b.X;
X.setTab('benefits');const h=X.vBenefits();
const txt=h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
ok('제목·PDF 저장 버튼·출력 헤더',h.includes('<h1>전체카드혜택</h1>')&&h.includes('printBenefits()')&&h.includes('printhead'));
ok('세 카드 상세 + 항목별 한눈에 보기',['신한카드 EV (신용)','MG+ S 하나카드','삼성 iD EV 카드','항목별 한눈에 보기'].every(t=>txt.includes(t)));
ok('연회비 표기 (신한 UPI 1.2만/Master 1.5만, 하나 17,000, 삼성 1.5만)',/UPI 1만 2천원 \/ Master 1만 5천원/.test(txt)&&/17,000원/.test(txt)&&/Mastercard 1만 5천원/.test(txt));
// 엔진과의 일치: 한도 금액을 POOLS에서 뽑아 만든 문구가 화면에 실제로 나와야 함
const man=n=>{const m=Math.floor(n/1e4),c=Math.round((n%1e4)/1e3);return(m?m+'만':'')+(c?c+'천':'')+'원'};
let bad=[];
for(const [cid,pid,ps] of [['shinhan','life',[3e5,5e5,1e6]],['shinhan','charge',[3e5]],['shinhan','hipass',[3e5]],['hana','main',[3e5,6e5,1e6]],['samsung','charge',[3e5,6e5]],['samsung','park',[3e5]],['samsung','deliv',[3e5,6e5]],['samsung','stream',[3e5]]])
  for(const p of ps){const t=man(X.POOLS[cid][pid].lim(p));if(!txt.includes(t))bad.push(cid+'.'+pid+'@'+p+' '+t)}
ok('한도 금액이 엔진(POOLS) 값과 일치',bad.length===0,bad.join(', '));
ok('구체 값 점검: 신한 생활통합 1만/2만/3만, 하나 1만5천/3만/6만',/30만↑ 1만원 \/ 50만↑ 2만원 \/ 100만↑ 3만원/.test(txt)&&/30~60만 1만5천원 · 60~100만 3만원 · 100만↑ 6만원/.test(txt));
// 충전 사업자 목록이 시트 데이터(CHARGERS)와 일치
const sh=X.CHARGERS.filter(c=>c[1]).length,ss=X.CHARGERS.filter(c=>c[2]).length;
const shList=(txt.match(/신한카드 EV \(신용\).*?대상 충전 사업자: (.*?) 생활 통합/)||[])[1]||'',ssList=(txt.match(/대상 충전 사업자: (.*?) 주차장·하이패스/)||[]);
ok(`신한 대상 충전 사업자 ${sh}곳 표기(△ 포함)`,shList.split(', ').length===sh&&shList.includes('E-Pit(△)')&&shList.includes('환경부'),shList.split(', ').length+'');
const ssL=(txt.match(/삼성 iD EV 카드.*?대상 충전 사업자: (.*?) 주차장/)||[])[1]||'';
ok(`삼성 대상 충전 사업자 ${ss}곳 표기`,ssL.split(', ').length===ss&&ssL.includes('테슬라')&&ssL.includes('레드이앤지'),ssL.split(', ').length+'');
ok('신한에 없는 테슬라, 삼성에 없는 휴맥스는 각 목록에 없음',!shList.includes('테슬라')&&!ssL.includes('휴맥스'));
// 핵심 내용 점검 (안내장 기준)
for(const [n,re] of [
 ['신한 마트 주말·1회 5만원','주말\\(토·일\\) 10% · 일 1회 · 1회 5만원까지'],['신한 편의점/병원 월5회','월 5회 · 1회 1만원까지'],['신한 교통카드 전전월','교통카드 이용액은 전전월 기준'],
 ['하나 간편결제 건당 1만원','건당 1만원 이상'],['하나 스트리밍/멤버십 50%','스트리밍 50%.*디지털 멤버십 50%'],['하나 간편결제 필수 경고','반드시 간편결제로 결제해야 적용'],['하나 큰 서비스 1개','할인 금액이 큰 서비스 1개만'],
 ['삼성 해외 1%','해외 1%.*실적·한도 없음'],['삼성 중복 시 큰 것만','중복 적용되지 않으며 할인 금액이 큰 것만'],['삼성 실적 제외(대중교통·택시·하이패스)','대중교통·택시·하이패스 통행료'],
 ['보험 3만원(신한/삼성)','30만원 이상 결제 시 3만원'],['코스트코 안내','코스트코.*현대카드만 결제할 수 있어'],['면책 문구','카드사 정책에 따라 바뀔 수']])
  ok('내용: '+n,new RegExp(re).test(txt));
// 카드별 상세에 없는 카드 혜택이 섞이지 않았는지 (예: 하나에 충전/해외 혜택 표기 금지)
const hanaSec=(txt.match(/MG\+ S 하나카드 연회비.*?삼성 iD EV 카드/)||[''])[0];
ok('하나 상세에 충전·해외·하이패스 혜택이 없음',!/전기차 충전\s*\d|해외 1%|하이패스 10%/.test(hanaSec));
// 메뉴/이동/해시/인쇄
b.X.render();
ok('메뉴에서 이동 가능 (전체카드혜택 화면 렌더)',(()=>{require('vm').runInContext("go('benefits')",b.ctx);return /전체카드혜택/.test(b.dev.els.app.innerHTML)&&b.dev.els.pg.textContent==='전체카드혜택'})());
ok('#benefits 해시로 바로 열기 지원',/hashTab/.test(HTML)&&/'benefits'\]\.includes\(hashTab\)/.test(HTML));
ok('인쇄 스타일: 헤더/메뉴 숨김, 밝은 색상 강제, A4',/@media print/.test(HTML)&&/\.top,\.scrim,\.no-print/.test(HTML)&&/@page\{size:A4/.test(HTML)&&/--bg:#fff/.test(HTML));
// printBenefits: 파일 이름(title) 설정 후 print 호출, 종료 후 복원
{const t={title:'카드픽'};const calls=[];const x=boot();x.ctx.document.title='카드픽';let cb;x.ctx.window.addEventListener=(e,f)=>{if(e==='afterprint')cb=f};x.ctx.window.removeEventListener=()=>{};x.ctx.window.print=()=>calls.push(x.ctx.document.title);
 require('vm').runInContext('printBenefits()',x.ctx);
 ok('PDF 저장: 제목이 파일명(카드픽_전체카드혜택_날짜)으로 바뀐 채 print 호출',calls.length===1&&/^카드픽_전체카드혜택_\d{4}-\d{2}-\d{2}$/.test(calls[0]),calls[0]);
 cb&&cb();ok('인쇄 후 제목 복원',x.ctx.document.title==='카드픽')}
{const x=boot();x.ctx.window.addEventListener=()=>{};x.ctx.window.removeEventListener=()=>{};x.ctx.window.print=()=>{throw new Error('no')};x.ctx.document.title='카드픽';
 require('vm').runInContext('printBenefits()',x.ctx);ok('인쇄 미지원 브라우저: 앱은 안 죽고 안내',x.dev.alerts.length===1&&x.ctx.document.title==='카드픽')}
process.exit(done('benefits')?1:0);
