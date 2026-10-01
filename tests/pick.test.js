// 카드 선택: 체크한 카드만 비교/관리, 처음 사용자는 선택부터, 기존 데이터 호환
const {boot,ok,done}=require('./harness');
const vm=require('vm');
const strip=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const F=(b,o)=>b.X.form(Object.assign({amount:'',cat:'etc',date:'2026-10-07',ov:false,pt:'m',op:''},o));
const names=b=>b.X.rank().map(x=>x.c.id);
const ALL=['shinhan','hana','samsung','nhnew','nhone'];

// ── 처음 사용하는 사람 (저장된 데이터 없음) ──
{const b=boot({fresh:true});
 ok('새 사용자: 선택된 카드 0장, 설정 미완료',b.X.S.enabled.length===0&&b.X.S.setupDone===false);
 ok('새 사용자: 첫 화면이 결제카드분석이 아니라 카드 선택',b.dev.els.pg.textContent==='카드 선택'&&/사용하는 카드를 선택하세요/.test(b.dev.els.app.innerHTML));
 vm.runInContext("go('rec')",b.ctx);ok('설정 전에는 다른 화면으로 가도 카드 선택으로 돌아옴',b.dev.els.pg.textContent==='카드 선택');
 vm.runInContext("go('benefits')",b.ctx);ok('전체카드혜택은 설정 전에도 볼 수 있음(고르는 데 참고)',/전체카드혜택/.test(b.dev.els.app.innerHTML));
 vm.runInContext("go('pick')",b.ctx);
 vm.runInContext('finishPick()',b.ctx);ok('0장이면 완료 불가 + 안내',b.dev.alerts.length===1&&b.X.S.setupDone===false);
 b.X.toggleCard('nhone',true);b.X.toggleCard('shinhan',true);
 ok('체크하면 선택 목록에 추가, 카드 순서는 항상 정해진 순서',JSON.stringify(b.X.S.enabled)==='["shinhan","nhone"]');
 ok('체크 즉시 저장됨(localStorage)',JSON.parse(b.store['autocard.v1']).enabled.join()==='shinhan,nhone');
 vm.runInContext('finishPick()',b.ctx);ok('완료 → 설정 완료 + 내 카드(실적 입력)로 이동',b.X.S.setupDone===true&&b.dev.els.pg.textContent==='내 카드');
 ok('내 카드에는 선택한 2장만 표시',(()=>{const t=strip(b.X.vCards());return /신한카드 EV/.test(t)&&/농협 올바른 NEW HAVE 원이 체크/.test(t)&&!/MG\+ S 하나카드/.test(t)&&!/삼성 iD EV/.test(t)})());
 ok('설정 완료 후엔 화면 이동이 자유로움',(()=>{vm.runInContext("go('rec')",b.ctx);return b.dev.els.pg.textContent==='결제카드분석'})())}
// ── 비교 대상은 체크한 카드만 ──
{const b=boot();const S=b.X.S;S.enabled=ALL.slice();S.monthKey='2026-10';for(const k of ALL)S.cards[k].prev=6e5;
 F(b,{amount:6e4,cat:'mart',date:'2026-10-03'});
 ok('5장 모두 선택 시 5장 비교',names(b).length===5);
 b.X.toggleCard('hana',false);b.X.toggleCard('nhone',false);
 ok('하나·원이 해제 → 3장만 비교',JSON.stringify(names(b).sort())===JSON.stringify(['nhnew','samsung','shinhan']));
 ok('결제카드분석 화면에도 해제한 카드는 없음',(()=>{const t=strip(b.X.vRec());return !/MG\+ S 하나카드/.test(t)&&!/원이 체크/.test(t)&&/신한카드 EV/.test(t)})());
 ok('내 카드 화면에도 해제한 카드는 없음',!/MG\+ S 하나카드/.test(strip(b.X.vCards())));
 const n0=b.X.S.log.length;b.X.record('hana');ok('해제한 카드로는 기록 불가(안내)',b.X.S.log.length===n0&&b.dev.toasts.some(t=>/선택하지 않은 카드/.test(t)));
 // 해제해도 기록·실적은 보존, 다시 체크하면 이어짐
 b.X.toggleCard('hana',true);F(b,{amount:6e4,cat:'etc'});b.X.record('hana');b.X.toggleCard('hana',false);
 ok('해제해도 기록은 남고 기록 화면에는 계속 보임',b.X.S.log.some(l=>l.card==='hana')&&/MG\+ S 하나카드/.test(strip(b.X.vLog())));
 ok('해제해도 입력한 전월 실적은 보존',b.X.S.cards.hana.prev===6e5);
 b.X.toggleCard('hana',true);ok('다시 체크하면 비교에 복귀 + 실적 그대로',names(b).includes('hana')&&b.X.eff('hana')===6e5);
 // 0장
 for(const k of ALL)b.X.toggleCard(k,false);
 ok('0장 선택 시 비교 화면이 카드 선택 안내',/비교할 카드가 선택되지 않았어요/.test(strip(b.X.vRec()))&&/카드 선택<\/b>에서/.test(b.X.vRec()));
 ok('0장 선택 시 내 카드 화면도 안내',/선택된 카드가 없어요/.test(strip(b.X.vCards())));
 ok('비교 결과 목록은 빈 배열(예외 없음)',b.X.rank().length===0)}
