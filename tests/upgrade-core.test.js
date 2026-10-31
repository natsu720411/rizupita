import test from 'node:test';
import assert from 'node:assert/strict';
import {validBpm,compareAttempts,recommendTraining,calibrationHint,earnedBadges} from '../src/upgrade-core.js';

test('BPM accepts only integer tempos from 60 to 180',()=>{assert.equal(validBpm(60),60);assert.equal(validBpm('127'),127);assert.equal(validBpm(180),180);for(const x of [59,181,127.5,'',null,NaN])assert.equal(validBpm(x),null);});
test('Comparison finds the most recent attempt of the same BPM',()=>{
 const item={time:500,bpm:127,score:90,meanAbs:35};
 const old={time:100,bpm:127,score:50,meanAbs:75};
 const near={time:400,bpm:127,score:75,meanAbs:50};
 const result=compareAttempts(item,[old,{time:300,bpm:110,score:99},near]);
 assert.equal(result.previous,near);assert.equal(result.scoreDelta,15);assert.equal(result.errorDelta,-15);
});
test('Comparison gracefully handles first custom tempo',()=>{assert.equal(compareAttempts({time:15,bpm:173,score:88},[]).previous,null);});
test('Recommendation sends missed taps to practice',()=>{assert.equal(recommendTraining({hits:7,meanAbs:150,bpm:120}).mode,'practice');});
test('Recommendation spots late-session drift',()=>{assert.equal(recommendTraining({hits:16,meanAbs:70,bpm:110,errors:[0,0,0,0,0,0,0,0,90,90,90,90,90,90,90,90]}).mode,'silence');});
test('Recommendation offers advanced practice for stable taps',()=>{assert.equal(recommendTraining({hits:16,meanAbs:12,bpm:120,errors:Array(16).fill(10)}).mode,'offbeat');});
test('Calibration hint is optional, rounded and clamped',()=>{
 assert.deepEqual(calibrationHint({hits:16,meanSigned:50,meanAbs:60},0).value,50);
 assert.equal(calibrationHint({hits:5,meanSigned:50,meanAbs:60},0).enabled,false);
 assert.equal(calibrationHint({hits:16,meanSigned:120,meanAbs:120},150).enabled,false);
});
test('Earned badges derive from genuine history and persisted progress',()=>{
 const data=[{score:100,hits:16},...Array.from({length:9},()=>({score:75,hits:16}))];
 const result=earnedBadges(data,{dailyDays:['2026-10-20'],streak:3,modeCounts:{practice:1,offbeat:1,memory:1}});
 for(const x of ['first','ten','high','perfect','daily','streak','modes'])assert.equal(result[x],true);
 assert.equal(result.allrounder,false);
});
