// 하단 해/달 버튼: 라이트/다크 직접 선택(저장), 저장값이 없으면 시스템 설정을 따름, 두 페이지 공용
const fs=require('fs'),vm=require('vm'),path=require('path');
const R=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const THEME=R('theme.js'),IDX=R('index.html'),MER=R('merchant.html'),SW=R('service-worker.js');
let pass=0,fail=0;const ok=(n,c,d='')=>{if(c)pass++;else{fail++;console.log('FAIL',n,d)}};
// head의 "그리기 전 적용" 스크립트 (data-theme-init)
const INIT=IDX.match(/<script data-theme-init>([\s\S]*?)<\/script>/)[1];
function env({stored,sysDark=false,storageThrows=false,preInit=true}={}){
  const attrs={},store={};if(stored!==undefined)store['autocard.theme']=stored;
  const listeners=[];let dark=sysDark;
  const el=()=>{const a={};return{attrs:a,className:'',innerHTML:'',type:'',id:'',handlers:{},setAttribute(k,v){a[k]=String(v)},getAttribute(k){return k in a?a[k]:null},addEventListener(e,f){this.handlers[e]=f},click(){this.handlers.click&&this.handlers.click()}}};
  const root={setAttribute(k,v){attrs[k]=String(v)},getAttribute(k){return k in attrs?attrs[k]:null}};
  const body={kids:[],appendChild(n){this.kids.push(n)}};
  const ls={getItem:k=>{if(storageThrows)throw new Error('blocked');return k in store?store[k]:null},setItem:(k,v)=>{if(storageThrows)throw new Error('blocked');store[k]=String(v)}};
  const mq={get matches(){return dark},addEventListener:(e,f)=>listeners.push(f)};
  const ctx={document:{documentElement:root,body,createElement:()=>el()},localStorage:ls,window:{matchMedia:()=>mq}};ctx.window.matchMedia=()=>mq;
  vm.createContext(ctx);
  if(preInit)vm.runInContext(INIT,ctx);
  vm.runInContext(THEME,ctx);
  return{ctx,attrs,store,btn:body.kids[0],body,setSystem:(d)=>{dark=d;listeners.forEach(f=>f())},root};
}
// ── 처음(저장값 없음): 시스템 설정을 따름 ──
{let e=env({sysDark:false});
 ok('버튼이 본문에 한 개 추가됨(작은 원형 버튼 클래스)',e.body.kids.length===1&&/theme-btn/.test(e.btn.className)&&e.btn.id==='themeBtn');
 ok('저장값 없음 + 시스템 라이트: data-theme를 건드리지 않음(시스템 설정 그대로)',e.attrs['data-theme']===undefined);
 ok('라이트일 때: 달 아이콘 + "다크 모드로 전환" 라벨(접근성)',/M21 12\.8A9 9 0 1 1/.test(e.btn.innerHTML)&&e.btn.attrs['aria-label']==='다크 모드로 전환'&&e.btn.attrs.title==='다크 모드로 전환'&&e.btn.attrs['aria-pressed']==='false');
 e=env({sysDark:true});
 ok('시스템이 다크면: 해 아이콘 + "라이트 모드로 전환"',/<circle cx="12" cy="12" r="4"\/>/.test(e.btn.innerHTML)&&e.btn.attrs['aria-label']==='라이트 모드로 전환'&&e.btn.attrs['aria-pressed']==='true');}
// ── 클릭 전환 + 저장 ──
{let e=env({sysDark:false});e.btn.click();
 ok('라이트에서 클릭 → 다크: data-theme=dark, 저장됨, 해 아이콘으로',e.attrs['data-theme']==='dark'&&e.store['autocard.theme']==='dark'&&e.btn.attrs['aria-label']==='라이트 모드로 전환');
 e.btn.click();ok('다시 클릭 → 라이트: data-theme=light, 저장됨, 달 아이콘으로',e.attrs['data-theme']==='light'&&e.store['autocard.theme']==='light'&&e.btn.attrs['aria-label']==='다크 모드로 전환');
 e=env({sysDark:true});e.btn.click();
 ok('시스템 다크에서 클릭 → 라이트를 명시(시스템과 반대 선택도 가능)',e.attrs['data-theme']==='light'&&e.store['autocard.theme']==='light');
 for(let i=0;i<5;i++)e.btn.click();ok('여러 번 눌러도 상태가 꼬이지 않음(5번 더 → 다크)',e.attrs['data-theme']==='dark'&&e.store['autocard.theme']==='dark')}
// ── 저장값 복원 (화면이 그려지기 전 head 스크립트가 적용) ──
{let e=env({stored:'dark',sysDark:false});
 ok('저장값 dark → 시스템이 라이트여도 다크로 시작(head 스크립트가 먼저 적용)',e.attrs['data-theme']==='dark'&&e.btn.attrs['aria-label']==='라이트 모드로 전환');
 e=env({stored:'light',sysDark:true});ok('저장값 light → 시스템이 다크여도 라이트로 시작(직접 선택이 우선)',e.attrs['data-theme']==='light'&&e.btn.attrs['aria-label']==='다크 모드로 전환');
 for(const bad of ['','auto','DARK','1','null','<script>'])ok(`이상한 저장값("${bad}")은 무시하고 시스템 설정을 따름`,env({stored:bad,sysDark:false}).attrs['data-theme']===undefined);
 const x=env({stored:'dark',preInit:false});ok('(대조) head 스크립트가 없으면 저장값이 적용되지 않음 → 깜빡임 방지용으로 필요',x.attrs['data-theme']===undefined)}
