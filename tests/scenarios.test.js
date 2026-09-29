const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
function boot(store={},extra={}){
  const html={};const ctx={document:{getElementById:id=>(html[id]=html[id]||{}),activeElement:null,createElement:()=>({style:{},remove(){}}),body:{appendChild(){}}},
   localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v}},navigator:{},window:{addEventListener(){}},setTimeout:()=>0,console,...extra};
  vm.createContext(ctx);vm.runInContext(src+';globalThis.X={get S(){return S},set S(v){S=v},calc,mkTx,record,rollover,rolloverBanner,exp,imp,blank,form:f=>Object.assign(form,f),vCards,vRec,CHARGERS,curMonth,eff,rank,render}',ctx);
  return{X:ctx.X,store,html};
}
let fail=0;const ok=(n,c,d='')=>{if(!c)fail++;console.log(c?'PASS':'FAIL',n,d)};
const setup=(prev)=>{const b=boot();const S=b.X.blank();for(const k in prev)S.cards[k].prev=prev[k];b.X.S=S;return b};
const d=(b,cid,o)=>{const tx=Object.assign({amount:0,cat:'etc',date:'2026-10-03',sp:false,ov:false,pt:'m',op:'',wk:true},o);return b.X.calc(cid,tx)};
const ids=['shinhan','hana','samsung'];

// 1 기존 시나리오
let b=setup({shinhan:6e5,hana:6e5,samsung:6e5});
let r=ids.map(c=>d(b,c,{amount:6e4,cat:'mart',sp:true}).disc);   // 간편결제(SSG페이)
let r2=ids.map(c=>d(b,c,{amount:6e4,cat:'mart'}).disc);           // 실물카드
ok('1 토 이마트 6만: 간편결제 신한0/하나6000/삼성0',JSON.stringify(r)==='[0,6000,0]',JSON.stringify(r));
ok('1 토 이마트 6만: 실물카드 신한5000/하나0/삼성0',JSON.stringify(r2)==='[5000,0,0]',JSON.stringify(r2));
// 2 실적 미달
b=setup({shinhan:2e5,hana:2e5,samsung:2e5});
for(const cat of ['mart','charge','stream','delivery']){
  const x=ids.map(c=>d(b,c,{amount:6e4,cat,sp:cat==='mart'}));
  ok('2 실적20만 '+cat+' 전부 0원+이유',x.every(e=>e.disc===0&&e.why),x.map(e=>e.why).join(' | '));}
