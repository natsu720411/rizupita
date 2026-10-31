import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/extras.css',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const extras=readFileSync(new URL('../src/extras.js',import.meta.url),'utf8');
const engagement=readFileSync(new URL('../src/engagement.js',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));

test('First time guide contains all 3 instructions and close button',()=>{
 assert.match(html,/id="welcome-steps"/);
 assert.match(html,/id="welcome-done"/);
 for(const word of ['音量を確認','4拍を聴く','16拍をタップ'])assert.ok(html.includes(word));
});
test('BPM can be set for diagnosis and extra games, without changing fixed daily challenge',()=>{
 for(const id of ['custom-bpm','custom-bpm-apply','mode-custom-bpm','mode-custom-apply'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(main.includes('validBpm(x.bpm)'));
 assert.ok(extras.includes('setModeTempo('));
 assert.ok(html.includes('id="daily-start"'));
});
test('Result recommendation and optional calibration controls exist',()=>{
 for(const id of ['recommend-start','recommend-title','calibration-apply','calibration-hint'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(main,/recommendTraining\(result\)/);
 assert.match(main,/calibrationHint\(result/);
 assert.match(extras,/rizupita:recommend-mode/);
});
test('Past records can be compared and badge state is derived from completed plays',()=>{
 assert.ok(html.includes('id="history-detail"'));
 assert.ok(html.includes('id="achievement-grid"'));
 assert.match(main,/compareAttempts\(entry,records\)/);
 assert.match(engagement,/earnedBadges\(history\(\),profile\)/);
});
test('Mobile play-only layout is optional and never removes stop/retry controls',()=>{
 assert.match(css,/body\[data-play-focus="diagnosis"\]/);
 assert.match(css,/body\[data-play-focus="mode"\]/);
 assert.ok((html.match(/class="focus-exit"/g)||[]).length===2);
 assert.ok(html.includes('id="reset-button"')&&html.includes('id="mode-stop"'));
});
test('Home screen installation has a manifest, shortcuts and browser fallback',()=>{
 assert.match(html,/id="install-button"/);
 assert.match(html,/src="\/src\/upgrade.js"/);
 assert.equal(manifest.display,'standalone');
 assert.equal(manifest.id,'/');
 assert.ok(manifest.icons.length>=1);
 assert.ok(manifest.shortcuts.length>=3);
});