// ── 방어: 저장소 차단, 시스템 변경 ──
{let e=env({storageThrows:true,sysDark:false});
 ok('저장소가 막혀 있어도 로드 오류 없음(head 스크립트·버튼 모두)',e.body.kids.length===1&&e.attrs['data-theme']===undefined);
 e.btn.click();ok('저장은 못 해도 이번 화면에서는 전환됨',e.attrs['data-theme']==='dark'&&e.btn.attrs['aria-label']==='라이트 모드로 전환');
 e=env({sysDark:false});e.setSystem(true);
 ok('시스템 설정이 바뀌면(선택 안 한 상태) 아이콘이 따라 바뀜',/<circle/.test(e.btn.innerHTML)&&e.btn.attrs['aria-label']==='라이트 모드로 전환');
 e=env({stored:'light',sysDark:false});e.setSystem(true);
 ok('직접 라이트를 골랐다면 시스템이 다크로 바뀌어도 라이트 유지',e.attrs['data-theme']==='light'&&e.btn.attrs['aria-label']==='다크 모드로 전환');
 const noMq=env({});const c2={document:noMq.ctx.document,localStorage:noMq.ctx.localStorage,window:{}};vm.createContext(c2);let thrown=null;try{vm.runInContext(THEME,c2)}catch(er){thrown=er}
 ok('matchMedia를 지원하지 않는 환경에서도 오류 없음(라이트로 간주)',thrown===null)}
// ── 두 페이지 공통 구조 ──
for(const [name,H] of [['index.html',IDX],['merchant.html',MER]]){
  ok(`${name}: head에 그리기 전 적용 스크립트(data-theme-init)가 CSS보다 앞에 있음`,/<meta charset="utf-8">\n<script data-theme-init>/.test(H)&&H.indexOf('data-theme-init')<H.indexOf('<style>'));
  ok(`${name}: theme.js를 본 스크립트 앞에서 불러옴`,/<script src="theme\.js"><\/script>\n<script>/.test(H));
  ok(`${name}: 시스템 다크는 "라이트를 직접 고르지 않았을 때만", 직접 고른 다크는 항상`,/@media\(prefers-color-scheme:dark\)\{:root:not\(\[data-theme="light"\]\)\{--bg:#0e1014/.test(H)&&/:root\[data-theme="dark"\]\{--bg:#0e1014/.test(H));
  ok(`${name}: 다크 색 값이 두 곳에서 동일(시스템 다크 = 직접 선택 다크)`,(()=>{const m=[...H.matchAll(/(--bg:#0e1014;[^}]*?);color-scheme:dark/g)].map(x=>x[1]);return m.length===2&&m[0]===m[1]})());
  ok(`${name}: color-scheme 지정(날짜 선택·스크롤바 등 기본 컨트롤도 같은 모드)`,/color-scheme:dark/.test(H)&&/:root\[data-theme="light"\]\{color-scheme:light\}/.test(H));
  ok(`${name}: 버튼은 화면 오른쪽 아래 고정, 작은 원(36px), 팝업(z-index 40)보다 아래`,/\.theme-btn\{position:fixed;right:12px;bottom:calc\(12px \+ env\(safe-area-inset-bottom\)\);z-index:12;width:36px;height:36px/.test(H)&&/\.pop\{position:fixed;inset:0;z-index:40/.test(H));
  ok(`${name}: 마지막 내용이 버튼에 가리지 않도록 하단 여백 64px`,/main\{max-width:560px;margin:0 auto;padding:16px 16px 64px\}/.test(H));
}
ok('인쇄(index.html)는 직접 고른 다크 상태에서도 항상 밝게(같은 우선순위로 덮어씀) + 버튼은 인쇄에서 숨김',/:root,:root\[data-theme="dark"\],:root\[data-theme="light"\]\{--bg:#fff/.test(IDX)&&/\.top,\.scrim,\.no-print/.test(IDX)&&/class="theme-btn no-print"|btn\.className='theme-btn no-print'/.test(IDX+THEME));
ok('서비스워커가 theme.js를 오프라인 저장 목록에 포함',/'\.\/theme\.js'/.test(SW));
ok('한 개의 키(autocard.theme)를 두 페이지가 공유(같은 저장소)',/autocard\.theme/.test(THEME)&&/autocard\.theme/.test(IDX)&&/autocard\.theme/.test(MER));
ok('기존 앱 스크립트 추출 방식(첫 속성 없는 <script> ~ 마지막 </script>)이 theme 태그와 충돌하지 않음',(()=>{for(const H of [IDX,MER]){const m=H.match(/<script>([\s\S]*)<\/script>/)[1];if(/theme\.js|data-theme-init/.test(m))return false;try{new Function(m)}catch(e){return false}}return true})());
console.log(`${fail?'FAILED':'PASS  '} theme: ${pass} ok, ${fail} fail`);process.exit(fail?1:0);