// 해외는 무실적이라 예외 확인
ok('2b 삼성 해외 1%는 무실적 적용',d(b,'samsung',{amount:1e5,cat:'overseas'}).disc===1000);
// 3 일 1회 제한
b=setup({shinhan:6e5});b.X.form({amount:6e4,cat:'mart',date:'2026-10-03',sp:false,ov:false,pt:'m',op:''});
const first=d(b,'shinhan',{amount:6e4,cat:'mart'}).disc;b.X.record('shinhan');
b.X.form({amount:6e4});const sec=d(b,'shinhan',{amount:6e4,cat:'mart'});
ok('3 신한 마트 1회차 5000 / 2회차 0',first===5000&&sec.disc===0,sec.why);
ok('3b 다음날 토→일 주말은 다시 가능',d(b,'shinhan',{amount:6e4,cat:'mart',date:'2026-10-04'}).disc===5000);
// 4 월 한도 소진
b=setup({shinhan:6e5});b.X.S.cards.shinhan.base.$life=20000;
const ex=d(b,'shinhan',{amount:6e4,cat:'transit',wk:false});
ok('4 신한 생활한도(2만) 소진 → 0원',ex.disc===0&&ex.why.includes('소진'),ex.why);
b.X.S.cards.shinhan.base.$life=19500;const part=d(b,'shinhan',{amount:1e4,cat:'transit'});
ok('4b 잔여 500원이면 500원만',part.disc===500,part.why);
// 5 월 바뀜
b=setup({shinhan:6e5,hana:6e5,samsung:6e5});const S=b.X.S;
S.monthKey='2026-08';S.log.push({id:1,date:'2026-08-20',card:'hana',cat:'etc',amount:400000,disc:0,pool:null,ck:null},{id:2,date:'2026-08-21',card:'hana',cat:'etc',amount:250000,disc:5000,pool:'main',ck:null});
S.cards.hana.base.$main=1000;S.cards.shinhan.base.$ins=3e4;S.cards.shinhan.base.$life=999;
ok('5 배너 표시',b.X.rolloverBanner().includes('새 달이 시작'));
b.X.rollover();
ok('5 이월: 하나 전월실적=이번달 누적 65만',S.cards.hana.prev===650000,S.cards.hana.prev);
ok('5 이월: monthKey 갱신+배너 사라짐',S.monthKey===b.X.curMonth()&&b.X.rolloverBanner()==='');
ok('5 이월: 월 한도 초기화(하나 main/신한 life) & 연 보험 유지',S.cards.hana.base.$main===undefined&&S.cards.shinhan.base.$life===undefined&&S.cards.shinhan.base.$ins===3e4);
ok('5 이월: 새 달엔 하나 60만+ 구간 한도 3만',d(b,'hana',{amount:1e5,cat:'etc',sp:true,date:b.X.curMonth()+'-15'}).disc===10000);
// 6 백업/복원
const a=setup({shinhan:4e5,hana:5e5,samsung:7e5});a.X.form({amount:6e4,cat:'mart',date:'2026-10-03',sp:false,ov:false,pt:'m',op:''});a.X.record('shinhan');
a.X.S.cards.samsung.ex1=12345;
let clip;const a2=boot({},{});
(async()=>{
  const A=boot({}, {});A.X.S=a.X.S;
  const AA=(()=>{const bb=boot({},{navigator:{clipboard:{writeText:async t=>{clip=t}}}});bb.X.S=JSON.parse(JSON.stringify(a.X.S));return bb})();
  AA.X.exp();await new Promise(r=>setTimeout(r,0));
  const B=boot({},{prompt:()=>clip,alert:m=>{throw new Error(m)}});
  B.X.imp();
  ok('6 백업 JSON 생성',!!clip&&clip.length>50);
  const strip=o=>{const c=JSON.parse(JSON.stringify(o));delete c._ts;return JSON.stringify(c)};
  ok('6 복원 후 데이터 동일 (수정시각 _ts 제외)',strip(B.X.S)===strip(a.X.S));
  ok('6 복원은 새 _ts로 기록되어 클라우드에서 최신으로 취급',B.X.S._ts>=(a.X.S._ts||0)&&!!B.X.S._ts);
  ok('6 복원 후 localStorage 저장됨',JSON.parse(B.store['autocard.v1']).cards.samsung.ex1===12345);
  ok('6 복원 후 계산 동일(신한 마트 2회차 0)',B.X.calc('shinhan',B.X.mkTx(false)).disc===a.X.calc('shinhan',a.X.mkTx(false)).disc);
  // 잘못된 JSON
  let alerted='';const C=boot({},{prompt:()=>'{"x":1}',alert:m=>{alerted=m}});const before=JSON.stringify(C.X.S);C.X.imp();
  ok('6b 잘못된 백업은 거부하고 기존 데이터 유지',alerted&&JSON.stringify(C.X.S)===before,alerted);
  // 7 플러그링크
  const P=setup({shinhan:6e5,hana:6e5,samsung:6e5});const i=String(P.X.CHARGERS.findIndex(c=>c[0]==='플러그링크'));
  const pl=ids.map(c=>d(P,c,{amount:2e4,cat:'charge',op:i}));
  ok('7 플러그링크 20,000원: 신한 10,000(50%) / 하나 0 / 삼성 0(대상 아님)',JSON.stringify(pl.map(e=>e.disc))==='[10000,0,0]',pl.map(e=>e.why).join(' | '));
  const pl30=(()=>{const q=setup({shinhan:4e5});return d(q,'shinhan',{amount:2e4,cat:'charge',op:i}).disc})();
  ok('7b 플러그링크 전월 40만이면 신한 30% = 6,000',pl30===6000,pl30);
  ok('7c 삼성은 이유 표시',pl[2].why.includes('대상이 아님'),pl[2].why);
  console.log(fail?'FAILED '+fail:'ALL PASS');
})();
