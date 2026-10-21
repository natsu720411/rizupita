
import './extras.css';
import {scoreBeats,normalizeInputTimeStamp} from './rhythm-core.js';
import {createInstantMeter} from './timing-meter.js';

const byId=(id)=>document.getElementById(id);
const latencyKey='rizupita-latency-ms';
function latencyValue() {
  try {
    const raw=Number(localStorage.getItem(latencyKey) || 0);
    return Number.isFinite(raw) ? Math.max(-150,Math.min(150,raw)) : 0;
  } catch { return 0; }
}
window.rizupitaGetLatencyMs=latencyValue;
const latencySlider=byId('latency-slider');
if(latencySlider) {
  latencySlider.value=String(latencyValue());
  const writeLatency=()=>{
    const value=Number(latencySlider.value);
    byId('latency-value').textContent=(value>0?'+':'')+value+' ms';
    try {localStorage.setItem(latencyKey,String(value));} catch {}
  };
  byId('latency-value').textContent=(latencyValue()>0?'+':'')+latencyValue()+' ms';
  latencySlider.addEventListener('input',writeLatency);
}

const specs={
 practice:{title:'メトロノーム練習',desc:'音に合わせて24拍タップ。ズレを見ながら繰り返し練習しよう。',help:'カウント後、24回の音に合わせてタップ！'},
 offbeat:{title:'裏拍チャレンジ',desc:'16回鳴るメトロノームの「ちょうど真ん中」を狙ってタップ。',help:'音と次の音の間を狙ってタップ！'},
 silence:{title:'無音テンポキープ',desc:'最初の8拍は音が鳴るけれど、後半8拍は無音。自分のテンポを試そう。',help:'8拍目のあと音が消えても、そのままタップ！'},
 memory:{title:'リズム記憶',desc:'8拍のフレーズを聴いて覚え、次の8拍で同じ場所だけをタップ。',help:'お手本を聴いて、後半8拍でパターンを再現！'}
};
const modeButtons=[...document.querySelectorAll('[data-mode]')];
const modeTap=byId('mode-pad'),modeStart=byId('mode-start'),modeStop=byId('mode-stop');
const modeTempo=byId('mode-bpm');
const modeMeter=createInstantMeter('mode-meter');
let latestModeResult=null;
function updateModeBest() {
  const label=byId('mode-best');
  if(mode==='practice'){label.textContent='練習モード：自分のペースで上達しよう';return;}
  try{
    const raw=localStorage.getItem('rizupita-mode-best-'+mode+'-'+modeTempo.value);
    const best=raw===null?null:Number(raw);
    label.textContent=best!==null&&Number.isFinite(best)?'自己ベスト：'+best+'点':'このゲームの最初の記録を作ろう！';
  }catch{label.textContent='ベストスコアを表示できません';}
}
modeTempo.addEventListener('change',()=>{updateModeBest();modeMeter.reset(Number(modeTempo.value));});

