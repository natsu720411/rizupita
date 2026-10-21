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
export function createInstantMeter(id){
  const root=document.getElementById(id);
  if(!root)return {reset(){},update(){}};
  const reading=root.querySelector('[data-meter-reading]');
  const needle=root.querySelector('[data-meter-needle]');
  const minus=root.querySelector('[data-meter-minus]');
  const plus=root.querySelector('[data-meter-plus]');
  const states=['has-reading','is-perfect','is-early','is-late','is-miss'];
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
      const meter=calculateMeterReading(errorMs,bpm,opts);
      root.classList.remove(...states);
      root.classList.add('has-reading','is-'+meter.status);
      needle.style.left=meter.position+'%';
      reading.textContent=meter.text;
      minus.textContent='−'+Math.round(meter.maxMs)+' ms';
      plus.textContent='＋'+Math.round(meter.maxMs)+' ms';
    }
  };
}
