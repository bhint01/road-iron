import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../admin.html',import.meta.url),'utf8');
const start=html.indexOf('let sellerModerationLoadVersion=');
const source=html.slice(start,html.indexOf('async function loadTrafficStats()',start));
class Node {
 constructor(fragment=false){this.fragment=fragment;this.children=[];this.style={};this.textContent='';}
 append(...nodes){for(const node of nodes)this.children.push(...(node.fragment?node.children:[node]));}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
}
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
const tick=()=>new Promise(r=>setImmediate(r));
const container=new Node(), photos=[], requests=[];
let currentTitle='One listing',fail=false;
const sb={from(table){const response=table==='marketplace_sellers'?{data:[{user_id:'seller',display_name:'Seller',status:'approved'}]}:{data:[{id:'one',seller_id:'seller',title:currentTitle,status:'pending',price:100}]};return {
 select(){return this;},order(){requests.push(table);return Promise.resolve(fail?{error:{message:'Load failed'}}:response);},
 eq(){const pending=deferred();photos.push(pending);return pending.promise;}
 };},storage:{from(){return {createSignedUrl:async()=>({data:{signedUrl:'https://example.com/photo.jpg'}})};}}};
const context=vm.createContext({sb,$:()=>container,document:{createElement:()=>new Node(),createDocumentFragment:()=>new Node(true)},alert(){},confirm(){return false;}});
vm.runInContext(source,context);
// Three auth-triggered loads start before any result completes.
const loads=[context.loadSellerModeration(),context.loadSellerModeration(),context.loadSellerModeration()];
await tick();assert.equal(photos.length,1);photos[0].resolve({data:[{storage_path:'photo'}]});await Promise.all(loads);
const cards=()=>container.children.filter(n=>n.className==='item');
assert.equal(cards().filter(n=>n.children[0]?.textContent==='One listing').length,1);
assert.ok(container.children.some(n=>n.textContent.startsWith('1 pending • 1 total')));
// An older request already waiting for photos must not overwrite a newer load.
const older=context.loadSellerModeration();await tick();currentTitle='Latest listing';const newer=context.loadSellerModeration();await tick();
photos[2].resolve({data:[]});await newer;photos[1].resolve({data:[]});await older;
assert.equal(cards().filter(n=>n.children[0]?.textContent==='Latest listing').length,1);
assert.equal(cards().filter(n=>n.children[0]?.textContent==='One listing').length,0);
fail=true;await context.loadSellerModeration();assert.equal(container.textContent,'Load failed');
fail=false;const retry=context.loadSellerModeration();await tick();photos[3].resolve({data:[]});await retry;
assert.equal(cards().filter(n=>n.children[0]?.textContent==='Latest listing').length,1);
console.log('PASS: overlapping admin loads render one listing, stale photo loads cannot overwrite newer results, errors allow retry');