let mode='practice',state=null,context=null,rafId=0,token=0;
const COUNT_IN=4;
function announce(message){byId('mode-status').textContent=message;}
function setModeButtons(disabled){modeButtons.forEach(el=>el.disabled=disabled);modeTempo.disabled=disabled;}
function stopMode(quiet=false){
  token++;
  if(rafId){cancelAnimationFrame(rafId);rafId=0;}
  if(state?.nodes){state.nodes.forEach(node=>{try{node.stop();}catch{}});}
  state=null;modeTap.disabled=true;modeTap.classList.remove('is-hit');
  modeStart.hidden=false;modeStart.disabled=false;modeStop.hidden=true;
  byId('mode-share').hidden=true;
  setModeButtons(false);
  if(!quiet)announce('モードを選んでスタート！');
  modeMeter.reset(Number(modeTempo.value));
}
function selectMode(next){
  if(!specs[next] || state) return;
  mode=next;
  modeButtons.forEach(button=>{
    const selected=button.dataset.mode===mode;
    button.classList.toggle('is-chosen',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
  byId('mode-title').textContent=specs[mode].title;
  byId('mode-description').textContent=specs[mode].desc;
  byId('mode-result').textContent='';
  byId('mode-share').hidden=true;
  latestModeResult=null;
  byId('mode-progress').textContent='準備OK';
  announce('モードを選んでスタート！');
  updateModeBest();
  modeMeter.reset(Number(modeTempo.value));
}
modeButtons.forEach(button=>button.addEventListener('click',()=>selectMode(button.dataset.mode)));
function playTone(ctx,at,pitch,volume,nodes,duration=.075){
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type='sine';
  osc.frequency.setValueAtTime(pitch,at);
  osc.frequency.exponentialRampToValueAtTime(pitch*.68,at+duration);
  gain.gain.setValueAtTime(.0001,at);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume*(window.rizupitaGetVolume?.()??.7)),at+.003);
  gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  osc.connect(gain);gain.connect(ctx.destination);
  osc.start(at);osc.stop(at+duration+.02);
  nodes.push(osc);
}
function getEventTime(event,ctx) {
  const stamp=typeof ctx.getOutputTimestamp==='function'?ctx.getOutputTimestamp():null;
  let value;
  const eventTime=normalizeInputTimeStamp(event.timeStamp,performance.now(),performance.timeOrigin);
  if(stamp && stamp.performanceTime>0 && stamp.contextTime>0) value=stamp.contextTime+(eventTime-stamp.performanceTime)/1000;
  else value=ctx.currentTime+(eventTime-performance.now())/1000;
  return value-latencyValue()/1000;
}
function patternOfEight() {
  const out=[true,true,true,false,false,false,false,false];
  for(let i=out.length-1;i>0;i--){const k=Math.floor(Math.random()*(i+1));[out[i],out[k]]=[out[k],out[i]];}
  return out;
}
async function beginMode(){
  stopMode(true);
  window.dispatchEvent(new CustomEvent('rizupita:begin',{detail:{source:'mode'}}));
  const localToken=token;
  const currentMode=mode;
  const bpm=Number(modeTempo.value);
  modeStart.disabled=true;
  byId('mode-result').textContent='';
  announce('音を準備中…');
  try{
    const Context=window.AudioContext||window.webkitAudioContext;
    if(!Context)throw Error('このブラウザは音の再生に対応していません。');
    if(!context||context.state==='closed')context=new Context();
    await context.resume();
    if(localToken!==token)return;
    const interval=60/bpm,at=context.currentTime+.3;
    const start=at+COUNT_IN*interval;
    const nodes=[];
    for(let i=0;i<COUNT_IN;i++)playTone(context,at+i*interval,i===0?1200:900,.18,nodes);
    const targets=[],pattern=currentMode==='memory'?patternOfEight():null;
    let end;
    if(currentMode==='memory'){
      for(let i=0;i<8;i++){
        if(pattern[i])playTone(context,start+i*interval,960,.19,nodes);
        else playTone(context,start+i*interval,430,.045,nodes);
        playTone(context,start+(8+i)*interval,430,.065,nodes,.05);
        if(pattern[i])targets.push({time:start+(8+i)*interval,hit:null,index:i+1});
      }
      end=start+16*interval+.18;
    }else{
      const length=currentMode==='practice'?24:16;
      for(let i=0;i<length;i++){
        if(currentMode!=='silence'||i<8)playTone(context,start+i*interval,i%4===0?900:650,.16,nodes);
        targets.push({time:start+(i+(currentMode==='offbeat'?.5:0))*interval,hit:null,index:i+1});
      }
      end=start+length*interval+.18;
    }
    state={mode:currentMode,ctx:context,start,interval,bpm,targets,nodes,extra:0,end,pattern,lastProgress:''};
    modeStart.hidden=true;modeStop.hidden=false;
    setModeButtons(true);
    modeTap.disabled=true;
    announce('最初の4拍を聴いてテンポをつかもう。');
    byId('mode-progress').textContent='カウント中…';
    rafId=requestAnimationFrame(frame);
    window.dispatchEvent(new CustomEvent('rizupita:analytics',{detail:{name:'mode_start',params:{mode:currentMode,tempo:bpm}}}));
  }catch(error){
    if(localToken!==token)return;
    modeStart.disabled=false;
    announce(error?.message||'音を開始できませんでした。');
  }
}
function frame(){
  if(!state)return;
  const t=state.ctx.currentTime;
  if(t>=state.end){finishMode();return;}
  const allowedAt=state.start + (state.mode==='memory'?8*state.interval:state.mode==='offbeat'?state.interval/2:0) - Math.min(.23,state.interval*.44);
  if(t>=allowedAt&&modeTap.disabled)modeTap.disabled=false;
  let label='';
  if(t<state.start){
    label='あと '+Math.max(1,Math.ceil((state.start-t)/state.interval))+' 拍でスタート';
  }else if(state.mode==='memory'){
    const i=Math.min(16,Math.floor((t-state.start)/state.interval)+1);
    label=i<=8?'お手本 '+i+' / 8 拍': 'あなたの番 '+(i-8)+' / 8 拍';
    if(i>8)announce('お手本と同じ場所だけをタップ！');
    else announce('まずはリズムを覚えよう。まだタップしないでね。');
  }else{
    const length=state.mode==='practice'?24:16;
    const i=Math.min(length,Math.floor((t-state.start)/state.interval)+1);
    label=i+' / '+length+' 拍';
    if(state.mode==='silence'&&i>8)announce('ここから無音！テンポをキープしよう。');
    else if(state.mode==='offbeat')announce('音と音の中間を狙おう！');
    else announce('音のタイミングに合わせてタップ！');
  }
  if(label!==state.lastProgress){state.lastProgress=label;byId('mode-progress').textContent=label;}
  rafId=requestAnimationFrame(frame);
}
function tapMode(event){
  if(!state||modeTap.disabled)return;
  const time=getEventTime(event,state.ctx);
  if(time<state.start-.25 || time>state.end) return;
  if(state.mode==='memory'&&time<state.start+8*state.interval){return;}
  const windowSec=Math.min(.23,state.interval*.44);
  let best=null,diff=Infinity;
  for(const target of state.targets){
    if(target.hit!==null)continue;
    const delta=time-target.time;
    if(Math.abs(delta)<Math.abs(diff)){diff=delta;best=target;}
  }
  if(!best||Math.abs(diff)>windowSec){
    state.extra++;
    const closest=state.targets.reduce((a,b)=>Math.abs(time-a.time)<=Math.abs(time-b.time)?a:b);
    const offsetMs=(time-closest.time)*1000;
    const duplicate=closest.hit!==null && Math.abs(offsetMs)<=windowSec*1000;
    modeMeter.update(offsetMs,state.bpm,{miss:!duplicate,duplicate});
    byId('mode-result').textContent=duplicate?'同じ拍を2回タップしました':'判定範囲外。音をよく聴いて再挑戦！';
    return;
  }
  best.hit=diff*1000;
  modeMeter.update(best.hit,state.bpm);
  window.rizupitaTapFeedback?.();
  modeTap.classList.remove('is-hit');void modeTap.offsetWidth;modeTap.classList.add('is-hit');
  byId('mode-result').textContent=Math.abs(diff)<.045?'ピタッ！ ✨':(diff>0?'少し遅め！':'少し早め！');
}
function finishMode(){
  if(!state)return;
  const result=state;
  const ok=result.targets.filter(x=>Number.isFinite(x.hit));
  const assessed=scoreBeats(result.targets.map(target=>target.hit),result.bpm,result.extra,4);
  const score=assessed.score;
  const average=assessed.meanAbs===null?null:Math.round(assessed.meanAbs);
  const modeName=specs[result.mode].title;
  let message=modeName+'：'+score+'点！　平均ズレ '+(average??'—')+'ms（'+ok.length+'/'+result.targets.length+'拍成功）';
  if(result.mode!=='practice'){
    const key='rizupita-mode-best-'+result.mode+'-'+result.bpm;
    try{
      const prev=Number(localStorage.getItem(key)??-1);
      if(score>prev){localStorage.setItem(key,String(score));message+=' ✦ 自己ベスト！';}
    }catch{}
  }else message+='　続けて練習しよう！';
  stopMode(true);
  announce('チャレンジ終了！');
  byId('mode-progress').textContent=specs[result.mode].help;
  byId('mode-result').textContent=message;
  latestModeResult={mode:result.mode,bpm:result.bpm,score};
  byId('mode-share').hidden=false;
  updateModeBest();
  window.dispatchEvent(new CustomEvent('rizupita:mode-result',{detail:{mode:result.mode,bpm:result.bpm,score}}));
  window.dispatchEvent(new CustomEvent('rizupita:analytics',{detail:{name:'mode_complete',params:{mode:result.mode,tempo:result.bpm,score}}}));
}
modeStart.addEventListener('click',beginMode);
modeStop.addEventListener('click',()=>{stopMode();byId('mode-result').textContent='中止しました。もう一度挑戦できます。';});
modeTap.addEventListener('pointerdown',event=>{event.preventDefault();tapMode(event);});
modeTap.addEventListener('keydown',event=>{
 if((event.code==='Space'||event.code==='Enter')&&!event.repeat){event.preventDefault();event.stopPropagation();tapMode(event);}
});
window.addEventListener('keydown',event=>{
  if(event.defaultPrevented||event.code!=='Space'||event.repeat||!state||modeTap.disabled)return;
  if(event.target?.closest?.('button,input,select,textarea,a'))return;
  event.preventDefault();tapMode(event);
});
window.addEventListener('rizupita:begin',event=>{
  if(event.detail?.source!=='mode' && (state || modeStart.disabled))stopMode(true);
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&state){stopMode();byId('mode-result').textContent='画面を切り替えたため中止しました。';}
});

