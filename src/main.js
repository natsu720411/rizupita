import './style.css';

const $ = (id) => document.getElementById(id);
const buttons = [...document.querySelectorAll('.difficulty')];
const progressEl = $('beat-progress');
const startButton = $('start-button');
const resetButton = $('reset-button');
const tapPad = $('tap-pad');
const STORAGE_KEY = 'rizupita-results-v1';
const TOTAL_BEATS = 16;
const COUNT_IN = 4;
let bpm = 110;
let game = null;
let animationId = 0;
let runToken = 0;
let audioContext = null;
let lastResult = null;

const timeFormat = (n) => Number.isFinite(n) ? `${Math.round(n)}` : '—';
const humanDate = (timestamp) => new Intl.DateTimeFormat('ja-JP', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'}).format(new Date(timestamp));

function readHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter(x => x && [80,110,140].includes(x.bpm) && Number.isFinite(x.score)).slice(0, 12) : [];
  } catch { return []; }
}
function saveHistory(history) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 12))); }
  catch { /* Private browsing may not allow storage. */ }
}
function bestForTempo(tempo) {
  return readHistory().filter(x => x.bpm === tempo).reduce((best,x) => Math.max(best,x.score), -1);
}
function clearProgress() {
  progressEl.replaceChildren();
  for(let i=0;i<TOTAL_BEATS;i++) {
    const item = document.createElement('span');
    item.className = 'beat-dot';
    item.setAttribute('aria-hidden','true');
    progressEl.appendChild(item);
  }
  progressEl.setAttribute('aria-label', `0 / ${TOTAL_BEATS} 拍`);
}
function updateProgress(count, complete=false) {
  const dots = [...progressEl.children];
  dots.forEach((dot,i) => {
    dot.className = 'beat-dot';
    if(i < count) dot.classList.add('is-played');
    if(game && game.taps[i] !== null) dot.classList.add('is-hit');
    if(complete && game) {
      dot.classList.toggle('is-hit', game.taps[i] !== null);
      dot.classList.toggle('is-missed', game.taps[i] === null);
    }
  });
  $('progress-text').textContent = `${count} / ${TOTAL_BEATS} BEATS`;
  progressEl.setAttribute('aria-label', `${count} / ${TOTAL_BEATS} 拍`);
}
function setStatus(status, message) { $('game-status').textContent=status; $('game-instruction').textContent=message; }
function setPad(label, display, subtitle) { $('tap-label').textContent=label; $('tap-display').textContent=display; $('tap-subtitle').textContent=subtitle; }
function resetInterface() {
  cancelGame();
  tapPad.disabled = true;
  tapPad.classList.remove('is-active','is-tapped');
  document.querySelector('.game-card').classList.remove('is-playing');
  buttons.forEach(button => {button.disabled=false;});
  $('game-error').hidden=true;
  startButton.hidden=false;
  startButton.disabled=false;
  startButton.textContent='診断スタート ↗';
  resetButton.hidden=true;
  setStatus('準備OK','4拍のカウントを聴いたら、音に合わせて16回タップ！');
  setPad('READY?','♪','音に合わせてタップ');
  $('tap-feedback').textContent='スタートを押すと音が鳴ります';
  $('tempo-indicator').textContent=`${bpm} BPM`;
  $('result-card').hidden=true;
  clearProgress();
}
function cancelGame() {
  runToken++;
  if(animationId) { cancelAnimationFrame(animationId); animationId=0; }
  if(game?.oscillators) {
    for(const o of game.oscillators) { try { o.stop(); } catch { /* already stopped */ } }
  }
  game=null;
}
function setDifficulty(nextBpm) {
  if(game) return;
  bpm=nextBpm;
  for(const button of buttons) {
    const selected=Number(button.dataset.bpm)===bpm;
    button.classList.toggle('is-selected',selected);
    button.setAttribute('aria-pressed',String(selected));
  }
  $('tempo-indicator').textContent=`${bpm} BPM`;
}
buttons.forEach(button=>{
  if (!button.hasAttribute('aria-pressed')) button.setAttribute('aria-pressed','false');
  button.addEventListener('click',()=>setDifficulty(Number(button.dataset.bpm)));
});

