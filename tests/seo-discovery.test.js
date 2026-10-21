import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const home=read('../index.html');
const sitemap=read('../public/sitemap.xml');
const css=read('../src/extras.css');
const pages=[
  {file:'rhythm-training',keyword:'リズム感を鍛える方法'},
  {file:'tap-timing',keyword:'タップが早い・遅い'}
];

test('Useful SEO guide pages are linked, unique and in the sitemap',()=>{
  for(const page of pages){
    const path='/guide/'+page.file+'.html';
    const source=read('../public'+path);
    assert.ok(home.includes('href="'+path+'"'));
    assert.ok(sitemap.includes('https://rizupita.vercel.app'+path));
    assert.ok(source.includes('<title>')&&source.includes(page.keyword));
    assert.ok(source.includes('<meta name="description"'));
    assert.ok(source.includes('rel="canonical" href="https://rizupita.vercel.app'+path+'"'));
    assert.ok(source.includes('application/ld+json'));
    assert.ok(source.length>3500);
    assert.ok(!source.includes('noindex'));
  }
});
test('Social preview uses compatible PNG on both X and Open Graph',()=>{
  assert.ok(home.includes('property="og:image" content="https://rizupita.vercel.app/og.png"'));
  assert.ok(home.includes('name="twitter:image" content="https://rizupita.vercel.app/og.png"'));
  assert.ok(home.includes('property="og:image:width" content="1200"'));
  assert.ok(home.includes('property="og:image:height" content="630"'));
});
test('The Open Graph image is a valid full-size PNG',()=>{
  const bytes=readFileSync(new URL('../public/og.png',import.meta.url));
  assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(bytes.readUInt32BE(16),1200);
  assert.equal(bytes.readUInt32BE(20),630);
  assert.equal(bytes[24],8);
  assert.equal(bytes[25],3);
  let offset=8,data=[];
  while(offset<bytes.length){
    const len=bytes.readUInt32BE(offset),tag=bytes.toString('ascii',offset+4,offset+8);
    const end=offset+12+len;
    assert.ok(len>=0&&end<=bytes.length);
    if(tag==='IDAT')data.push(bytes.subarray(offset+8,offset+8+len));
    offset=end;
    if(tag==='IEND')break;
  }
  const inflated=inflateSync(Buffer.concat(data));
  assert.equal(inflated.length,630*1201);
  assert.equal(inflated[0],0);
  assert.equal(inflated[1201],0);
});
test('Mobile navigation links to existing app sections',()=>{
  for(const anchor of ['diagnosis','daily','modes']){
    assert.ok(home.includes('href="#'+anchor+'"'));
    assert.ok(home.includes('id="'+anchor+'"'));
  }
  assert.ok(home.includes('class="mobile-quick-nav"'));
  assert.ok(css.includes('position:fixed'));
  assert.ok(css.includes('safe-area-inset-bottom'));
});
test('Results have a share prompt and clear participation link',()=>{
  assert.ok(home.includes('result-share-invitation'));
  assert.ok(home.includes('友だちに結果をシェア'));
  const main=read('../src/main.js');
  assert.ok(main.includes('location.pathname+\'#diagnosis\''));
  const extras=read('../src/extras.js');
  assert.ok(extras.includes('あなたは何点？チャレンジしてみて！'));
});
