import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('Search-friendly title leads with rhythm test intent',()=>{
  assert.match(html,/<title>リズム感テスト無料｜16回タップで診断・採点【リズピタ】<\/title>/);
  assert.equal((html.match(/<title>/g)||[]).length,1);
  assert.match(html,/<meta name="description" content="[^"]*リズム感テスト[^"]*リズム感診断[^"]*無料[^"]*"/);
});

test('Top page promotes the instant test and keeps daily challenge discoverable',()=>{
  assert.match(html,/<h1 id="hero-title">リズム感テスト、/);
  assert.match(html,/<div class="hero-actions"><a class="button button-primary" href="#diagnosis">無料でリズム感テスト/);
  assert.match(html,/<div class="hero-daily-promote">/);
  assert.match(html,/<a class="text-link" href="#daily">今日のチャレンジに挑戦/);
  assert.match(html,/id="daily-start"/);
});

test('Search Console ownership, indexability and existing game hooks stay intact',()=>{
  assert.equal((html.match(/google-site-verification/g)||[]).length,1);
  assert.match(html,/content="5lrTdgmZovs92wbZGUXMa6rQ02s4ApIzkjpsH_7bHRQ"/);
  assert.match(html,/rel="canonical" href="https:\/\/rizupita.vercel.app\/"/);
  assert.match(html,/name="robots" content="index,follow/);
  for(const id of ['diagnosis','start-button','daily','modes','result-card','timing-chart']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(html,/src="\/src\/main.js"/);
});
