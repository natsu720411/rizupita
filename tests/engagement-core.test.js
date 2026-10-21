import test from 'node:test';
import assert from 'node:assert/strict';
import {localDayKey,dailyChallenge,dayDistance,analyzeTiming,levelInfo,experienceFor,growthSeries,applyDailyCompletion} from '../src/engagement-core.js';

test('daily challenge is stable for the same date',()=>{assert.deepEqual(dailyChallenge('2026-10-22'),dailyChallenge('2026-10-22'));});
test('daily BPM is supported',()=>{assert.ok([80,110,140].includes(dailyChallenge('2026-10-22').bpm));});
test('date calculations cross months',()=>{assert.equal(dayDistance('2026-10-31','2026-11-01'),1);});
test('date calculations reject invalid dates',()=>{assert.ok(Number.isNaN(dayDistance('2026-02-31','2026-03-01')));});
test('analyze empty performance gracefully',()=>{assert.equal(analyzeTiming([null,null]).first,null);});
test('detect worsening performance in latter half',()=>{assert.ok(analyzeTiming([0,0,0,0,100,100,100,100]).title.includes('後半'));});
test('detect too many missed beats',()=>{assert.ok(analyzeTiming([null,null,null,null,0,0]).title.includes('拍'));});
test('level progress is deterministic',()=>{assert.equal(levelInfo(500).level,3);assert.equal(levelInfo(500).progress,0);});
test('experience uses safe score range',()=>{assert.equal(experienceFor(100),40);assert.equal(experienceFor(-999),20);});
test('history series filters BPM and sorts time',()=>{assert.deepEqual(growthSeries([{bpm:110,time:3,score:80},{bpm:80,time:2,score:99},{bpm:110,time:1,score:30}],110).map(x=>x.value),[30,80]);});
test('daily rewards only once per day',()=>{
  const first=applyDailyCompletion({dailyDays:[]},'2026-10-22',80,65);
  const second=applyDailyCompletion(first,'2026-10-22',90,65);
  assert.equal(first.earned,true);assert.equal(second.earned,false);
  assert.equal(second.dailyBest,90);
});
test('daily streak continues consecutive days',()=>{
  const first=applyDailyCompletion({dailyDays:[]},'2026-10-21',80,65);
  const second=applyDailyCompletion(first,'2026-10-22',85,65);
  assert.equal(second.streak,2);
});
test('failed day does not earn a completion',()=>{
  const next=applyDailyCompletion({dailyDays:[]},'2026-10-22',40,65);
  assert.equal(next.earned,false);assert.equal((next.dailyDays||[]).length,0);
});
