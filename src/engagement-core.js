// Pure, testable analysis and progression utilities. No external storage or network.
export function localDayKey(date=new Date()){
  if(!(date instanceof Date)||!Number.isFinite(date.getTime()))throw RangeError('Invalid date');
  const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
  return y+'-'+m+'-'+d;
}
export function dailyChallenge(day){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw RangeError('Invalid date key');
  // Stable across browsers for a given local calendar date.
  const n=day.replaceAll('-','').split('').reduce((sum,x,i)=>(sum*31+Number(x)+i)>>>0,0);
  const bpm=[80,110,140][n%3],target=[62,67,72][n%3];
  return {day,bpm,target};
}
export function dayDistance(previous,current){
  const toUTC=key=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(key))return NaN;
    const [y,m,d]=key.split('-').map(Number);
    const utc=Date.UTC(y,m-1,d);
    const date=new Date(utc);
    return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?utc:NaN;
  };
  const a=toUTC(previous),b=toUTC(current);
  return Number.isFinite(a)&&Number.isFinite(b)?Math.round((b-a)/86400000):NaN;
}
export function analyzeTiming(errors){
  const values=Array.isArray(errors)?errors:[];
  const valid=values.filter(Number.isFinite);
  if(!valid.length)return {title:'記録がありません',tips:'音を聴いてタップし、まずは最初の記録を作ってみよう。',first:null,last:null,misses:values.length};
  const mid=Math.floor(values.length/2);
  const means=arr=>{const selected=arr.filter(Number.isFinite);return selected.length?selected.reduce((sum,x)=>sum+Math.abs(x),0)/selected.length:null;};
  const first=means(values.slice(0,mid)),last=means(values.slice(mid));
  const early=valid.filter(x=>x< -35).length,late=valid.filter(x=>x>35).length;
  const misses=values.length-valid.length;
  let title,tips;
  if(misses>=4){title='まずは拍を逃さない練習';tips='ゆったり80 BPMで、各クリックの直後ではなく鳴った瞬間を意識しよう。';}
  else if(first!==null&&last!==null&&last-first>25){title='後半でズレが広がる傾向';tips='後半でタイミングが乱れやすいようです。身体の力を抜いて、クリック間隔を一定に保ってみよう。';}
  else if(early>late+1){title='少し早押し気味';tips='クリック音を先回りしがち。拍を最後まで聴いてからタイミングを合わせてみよう。';}
  else if(late>early+1){title='少し遅押し気味';tips='タップが音より遅くなりがち。端末の音声遅延も影響するため、同じ環境で比較しよう。';}
  else{title='テンポのバランスは良好';tips='早押しと遅押しの偏りが小さめ。次は別のBPMや裏拍にも挑戦してみよう。';}
  return {title,tips,first,last,misses,early,late};
}
export function levelInfo(xp){
  const safe=Number.isFinite(xp)?Math.max(0,Math.floor(xp)):0;
  const level=Math.floor(safe/250)+1;
  const titles=['はじめてのリズム','リズムチャレンジャー','ビートキャッチャー','グルーヴプレイヤー','リズムマスター'];
  return {level,title:titles[Math.min(titles.length-1,Math.floor((level-1)/2))],progress:safe%250,needed:250,xp:safe};
}
export function experienceFor(score,mode='diagnosis'){
  const clean=Number.isFinite(score)?Math.max(0,Math.min(100,score)):0;
  return (mode==='practice'?12:20)+Math.round(clean/5);
}
export function growthSeries(history,bpm,metric='score',limit=12){
  const records=(Array.isArray(history)?history:[]).filter(x=>x&&x.bpm===bpm&&Number.isFinite(x.time));
  const key=metric==='error'?'meanAbs':'score';
  return records.filter(x=>Number.isFinite(x[key])&&x[key]>=0)
    .sort((a,b)=>a.time-b.time)
    .slice(-limit)
    .map(x=>({time:x.time,value:Math.round(x[key]*10)/10}));
}
export function applyDailyCompletion(progress,day,score,target){
  const previous={...progress};
  if(!Number.isFinite(score)||score<target)return {...previous,dailyLastAttempt:day,dailyBest:previous.dailyLastAttempt===day?Math.max(previous.dailyBest||0,score||0):score||0,earned:false};
  const completed=Array.isArray(previous.dailyDays)?previous.dailyDays.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)):[];
  const fresh=!completed.includes(day);
  if(fresh)completed.push(day);
  const all=[...new Set(completed)].sort().slice(-90);
  let streak=0;
  for(let i=all.length-1;i>=0;i--){
    if(streak===0){streak=1;continue;}
    if(dayDistance(all[i],all[i+1])===1)streak++;
    else break;
  }
  return {...previous,dailyDays:all,streak,dailyLastAttempt:day,dailyBest:previous.dailyLastAttempt===day?Math.max(previous.dailyBest||0,score):score,earned:fresh};
}
