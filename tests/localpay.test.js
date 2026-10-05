// 전통시장·동네가게: 온누리·지역화폐 가맹점일 수 있다는 참고 안내를 카드 아래에 표시
const {boot,ok,done}=require('./harness');
const strip=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const F=(b,o)=>b.X.form(Object.assign({amount:'',cat:'etc',date:'2026-10-07',ov:false,pt:'m',op:''},o));
const b=boot();b.X.S.monthKey='2026-10';for(const k of['shinhan','hana','samsung'])b.X.S.cards[k].prev=6e5;
ok('카테고리 목록에 전통시장·동네가게',b.X.CATS.some(([k,l])=>k==='market'&&/전통시장·동네가게/.test(l)));
F(b,{cat:'market',amount:30000});let h=b.X.vRec(),t=strip(h);
ok('안내 문구: 온누리상품권·지역사랑상품권(지역화폐) 가맹점일 수 있음',/온누리상품권·지역사랑상품권\(지역화폐\)/.test(t)&&/가맹점일 수 있어요/.test(t));
ok('안내 문구: 구매하실 상품권(지역화폐)의 할인율을 확인한 뒤 구매',/할인율을 확인한 뒤 구매하세요/.test(t));
ok('조사 어색한 "은(는)" 표기 없음',!/은\(는\)/.test(t)&&/이런 곳\(전통시장·동네가게\)은 온누리상품권이나 지역화폐 가맹점일 수 있어요/.test(t));
ok('온누리 가맹점 조회 버튼: 공식 주소(https://www.onnuri.gift/)로 연결',/<a class="lnkbtn" href="https:\/\/www\.onnuri\.gift\/"/.test(h)&&/온누리 가맹점 조회 ↗/.test(t));
ok('조회 버튼은 새 창으로 열리고(_blank) 보안 속성(noopener noreferrer) 포함',/target="_blank" rel="noopener noreferrer"/.test(h));
ok('조회 버튼은 안내 문구와 같은 박스 안에 있음',h.indexOf('lnkbtn')>h.indexOf('💡 참고')&&h.indexOf('lnkbtn')<h.indexOf('</div></div>',h.indexOf('lnkbtn')));
ok('단정하지 않음: "가맹점입니다" 표현 없음',!/가맹점입니다/.test(t));
const iNote=h.indexOf('💡 참고'),iLast=h.lastIndexOf('class="res');
ok('안내는 카드 결과 목록 "아래"에 표시',iNote>iLast&&iLast>0);
ok('카드 3장 비교 결과는 그대로 표시',['신한카드 EV','MG+ S 하나카드','삼성 iD EV'].every(n=>t.includes(n)));
F(b,{cat:'market',amount:''});h=b.X.vRec();t=strip(h);
ok('금액 입력 전에도 안내 표시(카테고리만 골라도)',/할인율을 확인한 뒤 구매하세요/.test(t)&&!/금액을 입력하면 카드별 할인액이/.test(t));
for(const c of['mart','cvs','etc','costco','charge'])ok('다른 카테고리엔 안내·조회 버튼 없음: '+c,(F(b,{cat:c,amount:30000}),(()=>{const hh=b.X.vRec();return !/온누리상품권·지역사랑상품권\(지역화폐\)/.test(strip(hh))&&!hh.includes('onnuri.gift')})()));
F(b,{cat:'mart',amount:''});ok('다른 카테고리 + 금액 없음: 기존 안내문 유지',/금액을 입력하면 카드별 할인액이/.test(strip(b.X.vRec())));
// 하나 간편결제 10% 등 기존 계산은 이 카테고리에도 그대로
F(b,{cat:'market',amount:30000});const r=Object.fromEntries(b.X.rank().map(x=>[x.c.id,x.disc]));
ok('계산은 그대로: 하나 간편결제 10% = 3,000, 신한·삼성 0',r.hana===3000&&r.shinhan===0&&r.samsung===0);
// 말로 입력
(async()=>{const calls=[];const x=boot({fetch:async(u,i)=>{calls.push(i.body);return{status:200,ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({amount:15000,category:'market',date:'2026-10-03'})}]}}]})}}});
 await x.X.gkSave('AIzaSyFAKE_KEY_FOR_TEST_1234567890abcdef');const q=await x.X.parseNaturalLanguage('시장에서 1만5천원');
 ok('말로 입력: 시장 → market 카테고리 인식, 프롬프트에 포함',q.cat==='market'&&/market=전통시장·동네가게/.test(calls[0]));
 process.exit(done('localpay')?1:0)})();