async function shareModeResult() {
  if(!latestModeResult)return;
  const {mode:game,bpm,score}=latestModeResult;
  const title=specs[game].title;
  const link=new URL('/',location.origin);
  link.searchParams.set('game',game);
  link.hash='modes';
  const text=title+'で'+score+'点！ ('+bpm+' BPM) #リズピタ #リズム感テスト';
  if(navigator.share){
    try{await navigator.share({title:'リズピタ：'+title,text,url:link.toString()});return;}catch(error){if(error?.name==='AbortError')return;}
  }
  try{
    await navigator.clipboard.writeText(text+'\n'+link.toString());
    byId('mode-result').textContent='シェア用の文章をコピーしました ✓';
  }catch{
    byId('mode-result').textContent='コピーに失敗しました。ブラウザの共有機能をご利用ください。';
  }
}
byId('mode-share').addEventListener('click',shareModeResult);
const requestedMode=new URLSearchParams(location.search).get('game');
if(requestedMode&&specs[requestedMode])selectMode(requestedMode);
else updateModeBest();

// Create a shareable PNG locally in the browser. No scores or images leave the device.
let latest=null;
window.addEventListener('rizupita:result',event=>{latest=event.detail;});
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}
function createImage(){
  if(!latest)return null;
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  const result=latest.result;
  const bg=ctx.createLinearGradient(0,0,1200,630);
  bg.addColorStop(0,'#181f49');bg.addColorStop(.55,'#302c67');bg.addColorStop(1,'#49407b');
  ctx.fillStyle=bg;ctx.fillRect(0,0,1200,630);
  ctx.strokeStyle='#ffffff18';ctx.lineWidth=26;
  for(let i=0;i<6;i++){ctx.beginPath();ctx.arc(1080,80,85+i*75,0,Math.PI*2);ctx.stroke();}
  ctx.fillStyle='#ffb38e';ctx.font='bold 42px sans-serif';ctx.fillText('♪ リズピタ',78,112);
  ctx.fillStyle='#ecebff';ctx.font='bold 35px sans-serif';ctx.fillText('あなたのリズム感は…',78,206);
  ctx.fillStyle='#fff';ctx.font='bold 165px sans-serif';ctx.fillText(String(result.score),76,404);
  ctx.fillStyle='#d5d0ff';ctx.font='bold 43px sans-serif';ctx.fillText('/ 100点',350,391);
  ctx.fillStyle='#ffbb9c';ctx.font='bold 32px sans-serif';ctx.fillText(latest.rank,80,471);
  ctx.fillStyle='#e2dcff';ctx.font='bold 26px sans-serif';ctx.fillText(result.bpm+' BPM・16拍',82,517);
  ctx.fillStyle='#ffffff1a';roundRect(ctx,631,155,500,382,28);ctx.fill();
  ctx.fillStyle='#fff';ctx.font='bold 31px sans-serif';ctx.fillText('タップのタイミング分析',664,215);
  const hasData=Number.isFinite(result.meanSigned)&&Number.isFinite(result.meanAbs);
  const signed=hasData?Math.round(Math.abs(result.meanSigned)):null;
  const direction=!hasData?'記録なし':signed===0?'ほぼぴったり':result.meanSigned<0?'早め':'遅め';
  ctx.fillStyle='#ffd3bd';ctx.font='bold 29px sans-serif';ctx.fillText(hasData?'平均の偏り '+signed+' ms '+direction:'タップの記録なし',664,288);
  ctx.fillStyle='#e6e5f8';ctx.font='bold 26px sans-serif';ctx.fillText('平均ズレ '+(hasData?Math.round(result.meanAbs)+' ms':'—'),664,340);
  const left=667,width=426,center=left+width/2,limit=Math.min(.23,60/result.bpm*.44)*1000;
  const gradient=ctx.createLinearGradient(left,0,left+width,0);
  gradient.addColorStop(0,'#81baff');gradient.addColorStop(.49,'#c4ecc9');gradient.addColorStop(.51,'#c4ecc9');gradient.addColorStop(1,'#ff9fa9');
  ctx.fillStyle=gradient;roundRect(ctx,left,385,width,23,12);ctx.fill();
  ctx.fillStyle='#313657';ctx.fillRect(center-2,377,4,40);
  const needlePosition=center+(hasData?Math.max(-1,Math.min(1,result.meanSigned/limit))*width*.46:0);
  ctx.beginPath();ctx.arc(needlePosition,396.5,13,0,Math.PI*2);
  ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=5;ctx.strokeStyle=hasData&&result.meanSigned<-.5?'#4387df':hasData&&result.meanSigned>.5?'#ea7186':'#39a16d';ctx.stroke();
  ctx.font='bold 18px sans-serif';ctx.fillStyle='#e8e5fb';ctx.fillText('早い',left,445);ctx.fillText('0 ms',center-22,445);ctx.fillText('遅い',left+width-48,445);
  ctx.font='22px sans-serif';ctx.fillStyle='#d5cff3';ctx.fillText('同じテンポで自己ベストに挑戦！',665,498);
  ctx.fillStyle='#f6f2ff';ctx.font='bold 26px sans-serif';ctx.fillText('rizupita.vercel.app',80,589);
  ctx.textAlign='right';ctx.font='22px sans-serif';ctx.fillStyle='#e2dafa';ctx.fillText('#リズピタ #リズム感診断',1125,588);
  return canvas;
}
function imageBlob(canvas){
  return new Promise(resolve=>canvas.toBlob(blob=>resolve(blob),'image/png'));
}
function saveBlob(blob){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='rizupita-score.png';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}
async function imageAction(share){
  const button=byId(share?'share-result-image':'save-result-image');
  if(!latest){return;}
  const old=button.textContent;button.disabled=true;button.textContent='画像を作成中…';
  try{
    const canvas=createImage();
    if(!canvas)throw Error('画像の作成に失敗しました。');
    const blob=await imageBlob(canvas);if(!blob)throw Error('画像の保存に失敗しました。');
    if(share&&navigator.share&&typeof File==='function'){
      const file=new File([blob],'rizupita-score.png',{type:'image/png'});
      if(navigator.canShare?.({files:[file]})){
        try{await navigator.share({title:'リズピタの診断結果',text:'リズピタでリズム感を診断しました！ #リズピタ',files:[file],url:location.href});return;}
        catch(error){if(error?.name==='AbortError')return;}
      }
    }
    saveBlob(blob);
    button.textContent=share?'画像を保存しました ✓':'保存しました ✓';
  }catch(error){
    button.textContent='保存できませんでした';
  }finally{
    button.disabled=false;setTimeout(()=>{button.textContent=old;},1800);
  }
}
byId('save-result-image')?.addEventListener('click',()=>imageAction(false));
byId('share-result-image')?.addEventListener('click',()=>imageAction(true));