function scheduleBeat(ctx, time, isCount, accent, gameState) {
  // Web Audio starts every beat on its audio clock, independent of animation frames.
  const oscillator=ctx.createOscillator();
  const envelope=ctx.createGain();
  const end=time+(isCount ? .075 : .065);
  oscillator.type='sine';
  oscillator.frequency.setValueAtTime(accent ? 1180 : (isCount?880:650),time);
  oscillator.frequency.exponentialRampToValueAtTime(accent?650:400,end);
  envelope.gain.setValueAtTime(0,time);
  envelope.gain.linearRampToValueAtTime(accent?.25:.18,time+.003);
  envelope.gain.exponentialRampToValueAtTime(.0001,end);
  oscillator.connect(envelope);
  envelope.connect(ctx.destination);
  oscillator.start(time);
  oscillator.stop(end+.01);
  gameState.oscillators.push(oscillator);
}
function eventToAudioTime(ctx,event) {
  // Convert the input event's high resolution performance timestamp to the audio clock.
  // This does NOT fully remove speaker/headphone/touchscreen hardware latency.
  const stamp=typeof ctx.getOutputTimestamp==='function' ? ctx.getOutputTimestamp() : null;
  if(stamp && stamp.performanceTime>0 && stamp.contextTime>0) {
    return stamp.contextTime+(event.timeStamp-stamp.performanceTime)/1000;
  }
  return ctx.currentTime+(event.timeStamp-performance.now())/1000;
}
async function startGame() {
  resetInterface();
  const token=runToken;
  startButton.disabled=true;
  startButton.textContent='音を準備中…';
  try {
    if (!audioContext || audioContext.state === 'closed') {
      const Context=window.AudioContext||window.webkitAudioContext;
      if(!Context) throw new Error('このブラウザは音声再生に対応していません。');
      audioContext=new Context();
    }
    await audioContext.resume();
    if(token!==runToken) return;
    const ctx=audioContext;
    const interval=60/bpm;
    const startAt=ctx.currentTime+.25;
    const state={ctx,bpm,interval,startAt,firstBeat:startAt+COUNT_IN*interval,taps:Array(TOTAL_BEATS).fill(null),extra:0,oscillators:[],lastDisplay:-99};
    game=state;
    for(let i=0;i<COUNT_IN+TOTAL_BEATS;i++) scheduleBeat(ctx,startAt+i*interval,i<COUNT_IN,i%4===0,state);
    buttons.forEach(button=>button.disabled=true);
    document.querySelector('.game-card').classList.add('is-playing');
    startButton.hidden=true;
    resetButton.hidden=false;
    tapPad.disabled=true;
    setStatus('カウント中','まずは4拍の音を聴いて、テンポをつかもう。');
    $('tap-feedback').textContent='4・3・2・1 のあとにタップ開始！';
    animationId=requestAnimationFrame(tick);
  } catch(error) {
    if(token!==runToken) return;
    startButton.disabled=false;
    startButton.textContent='診断スタート ↗';
    const info=$('game-error');
    info.hidden=false;
    info.textContent=error?.message||'音声を開始できませんでした。もう一度お試しください。';
  }
}
function tick() {
  if(!game) return;
  const ctx=game.ctx;
  const t=ctx.currentTime;
  const fromStart=(t-game.startAt)/game.interval;
  const currentIndex=Math.floor(fromStart);
  const inputOpenAt=game.firstBeat-Math.min(.23,game.interval*.44);
  if(t>=inputOpenAt && tapPad.disabled) {
    tapPad.disabled=false;
    tapPad.classList.add('is-active');
    setStatus('診断中！','音が鳴るたびに、真ん中の丸をタップ！');
    $('tap-feedback').textContent='いい感じ！ 音のタイミングを狙ってね';
  }
  if(t<game.firstBeat) {
    const left=Math.max(1, COUNT_IN-Math.max(0,currentIndex));
    if(game.lastDisplay!==-left) {
      game.lastDisplay=-left;
      setPad('COUNT DOWN',String(left),'音をよく聴こう');
    }
  } else {
    const done=Math.min(TOTAL_BEATS,Math.max(0,Math.floor((t-game.firstBeat)/game.interval)+1));
    if(done!==game.lastDisplay) {
      game.lastDisplay=done;
      updateProgress(done);
      setPad('TAP!',String(done),'音に合わせてタップ');
    }
  }
  if(t > game.firstBeat+(TOTAL_BEATS-.55)*game.interval) {
    finishGame();
    return;
  }
  animationId=requestAnimationFrame(tick);
}
function hitBeat(event) {
  if(!game || tapPad.disabled) return;
  const t=eventToAudioTime(game.ctx,event);
  const index=Math.round((t-game.firstBeat)/game.interval);
  const windowSec=Math.min(.23,game.interval*.44);
  if(index<0 || index>=TOTAL_BEATS || Math.abs(t-(game.firstBeat+index*game.interval))>windowSec) {
    game.extra++;
    $('tap-feedback').textContent='拍のタイミングを狙ってみよう！';
    return;
  }
  if(game.taps[index]!==null) {game.extra++;return;}
  const errorMs=(t-(game.firstBeat+index*game.interval))*1000;
  game.taps[index]=errorMs;
  tapPad.classList.remove('is-tapped');
  void tapPad.offsetWidth;
  tapPad.classList.add('is-tapped');
  const message=Math.abs(errorMs)<35?'ピタッ！ ✨':(errorMs>0?'ちょっと遅め！':'ちょっと早め！');
  $('tap-feedback').textContent=message;
  const dot=progressEl.children[index];
  if(dot) dot.classList.add('is-hit');
}
tapPad.addEventListener('pointerdown',(event)=>{event.preventDefault();hitBeat(event);});
window.addEventListener('keydown',(event)=>{
  if(event.code!=='Space'||event.repeat||!game||tapPad.disabled) return;
  if(event.target?.matches?.('input, textarea, select')) return;
  event.preventDefault();
  hitBeat(event);
});

