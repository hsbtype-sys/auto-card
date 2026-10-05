// 상단 헤더 + 삼선 메뉴 이동 (하단 탭바 제거)
const {boot,ok,done,HTML}=require('./harness');
const fs=require('fs'),path=require('path');
const b=boot();const els=b.dev.els;
b.X.render();
const items=[...els.menu.innerHTML.matchAll(/<button[^>]*onclick="go\('(\w+)'\)"[^>]*>([^<]*)</g)].map(m=>m[1]);
ok('메뉴 항목 6개, 순서: 결제카드분석 → 내 카드 → 카드 선택 → 기록 → 데이터·계정 → (맨 아래) 전체카드혜택',JSON.stringify(items)==='["rec","cards","pick","log","data","benefits"]',items.join(','));
ok('데이터·계정 항목은 구분선(sep)으로 분리',/class="[^"]*sep[^"]*"[^>]*onclick="go\('data'\)"/.test(els.menu.innerHTML));
ok('현재 화면 항목 강조(on), 헤더에 현재 화면 이름',/class="on"[^>]*onclick="go\('rec'\)"/.test(els.menu.innerHTML)&&els.pg.textContent==='결제카드분석',els.pg.textContent);
ok('처음엔 메뉴 닫힘',els.menu.hidden===true||els.menu.hidden===undefined);
const run=c=>require('vm').runInContext(c,b.ctx);
run('toggleMenu()');ok('삼선 클릭 → 메뉴 열림 + 배경막',els.menu.hidden===false&&els.scrim.hidden===false);
run('toggleMenu()');ok('다시 누르면 닫힘',els.menu.hidden===true&&els.scrim.hidden===true);
run('toggleMenu()');run("go('cards')");
ok('항목 선택 → 화면 이동 + 메뉴 자동 닫힘',run('tab')==='cards'&&els.menu.hidden===true&&els.pg.textContent==='내 카드');
ok('이동한 화면이 실제로 렌더됨',/내 카드 · 실적 입력/.test(els.app.innerHTML));
run("go('data')");
ok('데이터·계정 화면 이동: 헤더 라벨',els.pg.textContent==='데이터 · 계정',els.pg.textContent);
ok('데이터·계정 화면 내용: 계정/동기화, Gemini 키, 백업·복원, 초기화',/계정 · 동기화/.test(els.app.innerHTML)&&/Gemini API 키/.test(els.app.innerHTML)&&/백업\(JSON 복사\)/.test(els.app.innerHTML)&&/모든 데이터 초기화/.test(els.app.innerHTML));
ok('내 카드 화면에서는 데이터 섹션이 빠짐',(()=>{run("go('cards')");return !/Gemini API 키/.test(els.app.innerHTML)&&!/백업\(JSON 복사\)/.test(els.app.innerHTML)&&/신한카드 EV/.test(els.app.innerHTML)})());
run("go('log')");ok('기록 화면 이동',/결제 기록/.test(els.app.innerHTML)&&els.pg.textContent==='기록');
run("go('rec')");ok('추천 화면 복귀',/어떤 카드로 결제할까/.test(els.app.innerHTML));
ok('하단 탭바(nav) 제거됨',!/<nav\b/.test(HTML)&&!/nav\{position:fixed/.test(HTML));
ok('헤더에 앱 이름 + 삼선 버튼(접근성 라벨)',/<header class="top">/.test(HTML)&&/카드픽/.test(HTML.match(/<header[\s\S]*?<\/header>/)[0])&&/aria-label="메뉴"/.test(HTML));
const man=JSON.parse(fs.readFileSync(path.join(__dirname,'..','manifest.json'),'utf8'));
ok('manifest 이름이 앱 이름과 일치',/카드픽/.test(man.name)&&man.short_name==='카드픽');
ok('<title>/iOS 앱 이름 일치',/<title>카드픽<\/title>/.test(HTML)&&/apple-mobile-web-app-title" content="카드픽"/.test(HTML));
ok('내용이 하단 탭바 여백(90px)을 더 이상 안 씀',!/padding:16px 16px 90px/.test(HTML));
// 상단 '카드픽' 제목을 누르면 결제카드분석 화면으로
ok('헤더 제목이 버튼이고 go(\'rec\') 호출',/<button class="home" onclick="go\('rec'\)"[^>]*>💳 카드픽<\/button>/.test(HTML));
{const x=boot();const e=x.dev.els;const run=c=>require('vm').runInContext(c,x.ctx);
 run("go('benefits')");const fromBenefits=/전체카드혜택/.test(e.app.innerHTML);
 run("go('rec')");ok('다른 화면(전체카드혜택)에서 제목 클릭 → 결제카드분석',fromBenefits&&/어떤 카드로 결제할까/.test(e.app.innerHTML)&&e.pg.textContent==='결제카드분석');
 run("go('data');toggleMenu()");const open1=e.menu.hidden===false;run("go('rec')");
 ok('메뉴가 열려 있어도 제목 클릭 → 이동하며 메뉴 닫힘',open1&&e.menu.hidden===true&&e.scrim.hidden===true)}
// 삼선 메뉴의 "지역화폐 가맹점 심층 분석": 앱 안 화면 전환이 아니라 별도 페이지(merchant.html)로 이동하는 링크
{const x=boot();const e=x.dev.els;x.X.render();const m=e.menu.innerHTML;
 ok('메뉴에 "🔎 지역화폐 가맹점 심층 분석" 링크(merchant.html)가 있음',/<a role="menuitem" class="mi" href="merchant\.html">🔎 지역화폐 가맹점 심층 분석<\/a>/.test(m));
 const order=[...m.matchAll(/(go\('(\w+)'\))|href="(merchant\.html)"/g)].map(y=>y[2]||'merchant');
 ok('메뉴 순서: 결제카드분석 → 내 카드 → 카드 선택 → 기록 → 지역화폐 가맹점 심층 분석 → 데이터·계정 → 전체카드혜택',JSON.stringify(order)==='["rec","cards","pick","log","merchant","data","benefits"]',order.join(','));
 ok('링크는 새 창이 아니라 같은 창으로 이동(앱 안에서 이어서 사용)',!/href="merchant\.html"[^>]*target=/.test(m));
 ok('데이터·계정 위의 구분선(sep)은 그대로 데이터·계정 항목에만',(m.match(/class="[^"]*sep[^"]*"/g)||[]).length===1&&/class="[^"]*sep[^"]*"[^>]*onclick="go\('data'\)"/.test(m));
 ok('메뉴 링크는 화면 이름 표시/강조(on) 대상이 아님 — 현재 화면 표시는 그대로',(m.match(/class="on"/g)||[]).length===1&&e.pg.textContent==='결제카드분석');
 require('vm').runInContext("go('benefits')",x.ctx);require('vm').runInContext("go('rec')",x.ctx);
 ok('다른 메뉴 이동은 영향 없음(전체카드혜택 갔다가 결제카드분석으로 복귀)',/어떤 카드로 결제할까/.test(e.app.innerHTML));
 ok('merchant.html 이 오프라인 저장 목록(서비스워커)에 포함',/merchant\.html/.test(require('fs').readFileSync(require('path').join(__dirname,'..','service-worker.js'),'utf8')));
 ok('첫 사용자(카드 선택 전)도 메뉴에서 열 수 있음 — 링크는 화면 상태와 무관',(()=>{const f=boot({fresh:true});return /href="merchant\.html"/.test(f.dev.els.menu.innerHTML)})())}
process.exit(done('nav')?1:0);
