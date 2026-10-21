import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateMeterReading} from '../src/timing-meter.js';

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
