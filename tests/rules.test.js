const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const src=html.match(/<script>([\s\S]*)<\/script>/)[1];
const el={};const ctx={document:{getElementById:()=>({}),activeElement:null,createElement:()=>({style:{}}),body:{appendChild(){}}},localStorage:{getItem:()=>null,setItem(){}},navigator:{},window:{addEventListener(){}},setTimeout:()=>0,console};
vm.createContext(ctx);vm.runInContext(src+`
;globalThis.T={CHARGERS,exThis,rollover,calc,S:()=>S,setS:x=>S=x,blank,CARDS,record,form:()=>form,setForm:f=>form=f,mkTx,rank,eff}`,ctx);
const T=ctx.T;let fail=0;
const ok=(n,got,exp)=>{const g=JSON.stringify(got),e=JSON.stringify(exp);if(g!==e)fail++;console.log((g===e?'PASS':'FAIL'),n,g,g===e?'':'expected '+e)};
const fresh=(prev)=>{const S=T.blank();S.monthKey='2026-10';for(const k in prev)S.cards[k].prev=prev[k];T.setS(S);return S};
const tx=(o)=>Object.assign({amount:0,cat:'etc',date:'2026-10-03',sp:false,ov:false,pt:'m',wk:true},o);
const d=(cid,o)=>T.calc(cid,tx(o)).disc;
// 기존
fresh({shinhan:6e5,hana:6e5,samsung:6e5});
ok('토 이마트 실물',['shinhan','hana','samsung'].map(c=>d(c,{amount:6e4,cat:'mart'})),[5000,0,0]);
ok('토 이마트 간편',['shinhan','hana','samsung'].map(c=>d(c,{amount:6e4,cat:'mart',sp:true})),[0,6000,0]);
// 1
let S=fresh({shinhan:35e4});S.cards.shinhan.tr1=1e5;
ok('신한 eff (tr1=10만)',T.eff('shinhan'),250000);
ok('신한 대중교통 0',d('shinhan',{amount:1e4,cat:'transit'}),0);
S.cards.shinhan.tr2=1e5;ok('신한 eff (tr2=10만)',T.eff('shinhan'),350000);
ok('신한 대중교통 1000',d('shinhan',{amount:1e4,cat:'transit'}),1000);
S.cards.shinhan.tr1=0;S.cards.shinhan.tr2=0;ok('신한 eff 교통없음',T.eff('shinhan'),350000);
// 2
S=fresh({samsung:6e5});
ok('삼성 해외+스트리밍 큰것1개',d('samsung',{amount:17000,cat:'stream',ov:true}),3400);
S.cards.samsung.base.$stream=5000;
ok('삼성 스트리밍 소진→해외 1%',d('samsung',{amount:17000,cat:'stream',ov:true}),170);
// 3
S=fresh({hana:6e5});
ok('하나 멤버십 월',d('hana',{amount:24000,cat:'member',pt:'m'}),12000);
ok('하나 멤버십 연 1회차',d('hana',{amount:24000,cat:'member',pt:'y'}),12000);
T.setForm({amount:24000,cat:'member',date:'2026-10-03',sp:false,ov:false,pt:'y'});T.record('hana');
ok('하나 멤버십 연 2회차',d('hana',{amount:24000,cat:'member',pt:'y',date:'2026-11-05'}),0);
ok('하나 연 소진 후 월 정기',d('hana',{amount:24000,cat:'member',pt:'m',date:'2026-11-05'}),12000-0>3e4-12000?3e4-12000:12000);
S=fresh({samsung:7e5});S.cards.samsung.ex1=15e4;
ok('삼성 eff (제외15만)',T.eff('samsung'),550000);
ok('삼성 충전 50%',d('samsung',{amount:2e4,cat:'charge'}),10000);
S.cards.samsung.ex1=5e4;ok('삼성 eff (제외5만)',T.eff('samsung'),650000);
ok('삼성 충전 70%',d('samsung',{amount:2e4,cat:'charge'}),14000);
S.cards.samsung.ex1=0;ok('삼성 eff 제외없음',T.eff('samsung'),700000);
S=fresh({samsung:7e5});T.setForm({amount:1e5,cat:'taxi',date:'2026-10-03',sp:false,ov:false,pt:'m'});T.record('samsung');S.cards.samsung.exNow=5e4;
ok('삼성 rollover 준비: 제외합계',T.exThis('samsung'),150000);
fresh({shinhan:6e5,hana:6e5,samsung:6e5});
const ix=n=>String(T.CHARGERS.findIndex(c=>c[0].startsWith(n)));
const ch=(n)=>['shinhan','samsung'].map(c=>d(c,{amount:2e4,cat:'charge',op:n===''?'':ix(n)}));
ok('충전 테슬라',ch('테슬라'),[0,14000]);
ok('충전 휴맥스',ch('휴맥스'),[10000,0]);
ok('충전 E-Pit',ch('E-Pit'),[10000,14000]);
ok('충전 E-Pit 신한 △경고',T.calc('shinhan',tx({amount:2e4,cat:'charge',op:ix('E-Pit')})).why.includes('조건부'),true);
ok('충전 이마트',ch('이마트'),[0,0]);
ok('충전 미선택',ch(''),[10000,14000]);
ok('충전 미선택 경고',T.calc('samsung',tx({amount:2e4,cat:'charge',op:''})).why.includes('미선택'),true);
ok('충전 레드이앤지(삼성 안내장)',ch('레드'),[0,14000]);
T.setS(S);S.monthKey='2026-09';S.log.forEach(l=>l.date='2026-09-20');S.cards.samsung.prev=0;
T.rollover();ok('삼성 rollover ex1',S.cards.samsung.ex1,150000);ok('삼성 rollover prev(총사용)',S.cards.samsung.prev,100000+0);
console.log(fail?'FAILED '+fail:'ALL PASS');
