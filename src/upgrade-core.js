/** Pure helpers for the enhanced UX; no DOM or network dependencies. */
export const MIN_BPM=60,MAX_BPM=180;
export function validBpm(value){
  const number=Number(value);
  return Number.isInteger(number)&&number>=MIN_BPM&&number<=MAX_BPM?number:null;
}
export function compareAttempts(item,history){
  if(!item||!Number.isFinite(item.time)||validBpm(item.bpm)===null)return null;
  const earlier=(Array.isArray(history)?history:[])
    .filter(x=>x&&x!==item&&validBpm(x.bpm)===item.bpm&&Number.isFinite(x.time)&&x.time<item.time&&Number.isFinite(x.score))
    .sort((a,b)=>b.time-a.time)[0]||null;
  if(!earlier)return {previous:null,scoreDelta:null,errorDelta:null};
  return {previous:earlier,scoreDelta:Number.isFinite(item.score)?item.score-earlier.score:null,
    errorDelta:Number.isFinite(item.meanAbs)&&Number.isFinite(earlier.meanAbs)?Math.round(item.meanAbs-earlier.meanAbs):null};
}
export function recommendTraining(result){
  const misses=16-(Number.isFinite(result?.hits)?result.hits:0);
  const values=Array.isArray(result?.errors)?result.errors:[];
  const meanAbs=Number.isFinite(result?.meanAbs)?result.meanAbs:Infinity;
  if(misses>=4||meanAbs>100)return {mode:'practice',label:'メトロノーム練習',reason:'まずはゆっくりしたテンポでタップの安定感を身につけよう。',bpm:80};
  const half=Math.floor(values.length/2);
  const absMean=v=>{const data=v.filter(Number.isFinite);return data.length?data.reduce((sum,n)=>sum+Math.abs(n),0)/data.length:null;};
  const first=absMean(values.slice(0,half)),last=absMean(values.slice(half));
  if(first!==null&&last!==null&&last-first>25)return {mode:'silence',label:'無音テンポキープ',reason:'後半のズレが増えています。音が消えてもテンポを保つ練習がおすすめ。',bpm:validBpm(result?.bpm)||110};
  if(meanAbs>55||Math.abs(result?.meanSigned||0)>50)return {mode:'practice',label:'メトロノーム練習',reason:'早押し・遅押しを意識して同じ拍を繰り返そう。',bpm:validBpm(result?.bpm)||110};
  return {mode:'offbeat',label:'裏拍チャレンジ',reason:'基本の拍は安定しています。次は音と音の真ん中を狙ってみよう。',bpm:validBpm(result?.bpm)||110};
}
export function calibrationHint(result,current){
  const currentValue=Number(current);
  const adjustment=Number.isFinite(currentValue)?Math.max(-150,Math.min(150,Math.round(currentValue/10)*10)):0;
  if(!Number.isFinite(result?.meanSigned)||!Number.isFinite(result?.meanAbs)||result?.hits<8)
    return {enabled:false,value:adjustment,message:'有効なタップが8回以上ある診断結果で、補正の目安を確認できます。'};
  const bias=result.meanSigned;
  if(Math.abs(bias)<15)return {enabled:false,value:adjustment,message:'早め・遅めの平均的な偏りは小さめです。まずは同じ設定で比較してみよう。'};
  const next=Math.max(-150,Math.min(150,Math.round((adjustment+bias)/10)*10));
  if(next===adjustment)return {enabled:false,value:adjustment,message:'これ以上の補正は範囲外です。音声出力方法や端末設定を確認してみてください。'};
  return {enabled:true,value:next,message:'現在 '+(adjustment>=0?'+':'')+adjustment+' ms → 補正目安 '+(next>=0?'+':'')+next+' ms。端末遅延と反応時間は区別できないため、設定後に再診断して比較してください。'};
}
export const badgeSpecs=[
  {id:'first',emoji:'🌱',label:'はじめの一歩',hint:'初めて診断を完了'},
  {id:'ten',emoji:'🎧',label:'リズム練習家',hint:'診断10回達成'},
  {id:'high',emoji:'🌟',label:'90点の壁',hint:'診断90点以上を達成'},
  {id:'perfect',emoji:'🏆',label:'パーフェクト',hint:'診断100点を達成'},
  {id:'daily',emoji:'☀',label:'デイリーデビュー',hint:'日替わりチャレンジを初達成'},
  {id:'streak',emoji:'🔥',label:'3日連続',hint:'日替わりを3日連続達成'},
  {id:'modes',emoji:'♫',label:'ゲーム探検家',hint:'追加ゲーム3種類をプレイ'},
  {id:'allrounder',emoji:'🎼',label:'オールラウンダー',hint:'診断を30回達成'}
];
export function earnedBadges(history,progress){
  const data=(Array.isArray(history)?history:[]).filter(r=>r&&Number.isFinite(r.score));
  const days=Array.isArray(progress?.dailyDays)?progress.dailyDays:[];
  const counts=progress?.modeCounts&&typeof progress.modeCounts==='object'?progress.modeCounts:{};
  const used=['practice','offbeat','silence','memory'].filter(x=>Number.isFinite(counts[x])&&counts[x]>0).length;
  const streak=Math.max(Number(progress?.maxStreak)||0,Number(progress?.streak)||0);
  const high=data.some(x=>x.score>=90);
  const perfect=data.some(x=>x.score===100&&x.hits===16);
  return {
    first:data.length>=1,ten:data.length>=10,high,perfect,
    daily:days.length>=1,streak:streak>=3,modes:used>=3,allrounder:data.length>=30
  };
}
