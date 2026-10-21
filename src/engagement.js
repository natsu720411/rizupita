import {
  localDayKey,dailyChallenge,dayDistance,analyzeTiming,levelInfo,experienceFor,
  growthSeries,applyDailyCompletion
} from './engagement-core.js';

const get=id=>document.getElementById(id);
const PROFILE_KEY='rizupita-progression-v1';
const HISTORY_KEY='rizupita-results-v1';
const VOLUME_KEY='rizupita-volume-v1';
const HAPTIC_KEY='rizupita-haptic-v1';
const tempoChoices=[80,110,140];

function safeRead(key){
  try{return localStorage.getItem(key);}catch{return null;}
}
function safeWrite(key,value){
  try{localStorage.setItem(key,value);}catch{}
}
function history(){
  try{
    const data=JSON.parse(safeRead(HISTORY_KEY)||'[]');
    return Array.isArray(data)?data.filter(x=>x&&tempoChoices.includes(x.bpm)&&Number.isFinite(x.time)&&Number.isFinite(x.score)):[];
  }catch{return [];}
}
function loadProfile(){
  try{
    const stored=JSON.parse(safeRead(PROFILE_KEY)||'null');
    if(stored&&Number.isFinite(stored.xp)&&stored.xp>=0)return {
      ...stored,xp:stored.xp,dailyDays:Array.isArray(stored.dailyDays)?stored.dailyDays:[]
    };
  }catch{}
  // Preserve the work from before the progression feature was added.
  return {xp:history().reduce((sum,r)=>sum+experienceFor(r.score),0),dailyDays:[],streak:0,dailyLastAttempt:null,dailyBest:0};
}
let profile=loadProfile();
safeWrite(PROFILE_KEY,JSON.stringify(profile));

const storedVolumeRaw=safeRead(VOLUME_KEY);
let storedVolume=storedVolumeRaw===null?70:Number(storedVolumeRaw);
if(!Number.isFinite(storedVolume)||storedVolume<0||storedVolume>100)storedVolume=70;
let volume=storedVolume/100;
window.rizupitaGetVolume=()=>volume;
const volumeSlider=get('game-volume');
volumeSlider.value=String(storedVolume);
function setVolume(value){
  const n=Number(value);
  const v=Number.isFinite(n)?Math.max(0,Math.min(100,n)):70;
  volume=v/100;
  get('game-volume-text').textContent=v+'%';
  safeWrite(VOLUME_KEY,String(v));
}
volumeSlider.addEventListener('input',event=>setVolume(event.target.value));
setVolume(storedVolume);

const haptic=get('game-haptic');
haptic.checked=safeRead(HAPTIC_KEY)==='true';
haptic.addEventListener('change',()=>{
  safeWrite(HAPTIC_KEY,String(haptic.checked));
});
window.rizupitaTapFeedback=()=>{
  if(haptic.checked&&typeof navigator.vibrate==='function'){
    try{navigator.vibrate(9);}catch{}
  }
};

function sendEvent(name,params={}){
  window.dispatchEvent(new CustomEvent('rizupita:analytics',{detail:{name,params}}));
}
function renderLevel(){
  const details=levelInfo(profile.xp);
  get('level-number').textContent=String(details.level);
  get('level-rank').textContent=details.title;
  get('level-xp').textContent=details.xp.toLocaleString('ja-JP')+' XP';
  get('level-message').textContent='次の称号まで、遊んで経験値をためよう！';
  get('level-bar-fill').style.width=(details.progress/details.needed*100)+'%';
  get('level-progress').setAttribute('aria-valuenow',String(details.progress));
  get('level-to-next').textContent='次のレベルまで '+(details.needed-details.progress)+' XP';
  const today=localDayKey(),days=profile.dailyDays||[];
  const latest=days.slice().sort().at(-1);
  const active=latest&&(dayDistance(latest,today)===0||dayDistance(latest,today)===1);
  get('daily-streak').textContent='日替わり連続達成 '+(active?(profile.streak||0):0)+' 日';
}
function todaySpec(){return dailyChallenge(localDayKey());}
function renderDaily(){
  const spec=todaySpec(),today=spec.day;
  const completed=profile.dailyDays?.includes(today);
  get('daily-date').textContent=today.replaceAll('-','/');
  get('daily-bpm').textContent=spec.bpm+' BPM';
  get('daily-target').textContent='目標 '+spec.target+' 点';
  get('daily-description').textContent='4拍のカウント後に16回タップ。'+spec.bpm+' BPMで'+spec.target+'点以上を目指そう！';
  get('daily-progress').textContent=completed?
    '本日達成！ 自己ベスト '+(profile.dailyLastAttempt===today?profile.dailyBest:'—')+' 点。何度でも挑戦できます。':
    '今日のチャレンジは未達成。達成でボーナスXP！';
  get('daily-start').textContent=completed?'もう一度挑戦する ↗':'今日のチャレンジを始める ↗';
}
get('daily-start').addEventListener('click',()=>{
  const spec=todaySpec();
  sendEvent('daily_challenge_start',{tempo:spec.bpm});
  window.dispatchEvent(new CustomEvent('rizupita:daily-start',{detail:spec}));
  get('diagnosis').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
});

