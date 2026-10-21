import {scoringWindowSeconds} from './rhythm-core.js';

/**
 * One tap -> a visual position and signed millisecond reading.
 * Audio/input hardware delays cannot be eliminated by this display.
 */
export function calculateMeterReading(errorMs,bpm,{miss=false,duplicate=false}={}){
  if(!Number.isFinite(errorMs)||!Number.isFinite(bpm)||bpm<=0)return {
    position:50, status:'invalid', text:'測定できませんでした', maxMs:230
  };
  const maxMs=scoringWindowSeconds(60/bpm)*1000;
  const position=50+Math.max(-1,Math.min(1,errorMs/maxMs))*46;
  const abs=Math.round(Math.abs(errorMs));
  const direction=errorMs < -0.5 ? '早い' : errorMs > 0.5 ? '遅い' : 'ぴったり';
  const status=miss||duplicate?'miss':abs<=35?'perfect':direction==='早い'?'early':direction==='遅い'?'late':'perfect';
  const label=direction+' '+abs+' ms';
  const prefix=duplicate?'連続タップ：':miss?'判定範囲外：':'';
  return {position,status,text:prefix+label,maxMs};
}
/**
 * A signed average shows directional bias; absolute average describes typical error.
 * Showing both avoids calling a cancelled-out positive/negative average 'perfect'.
 */
export function calculateAverageMeterReading(meanSigned,meanAbs,bpm){
  if(!Number.isFinite(bpm)||bpm<=0)return {
    position:50,status:'invalid',text:'測定できませんでした',
    note:'平均的なズレを計算できませんでした。',maxMs:230
  };
  const maxMs=scoringWindowSeconds(60/bpm)*1000;
  if(!Number.isFinite(meanSigned)||!Number.isFinite(meanAbs))return {
    position:50,status:'invalid',text:'有効なタップがありません',
    note:'平均的なズレを計算できませんでした。',maxMs
  };
  const position=50+Math.max(-1,Math.min(1,meanSigned/maxMs))*46;
  const signed=Math.round(Math.abs(meanSigned));
  const absolute=Math.round(meanAbs);
  const almostZero=signed===0;
  const status=almostZero?'perfect':meanSigned<0?'early':'late';
  const text=almostZero?'平均の方向差：ほぼ 0 ms':
    '平均 '+signed+' ms '+(meanSigned<0?'早め':'遅め');
  const note='平均ズレの大きさ（絶対値）：'+absolute+' ms';
  return {position,status,text,note,maxMs};
}

export function createInstantMeter(id){
  const root=document.getElementById(id);
  if(!root)return {reset(){},update(){}};
  const reading=root.querySelector('[data-meter-reading]');
  const needle=root.querySelector('[data-meter-needle]');
  const minus=root.querySelector('[data-meter-minus]');
  const plus=root.querySelector('[data-meter-plus]');
  const states=['has-reading','is-perfect','is-early','is-late','is-miss'];
  function applyReading(view){
    root.classList.remove(...states);
    root.classList.add('has-reading','is-'+view.status);
    needle.style.left=view.position+'%';
    reading.textContent=view.text;
    minus.textContent='−'+Math.round(view.maxMs)+' ms';
    plus.textContent='＋'+Math.round(view.maxMs)+' ms';
  }
  return {
    reset(bpm=110){
      const valid=Number.isFinite(bpm)&&bpm>0?bpm:110;
      const limit=Math.round(scoringWindowSeconds(60/valid)*1000);
      root.classList.remove(...states);
      needle.style.left='50%';
      reading.textContent='タップするとズレがわかる';
      minus.textContent='−'+limit+' ms';
      plus.textContent='＋'+limit+' ms';
    },
    update(errorMs,bpm,opts={}){
      applyReading(calculateMeterReading(errorMs,bpm,opts));
    },
    showAverage(meanSigned,meanAbs,bpm){
      const view=calculateAverageMeterReading(meanSigned,meanAbs,bpm);
      applyReading(view);
      return view;
    }
  };
}