// ── 안내/힌트가 선택 카드 기준 ──
{const b=boot();b.X.S.enabled=['shinhan','nhnew'];b.X.S.monthKey='2026-10';F(b,{amount:1e5,cat:'costco'});
 const t=strip(b.X.vRec());ok('코스트코 안내에 선택한 카드 이름만',/신한카드 EV · 농협 올바른 NEW HAVE 체크는 코스트코에서 결제할 수 없습니다/.test(t)&&!/삼성 iD EV/.test(t));
 const c=boot();c.X.S.enabled=['nhnew'];F(c,{amount:3000,cat:'etc'});c.X.S.cards.nhnew.prev=0;
 ok('농협만 선택 + 할인 0원이어도 "전월 실적을 채우면…" 힌트에 농협을 넣지 않음',!/전월 실적을 채우면/.test(strip(c.X.vRec())))}
// ── 기존 사용자(선택 정보가 없던 데이터) 호환 ──
{const legacy={monthKey:'2026-10',cards:{shinhan:{prev:6e5},hana:{prev:3e5},samsung:{prev:0}},log:[]};
 const b=boot({store:{'autocard.v1':JSON.stringify(legacy)}});
 ok('기존 데이터: 기존 3장이 자동 선택, 설정 완료 상태',JSON.stringify(b.X.S.enabled)==='["shinhan","hana","samsung"]'&&b.X.S.setupDone===true);
 ok('기존 데이터: 첫 화면이 카드 선택이 아니라 결제카드분석',b.dev.els.pg.textContent==='결제카드분석');
 ok('기존 데이터: 실적 값 그대로',b.X.S.cards.shinhan.prev===6e5&&b.X.S.cards.hana.prev===3e5);
 ok('기존 데이터에 새 카드 필드가 보충됨(농협 카드 상태, 영역 입력, 해외겸용)',b.X.S.cards.nhnew&&b.X.S.cards.nhnew.intl===true&&typeof b.X.S.cards.nhnew.area==='object')}
// ── 정리(sanitize) ──
{const b=boot();const s=b.X.sanitize({cards:{},log:[],enabled:['nhone','없는카드','shinhan','shinhan'],setupDone:true});
 ok('알 수 없는 카드 id 제거, 중복 제거, 정해진 순서로 정렬',JSON.stringify(s.enabled)==='["shinhan","nhone"]');
 ok('enabled가 배열이 아니면 기존 3장으로',JSON.stringify(b.X.sanitize({cards:{},log:[],enabled:'x'}).enabled)==='["shinhan","hana","samsung"]');
 ok('빈 배열은 그대로 0장(의도적으로 모두 해제한 경우)',b.X.sanitize({cards:{},log:[],enabled:[],setupDone:true}).enabled.length===0)}
// ── 초기화/백업/복원/동기화에서 선택이 유지됨 ──
{const b=boot();b.X.S.enabled=['hana','nhnew'];b.X.save();b.ctx.confirm=()=>true;
 vm.runInContext('resetAll()',b.ctx);ok('모든 데이터 초기화해도 카드 선택은 유지',JSON.stringify(b.X.S.enabled)==='["hana","nhnew"]'&&b.X.S.setupDone===true);
 let clip='';const e=boot({clip:{writeText:async t=>{clip=t}}});e.X.S.enabled=['samsung','nhone'];e.X.exp();
 (async()=>{await new Promise(r=>setTimeout(r,5));
  ok('백업(JSON)에 선택한 카드가 포함',JSON.parse(clip).enabled.join()==='samsung,nhone');
  const r=boot({promptVal:clip});r.X.S.enabled=['shinhan'];r.X.imp();ok('복원하면 선택한 카드도 복원',r.X.S.enabled.join()==='samsung,nhone');
  ok('클라우드에서 내려온 데이터(applyRemote와 같은 정리)도 선택 유지',JSON.stringify(r.X.sanitize(JSON.parse(clip)).enabled)==='["samsung","nhone"]');
  // 카드 선택 화면 UI
  const u=boot();u.X.S.enabled=['shinhan'];const h=u.X.vPick(),t=strip(h);
  ok('카드 선택 화면: 5장 모두 체크박스로 나열, 선택한 것만 checked',(h.match(/type="checkbox"/g)||[]).length===5&&(h.match(/<input type="checkbox" checked/g)||[]).length===1);
  ok('카드 선택 화면: 종류(신용/체크)·연회비·요약 표시',/체크카드 · 연회비 없음/.test(t)&&/신용카드 · 연회비 1\.2만~1\.5만원/.test(t)&&/이용 1·2위 영역 추가적립/.test(t));
  ok('카드 선택 화면: 선택한 카드 수 표시, 설정 완료 후엔 "돌아가기" 버튼',/선택한 카드 1장/.test(t)&&/결제카드분석으로 돌아가기/.test(t));
  ok('카드 선택 화면: 체크박스 변경 → toggleCard 호출',/onchange="toggleCard\('shinhan',this\.checked\)"/.test(h));
  ok('#pick 해시로 바로 열기 지원',/'pick'[^\]]*\]\.includes\(hashTab\)/.test(require('./harness').HTML));
  process.exit(done('pick')?1:0)})();
}
