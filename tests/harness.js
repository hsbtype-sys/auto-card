// 앱 스크립트(index.html의 <script>)를 브라우저 대신 Node vm에서 그대로 실행하는 테스트 하네스
const fs=require('fs'),vm=require('vm'),path=require('path');
const HTML=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const SRC=HTML.match(/<script>([\s\S]*)<\/script>/)[1];
const REAL_CFG=SRC.match(/const FIREBASE_CONFIG = \{[\s\S]*?\};/)[0];
const allLogs=[];
function boot({store={},firebase,config='placeholder',confirmAns=true,promptVal,clip,fetch}={}){
  const els={},dev={store,alerts:[],prompts:[],toasts:[],logs:[],online:true,els};
  const ctx={document:{getElementById:id=>els[id]=els[id]||{},activeElement:null,createElement:()=>({style:{},remove(){}}),body:{appendChild(n){dev.toasts.push(n.textContent)}}},
    localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v},removeItem:k=>{delete store[k]}},
    navigator:{get onLine(){return dev.online},clipboard:clip},window:{addEventListener(){}},console:{log:(...a)=>{dev.logs.push(a.join(' '));allLogs.push(a.join(' '))},warn:(...a)=>{dev.logs.push(a.join(' '));allLogs.push(a.join(' '))},error:(...a)=>{dev.logs.push(a.join(' '));allLogs.push(a.join(' '))}},AbortController,fetch,
    setTimeout,clearTimeout,Promise,Date,Math,JSON,
    alert:m=>dev.alerts.push(m),prompt:()=>promptVal,confirm:()=>confirmAns};
  if(firebase)ctx.firebase=firebase;
  vm.createContext(ctx);
  const cfg=config==='real'?REAL_CFG:'const FIREBASE_CONFIG={apiKey:"PLACEHOLDER"};';
  const src=config==='real'||config==='placeholder'?SRC.replace(/const FIREBASE_CONFIG = \{[\s\S]*?\};/,cfg):SRC;
  vm.runInContext(src+`;globalThis.X={get S(){return S},set S(v){S=v},form:f=>Object.assign(form,f),getForm:()=>form,record,delLog,exp,imp,save,blank,calc,mkTx,rank,eff,rollover,rolloverBanner,vRec,vCards,vData,vBenefits,vLog,render,explainHTML,showExplain,closePop,calcBest,setTab:t=>{tab=t},POOLS,RULES,CARDS,CATS,CHARGERS,curMonth,usedAmt,cnt,exThis,trThis,resetMonth,clearLog,resetAll,cloudLogin,cloudLogout,cloudSyncNow,cloudUI,cloudReady,pushNow,get syncMsg(){return syncMsg},get timer(){return syncTimer},get user(){return fbUser},gkGet,gkSave,gkDelete,gkSaveUI,getGeminiKey,parseNaturalLanguage,validateNL,nlRun,setNl:t=>{nlText=t},GEMINI_MODELS,setRetryMs:v=>{GEMINI_RETRY_MS=v},docRef:()=>docRef()}`,ctx);
  return{X:ctx.X,ctx,dev,store};
}
let pass=0,fail=0;
const ok=(n,c,d='')=>{if(c)pass++;else{fail++;console.log('FAIL',n,d)}};
const done=(name)=>{console.log(`${fail?'FAILED':'PASS  '} ${name}: ${pass} ok, ${fail} fail`);return fail};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
module.exports={allLogs,boot,ok,done,sleep,SRC,HTML};