function renderInsight(result){
  const analysis=analyzeTiming(result?.errors);
  get('insight-title').textContent=analysis.title;
  get('insight-message').textContent=analysis.tips;
  get('insight-early').textContent='前半の平均ズレ '+(analysis.first===null?'—':Math.round(analysis.first)+' ms');
  get('insight-late').textContent='後半の平均ズレ '+(analysis.last===null?'—':Math.round(analysis.last)+' ms');
}
let growthBpm=110,growthMetric='score';
const NS='http://www.w3.org/2000/svg';
function svgEl(tag,attrs={},textValue){
  const el=document.createElementNS(NS,tag);
  Object.entries(attrs).forEach(([name,value])=>el.setAttribute(name,String(value)));
  if(textValue!==undefined)el.textContent=String(textValue);
  return el;
}
function drawGrowth(){
  document.querySelectorAll('[data-growth-bpm]').forEach(b=>{
    const chosen=Number(b.dataset.growthBpm)===growthBpm;
    b.classList.toggle('is-active',chosen);b.setAttribute('aria-pressed',String(chosen));
  });
  document.querySelectorAll('[data-growth-metric]').forEach(b=>{
    const chosen=b.dataset.growthMetric===growthMetric;
    b.classList.toggle('is-active',chosen);b.setAttribute('aria-pressed',String(chosen));
  });
  const points=growthSeries(history(),growthBpm,growthMetric,12);
  const container=get('growth-plot');
  container.replaceChildren();
  if(points.length<2){
    const p=document.createElement('p');
    p.textContent='このBPMの'+(growthMetric==='score'?'スコア':'平均ズレ')+'記録を2回以上ためるとグラフを表示できます。';
    container.append(p);
    get('growth-summary').textContent='同じBPMで診断を続けてみましょう。';
    return;
  }
  const svg=svgEl('svg',{viewBox:'0 0 720 245',role:'img',
    'aria-label':growthBpm+'BPMの'+(growthMetric==='score'?'スコア':'平均ズレ')+'の直近'+points.length+'回の推移'});
  const left=55,right=680,top=20,bottom=200;
  const maximum=growthMetric==='score'?100:Math.max(100,Math.ceil(Math.max(...points.map(x=>x.value))/20)*20);
  [0,.25,.5,.75,1].forEach(ratio=>{
    const y=bottom-(bottom-top)*ratio;
    svg.append(svgEl('line',{x1:left,y1:y,x2:right,y2:y,stroke:'#e2def5','stroke-width':1}));
    svg.append(svgEl('text',{x:40,y:y+5,fill:'#7d819a','font-size':13,'text-anchor':'end'},Math.round(maximum*ratio)));
  });
  const coords=points.map((p,i)=>({x:left+i*(right-left)/(points.length-1),y:bottom-p.value/maximum*(bottom-top),value:p.value}));
  svg.append(svgEl('polyline',{points:coords.map(p=>p.x+','+p.y).join(' '),fill:'none',stroke:'#7865e6','stroke-width':4,'stroke-linejoin':'round','stroke-linecap':'round'}));
  coords.forEach((p,i)=>{
    const circle=svgEl('circle',{cx:p.x,cy:p.y,r:5,fill:'#fff',stroke:'#6856db','stroke-width':3});
    circle.append(svgEl('title',{},'第'+(i+1)+'回: '+p.value+(growthMetric==='score'?'点':'ms')));
    svg.append(circle);
  });
  svg.append(svgEl('text',{x:left,y:233,fill:'#777c99','font-size':13},'以前'));
  svg.append(svgEl('text',{x:right,y:233,fill:'#777c99','font-size':13,'text-anchor':'end'},'最近'));
  container.append(svg);
  const first=points[0].value,last=points.at(-1).value,difference=Math.round((last-first)*10)/10;
  if(growthMetric==='score'){
    get('growth-summary').textContent='直近'+points.length+'回：'+first+'点 → '+last+'点（'+(difference>=0?'+':'')+difference+'点）';
  }else{
    get('growth-summary').textContent='直近'+points.length+'回：'+first+' ms → '+last+' ms（'+(difference<=0?'改善傾向':'変化あり')+'）';
  }
}
document.querySelectorAll('[data-growth-bpm]').forEach(button=>button.addEventListener('click',()=>{
  growthBpm=Number(button.dataset.growthBpm);
  drawGrowth();sendEvent('growth_view',{tempo:growthBpm,metric:growthMetric});
}));
document.querySelectorAll('[data-growth-metric]').forEach(button=>button.addEventListener('click',()=>{
  growthMetric=button.dataset.growthMetric;
  drawGrowth();sendEvent('growth_view',{tempo:growthBpm,metric:growthMetric});
}));

function saveProfile(){
  safeWrite(PROFILE_KEY,JSON.stringify(profile));
  renderDaily();renderLevel();
}
window.addEventListener('rizupita:result',event=>{
  const result=event.detail?.result;
  if(!result||!Number.isFinite(result.score))return;
  const previous=levelInfo(profile.xp).level;
  profile.xp+=experienceFor(result.score);
  if(event.detail?.daily?.day){
    const daily=event.detail.daily;
    const next=applyDailyCompletion(profile,daily.day,result.score,daily.target);
    if(next.earned){next.xp+=50;sendEvent('daily_challenge_complete',{tempo:result.bpm,score:result.score});}
    profile=next;
    get('daily-progress').textContent=next.earned?'今日のチャレンジ達成！ ボーナス50 XP！':'挑戦おつかれさま！';
  }
  saveProfile();
  renderInsight(result);
  growthBpm=result.bpm;
  drawGrowth();
  if(levelInfo(profile.xp).level>previous){
    get('level-message').textContent='レベルアップ！ 次の称号にも挑戦しよう。';
    sendEvent('rhythm_level_up',{level:levelInfo(profile.xp).level});
  }
});
window.addEventListener('rizupita:mode-result',event=>{
  const data=event.detail;
  if(!data||!Number.isFinite(data.score))return;
  const previous=levelInfo(profile.xp).level;
  profile.xp+=experienceFor(data.score,data.mode);
  saveProfile();
  if(levelInfo(profile.xp).level>previous)get('level-message').textContent='レベルアップ！ おめでとう！';
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderDaily();});
renderLevel();renderDaily();drawGrowth();
