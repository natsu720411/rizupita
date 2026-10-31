/** Progressive UX enhancements. All features fall back gracefully if unsupported. */
const get=id=>document.getElementById(id);
const intro=get('welcome-steps');
let wasSeen=false;
try{wasSeen=localStorage.getItem('rizupita-welcome-v1')==='yes';}catch{}
if(intro){intro.open=!wasSeen;}
get('welcome-done')?.addEventListener('click',()=>{
  intro.open=false;
  try{localStorage.setItem('rizupita-welcome-v1','yes');}catch{}
  get('diagnosis')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
});
document.querySelectorAll('.focus-exit').forEach(button=>{
  button.addEventListener('click',()=>{
    const relaxed=document.body.classList.toggle('focus-paused');
    document.querySelectorAll('.focus-exit').forEach(b=>b.textContent=relaxed?'集中表示に戻す ◎':'通常表示に戻す ✕');
  });
});
const install=get('install-button');
const instructions=get('install-instructions');
let installEvent=null;
const isInstalled=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function showInstallHint(){
  if(isInstalled()){
    install.disabled=true;
    install.textContent='ホーム画面に追加済み ✓';
    instructions.textContent='アプリとして起動しています。';
    return;
  }
  const ua=navigator.userAgent||'';
  if(/iPhone|iPad|iPod/i.test(ua)){
    instructions.textContent='iPhone / iPad：Safariで開き、共有ボタン（四角から上向き矢印）→「ホーム画面に追加」を選択してください。';
  }else if(/Android/i.test(ua)){
    instructions.textContent='Android：Chromeの右上メニュー（︙）→「アプリをインストール」または「ホーム画面に追加」を選択してください。';
  }else{
    instructions.textContent='ブラウザのアドレスバーまたはメニューにある「インストール」や「ショートカットを作成」を選択してください。対応状況はブラウザによって異なります。';
  }
}
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();installEvent=event;
  install.textContent='ホーム画面に追加する ↗';
  instructions.textContent='このブラウザではアプリとして追加できます。上のボタンを押してください。';
});
window.addEventListener('appinstalled',()=>{
  installEvent=null;showInstallHint();
});
install?.addEventListener('click',async()=>{
  if(isInstalled()){showInstallHint();return;}
  if(!installEvent){showInstallHint();return;}
  const prompt=installEvent;
  installEvent=null;
  try{
    await prompt.prompt();
    const choice=await prompt.userChoice;
    if(choice?.outcome==='accepted'){
      instructions.textContent='追加操作を受け付けました。ホーム画面を確認してください。';
    }else showInstallHint();
  }catch{showInstallHint();}
});
showInstallHint();
