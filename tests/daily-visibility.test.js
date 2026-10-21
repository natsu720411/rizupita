import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/extras.css',import.meta.url),'utf8');
test('Daily challenge card is present exactly once',()=>{
 assert.equal((html.match(/id="daily"/g)||[]).length,1);
 assert.match(html,/id="daily-start"/);
 assert.match(html,/id="daily-description"/);
});
test('Daily challenge precedes other games on the homepage',()=>{
 assert.ok(html.indexOf('id="daily"')<html.indexOf('class="new-games-shortcut'));
});
test('Hero and visible header link to daily challenge',()=>{
 assert.match(html,/class="hero-daily-promote"/);
 assert.match(html,/class="nav-cta" href="#daily"/);
 assert.match(html,/class="hero-actions">\s*<a[^>]+href="#daily"/);
});
test('Daily call to action remains usable without relying on a menu on mobile',()=>{
 assert.match(html,/<button[^>]+id="daily-start"[^>]+>/);
 assert.match(css,/#daily\{scroll-margin-top/);
});
