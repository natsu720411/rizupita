import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestBeatIndex,scoreBeats,scoringWindowSeconds,rankResults} from '../src/rhythm-core.js';

test('window is under half a beat',()=>{for(const bpm of [80,110,140]) assert.ok(scoringWindowSeconds(60/bpm)<30/bpm);});
test('perfect taps',()=>{for(const bpm of [80,110,140]) assert.equal(scoreBeats(Array(16).fill(0),bpm).score,100);});
test('half missing taps',()=>{assert.equal(scoreBeats([0,0,null,null],110).score,50);});
test('all missing taps',()=>{const x=scoreBeats([null,null],110);assert.equal(x.score,0);assert.equal(x.meanAbs,null);});
test('extra taps penalty',()=>{assert.equal(scoreBeats(Array(16).fill(0),110,3).score,94);});
test('extra taps cannot drop below zero',()=>{assert.equal(scoreBeats([null,null],110,999).score,0);});
test('symmetric offsets',()=>{const x=scoreBeats([-50,50],110);assert.equal(x.meanAbs,50);assert.equal(x.meanSigned,0);});
test('beats at boundaries',()=>{const i=60/140;assert.equal(nearestBeatIndex(20,20,i,16),0);assert.equal(nearestBeatIndex(20+16*i,20,i,16),-1);});
test('outside window',()=>{assert.equal(nearestBeatIndex(2+.245,2,60/110,16),-1);});
test('ranking is tempo-specific',()=>{const h=[{bpm:110,score:90,meanAbs:30},{bpm:110,score:95,meanAbs:45},{bpm:80,score:100},{bpm:110,score:95,meanAbs:20}];assert.equal(rankResults(h,110)[0].meanAbs,20);assert.equal(rankResults(h,80).length,1);});
test('mode score shares same scoring logic',()=>{assert.equal(scoreBeats([0,0,0],140,1,4).score,96);});