function finishGame() {
  if(!game) return;
  if(animationId) {cancelAnimationFrame(animationId);animationId=0;}
  const current=game;
  const windowMs=Math.min(.23,current.interval*.44)*1000;
  const hits=current.taps.filter(Number.isFinite);
  const score=Math.round(current.taps.reduce((total,error)=>total+(error===null?0:Math.max(0,100*(1-Math.abs(error)/windowMs))),0)/TOTAL_BEATS);
  const meanAbs=hits.length ? hits.reduce((sum,x)=>sum+Math.abs(x),0)/hits.length : null;
  const meanSigned=hits.length ? hits.reduce((sum,x)=>sum+x,0)/hits.length : null;
  const result={id:Date.now(),time:Date.now(),score,bpm:current.bpm,meanAbs,meanSigned,hits:hits.length,extra:current.extra,errors:[...current.taps]};
  const existing=readHistory();
  const previousBest=existing.filter(x=>x.bpm===bpm).reduce((m,x)=>Math.max(m,x.score),-1);
  saveHistory([result,...existing]);
  lastResult=result;
  updateProgress(TOTAL_BEATS,true);
  tapPad.disabled=true;
  tapPad.classList.remove('is-active');
  buttons.forEach(button=>button.disabled=false);
  document.querySelector('.game-card').classList.remove('is-playing');
  setStatus('診断完了！','おつかれさま！診断結果をチェックしよう。');
  setPad('FINISH!','★','結果を見てみよう');
  $('tap-feedback').textContent='今回のリズムはどうだったかな？';
  game=null;
  renderResult(result,previousBest);
  renderHistory();
  $('result-card').hidden=false;
  $('result-card').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
}
function tierFor(score) {
  if(score>=90) return ['リズムマスター','すごい！ビートを見事にキャッチ。次はもっと速いテンポにも挑戦！'];
  if(score>=75) return ['ビートの達人','いい感じ！テンポをしっかりつかめているよ。'];
  if(score>=55) return ['グッドグルーヴ','リズムに乗れてきた！もう一度やると伸びるかも。'];
  return ['これからもっと上手に！','音をよく聴きながら、ゆったりテンポから挑戦してみよう。'];
}
function renderResult(result,previousBest) {
  $('result-score').textContent=String(result.score);
  const [rank,message]=tierFor(result.score);
  $('result-rank').textContent=rank;
  $('result-message').textContent=message;
  $('best-label').textContent=result.score>previousBest ? '✦ このテンポの自己ベスト更新！' : `このテンポのベスト: ${Math.max(previousBest,result.score)}点`;
  $('metric-error').innerHTML=`${timeFormat(result.meanAbs)} <em>ms</em>`;
  const bias=result.meanSigned===null?'測定なし':result.meanSigned>15?'遅め':result.meanSigned < -15?'早め':'ほぼピッタリ';
  $('metric-bias').textContent=bias;
  $('metric-hit').innerHTML=`${result.hits} <em>/16</em>`;
  const container=$('timing-chart');
  container.replaceChildren();
  result.errors.forEach((error,i)=>{
    const item=document.createElement('div');
    item.className='chart-beat';
    const track=document.createElement('div');track.className='chart-track';
    const axis=document.createElement('span');axis.className='chart-center-line';track.appendChild(axis);
    const marker=document.createElement('span');
    marker.className='chart-marker'+(error===null?' is-missing':'');
    if(error!==null) marker.style.left=`${50+Math.max(-46,Math.min(46,error/230*46))}%`;
    else marker.style.left='50%';
    track.appendChild(marker);
    const label=document.createElement('small');label.textContent=String(i+1);
    item.append(track,label);
    item.title=error===null ? `${i+1}拍目: ミス` : `${i+1}拍目: ${Math.round(error)>0?'+':''}${Math.round(error)}ms`;
    container.appendChild(item);
  });
  container.setAttribute('aria-label',`16拍のタイミング。${result.hits}拍ヒット、平均誤差${timeFormat(result.meanAbs)}ミリ秒。`);
  const text=`リズピタでリズム感診断！ 🥁\n${result.bpm}BPMで ${result.score}点 / 100点 ✨\n称号：${rank}\nあなたは何点？ #リズピタ #リズム感診断`;
  const address=location.origin+location.pathname;
  $('share-x').href=`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(address)}`;
}
async function shareResult() {
  if(!lastResult) return;
  const rank=tierFor(lastResult.score)[0];
  const text=`リズピタでリズム感診断！ 🥁\n${lastResult.bpm}BPMで ${lastResult.score}/100点！\n称号：${rank}\n#リズピタ #リズム感診断`;
  const url=location.origin+location.pathname;
  if(navigator.share) {
    try {await navigator.share({title:'リズピタ｜リズム感診断',text,url});return;} catch(error) {if(error.name==='AbortError') return;}
  }
  try {await navigator.clipboard.writeText(`${text}\n${url}`);$('share-button').textContent='コピーしました ✓';setTimeout(()=>$('share-button').textContent='結果をシェア ↗',2000);}
  catch { $('share-button').textContent='Xに投稿ボタンをご利用ください'; }
}
function renderHistory() {
  const history=readHistory();
  const container=$('history-list');container.replaceChildren();
  if(!history.length) {const p=document.createElement('p');p.className='history-empty';p.textContent='最初の診断結果がここに表示されます。';container.appendChild(p);return;}
  const bests={}; for(const item of history) bests[item.bpm]=Math.max(bests[item.bpm]??-1,item.score);
  for(const item of history.slice(0,6)) {
    const row=document.createElement('div');row.className='history-row';
    const info=document.createElement('span');info.className='history-tempo';info.textContent=`${item.bpm} BPM`;
    const detail=document.createElement('span');detail.className='history-date';detail.textContent=humanDate(item.time);
    const score=document.createElement('strong');score.textContent=`${item.score} 点`;
    const left=document.createElement('div');left.className='history-meta';left.append(info,detail);
    if(bests[item.bpm]===item.score) {const trophy=document.createElement('span');trophy.className='history-best';trophy.textContent='BEST';left.append(trophy);}
    row.append(left,score);container.appendChild(row);
  }
}
startButton.addEventListener('click',startGame);
resetButton.addEventListener('click',resetInterface);
$('retry-button').addEventListener('click',()=>{
  resetInterface();document.querySelector('.game-card').scrollIntoView({behavior:'smooth',block:'center'});
});
$('share-button').addEventListener('click',shareResult);
clearProgress();
renderHistory();
