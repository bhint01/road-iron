import {db} from './supabase-client.js';
import {LIVE_API_ORIGIN} from './live-config.js';
import {describeOutcome} from './auction-status.js';
const status=document.querySelector('#status'),holder=document.querySelector('#activity'),notice=document.querySelector('#payment-notice');
const money=n=>(Number(n)/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n};
// Archived pre-launch test fixtures. Keep bid/payment evidence intact; hide only these IDs from customer activity.
const archivedTestAuctionIds=new Set([
  "1289c774-42bb-4049-b78f-5e708ec1214e",
  "152d5c9e-a372-40ae-bed5-ad27e5e13fab",
  "028c3b18-30bc-4fe3-a2ec-a356e88263fe",
  "941553ea-63e2-4faf-88f9-ba45ee4a7ba2",
  "4c103afe-fb0e-48c8-85e7-f4f493ac6c2d",
  "93111de7-bce6-4a28-8e79-5876945d6091",
  "9c7d3c5b-b20e-4819-8de0-c3c2f85f20ff",
  "cdc21133-85a2-4e3a-b4a2-18f63655d2fa",
  "fc49b6bd-7d4e-4c28-886e-1f1e3032dd35",
  "7be66397-f19f-41b4-8524-9673e5601e53"
]);
let generation=0;
async function load(){const current=++generation;holder.replaceChildren();status.textContent='Loading your auctions…';
 try{
  const {data:{session}}=await db.auth.getSession();if(!session){status.textContent='Sign in to see your bids and results.';return;}
  const [activity,health]=await Promise.all([db.rpc('my_auction_activity'),fetch(LIVE_API_ORIGIN+'/health').then(r=>r.ok?r.json():null).catch(()=>null)]);
  if(activity.error)throw activity.error;if(current!==generation)return;
  const enabled=health?.checkoutEnabled===true;
  if(notice)notice.textContent=enabled?'Eligible auction winners can review delivery, sales tax and the total before paying.':'Auction payment collection is not open yet.';
  const call=async(path,auctionId)=>{const r=await fetch(LIVE_API_ORIGIN+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({auctionId}),credentials:'omit'});return r.ok?r.json():null};
  const rows=await Promise.all((activity.data||[]).filter(a=>!archivedTestAuctionIds.has(a.auction_id)).map(async a=>{
   // A live offer must have been reviewed before bidding. Sandbox payment history never creates a live balance.
   const options=enabled&&a.is_winner&&a.outcome==='winner_selected'?await call('/options',a.auction_id):null;
   const payment=options?await call('/status',a.auction_id):null;return {a,options,payment};
  }));if(current!==generation)return;
  for(const {a,options,payment} of rows){const card=document.createElement('article');card.append(el('h2',a.title));
   card.append(el('p',a.is_winner?'You have the winning bid.':describeOutcome(a)));
   if(a.my_bid_cents!==null)card.append(el('p','Your highest bid: '+money(a.my_bid_cents)));
   if(payment?.paid){card.append(el('p','Payment confirmed: '+money(payment.totalCents)));if(payment.refundedCents)card.append(el('p','Refunded: '+money(payment.refundedCents)));}
   else if(options){const link=el('a','Review delivery and total');link.href='pay-live.html?auction='+encodeURIComponent(a.auction_id);card.append(link);}
   else if(a.is_winner)card.append(el('p','No live payment is currently due through this page.'));
   holder.append(card);
  }status.textContent=rows.length?rows.length+' auction(s) in your activity.':'You have not created an auction or placed a bid yet.';
 }catch{if(current===generation)status.textContent='Your activity is temporarily unavailable. Please refresh.';}
}
document.querySelector('#refresh').addEventListener('click',load);db.auth.onAuthStateChange(()=>{generation++;holder.replaceChildren();setTimeout(load,0)});setInterval(()=>{if(!document.hidden)load()},15000);load();
