import {db} from './supabase-client.js';
import {LIVE_API_ORIGIN} from './live-config.js';
import {describeOutcome} from './auction-status.js';
const status=document.querySelector('#status'),holder=document.querySelector('#activity'),notice=document.querySelector('#payment-notice');
const money=n=>(Number(n)/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n};
let generation=0;
async function load(){const current=++generation;holder.replaceChildren();status.textContent='Loading your auctions…';
 try{
  const {data:{session}}=await db.auth.getSession();if(!session){status.textContent='Sign in to see your bids and results.';return;}
  const [activity,health]=await Promise.all([db.rpc('my_auction_activity'),fetch(LIVE_API_ORIGIN+'/health').then(r=>r.ok?r.json():null).catch(()=>null)]);
  if(activity.error)throw activity.error;if(current!==generation)return;
  const enabled=health?.checkoutEnabled===true;
  if(notice)notice.textContent=enabled?'Eligible auction winners can review delivery, sales tax and the total before paying.':'Auction payment collection is not open yet.';
  const call=async(path,auctionId)=>{const r=await fetch(LIVE_API_ORIGIN+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({auctionId}),credentials:'omit'});return r.ok?r.json():null};
  const rows=await Promise.all((activity.data||[]).map(async a=>{
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
