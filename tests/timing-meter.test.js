import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateMeterReading,calculateAverageMeterReading} from '../src/timing-meter.js';

test('center gives exactly 0ms',()=>{
  const x=calculateMeterReading(0,110);
  assert.equal(x.position,50);
  assert.equal(x.status,'perfect');
  assert.equal(x.text,'ぴったり 0 ms');
});
test('early tap points left and says how many ms',()=>{
  const x=calculateMeterReading(-42,110);
  assert.ok(x.position<50);
  assert.equal(x.status,'early');
  assert.equal(x.text,'早い 42 ms');
});
test('late tap points right and says how many ms',()=>{
  const x=calculateMeterReading(76.9,80);
  assert.ok(x.position>50);
  assert.equal(x.status,'late');
  assert.equal(x.text,'遅い 77 ms');
});
test('near-zero tap highlights success',()=>{
  assert.equal(calculateMeterReading(8,140).status,'perfect');
});
test('out-of-window marker clamps but retains true offset',()=>{
  const x=calculateMeterReading(650,140,{miss:true});
  assert.equal(x.position,96);
  assert.equal(x.status,'miss');
  assert.equal(x.text,'判定範囲外：遅い 650 ms');
});
test('duplicate tap visibly distinguished',()=>{
  const x=calculateMeterReading(-20,110,{duplicate:true});
  assert.equal(x.status,'miss');
  assert.equal(x.text,'連続タップ：早い 20 ms');
});
test('invalid values do not produce NaN or misleading numbers',()=>{
  const x=calculateMeterReading(NaN,110);
  assert.equal(x.status,'invalid');
  assert.equal(x.position,50);
});
test('scale automatically responds to tempo',()=>{
  assert.ok(calculateMeterReading(0,80).maxMs>calculateMeterReading(0,140).maxMs);
});

test('signed average points to early side and reports absolute mean separately',()=>{
  const x=calculateAverageMeterReading(-42,65,110);
  assert.ok(x.position<50);
  assert.equal(x.status,'early');
  assert.equal(x.text,'平均 42 ms 早め');
  assert.equal(x.note,'平均ズレの大きさ（絶対値）：65 ms');
});
test('signed average points to late side and uses current tempo range',()=>{
  const x=calculateAverageMeterReading(31.4,55,140);
  assert.ok(x.position>50);
  assert.equal(x.status,'late');
  assert.equal(x.text,'平均 31 ms 遅め');
  assert.ok(x.maxMs<230);
});
test('opposite-direction errors can cancel without hiding absolute mean',()=>{
  const x=calculateAverageMeterReading(0,95,110);
  assert.equal(x.position,50);
  assert.equal(x.text,'平均の方向差：ほぼ 0 ms');
  assert.equal(x.note,'平均ズレの大きさ（絶対値）：95 ms');
});
test('missing taps do not produce a misleading average',()=>{
  const x=calculateAverageMeterReading(null,null,80);
  assert.equal(x.status,'invalid');
  assert.equal(x.text,'有効なタップがありません');
  assert.equal(x.position,50);
});
test('large signed averages clamp marker position but preserve real value',()=>{
  const x=calculateAverageMeterReading(-480,480,140);
  assert.equal(x.position,4);
  assert.equal(x.text,'平均 480 ms 早め');
});
