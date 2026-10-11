// 화면 모드(라이트/다크) 전환 버튼 — 앱(index.html)과 가맹점 조회(merchant.html)가 함께 사용
// 저장값이 없으면 기기(시스템) 설정을 따르고, 버튼을 누르면 선택값을 저장한다. 저장된 값은 <head>의 data-theme-init 스크립트가 화면이 그려지기 전에 먼저 적용
(function(){
  var KEY='autocard.theme',root=document.documentElement;
  function sys(){return window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}
  function cur(){var t=root.getAttribute('data-theme');return t==='dark'||t==='light'?t:sys()}
  var SUN='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  var btn=document.createElement('button');btn.type='button';btn.id='themeBtn';btn.className='theme-btn no-print';
  function paint(){
    var dark=cur()==='dark';
    btn.innerHTML=dark?SUN:MOON;                                   // 지금이 다크면 해(눌러서 라이트), 라이트면 달(눌러서 다크)
    var label=dark?'라이트 모드로 전환':'다크 모드로 전환';
    btn.setAttribute('aria-label',label);btn.setAttribute('title',label);btn.setAttribute('aria-pressed',String(dark));
  }
  function toggle(){
    var next=cur()==='dark'?'light':'dark';
    root.setAttribute('data-theme',next);
    try{localStorage.setItem(KEY,next)}catch(e){}                  // 저장이 막혀 있어도 이번 화면에서는 바뀜
    paint();
  }
  btn.addEventListener('click',toggle);
  if(window.matchMedia){var mq=window.matchMedia('(prefers-color-scheme: dark)');if(mq.addEventListener)mq.addEventListener('change',paint);else if(mq.addListener)mq.addListener(paint)}
  paint();document.body.appendChild(btn);
})();
