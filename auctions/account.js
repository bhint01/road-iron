import { db } from './supabase-client.js';
import { describeOutcome } from './auction-status.js';

const status=document.querySelector('#status');
if(document.querySelector('#payment-notice'))document.querySelector('#payment-notice').textContent='Stripe sandbox checkout test only. No real payments or seller payouts are enabled.';
const holder=document.querySelector('#activity');
const money=cents=>(Number(cents)/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
const element=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
let generation=0;
function clear(){generation++;holder.replaceChildren();}
async function load(){
  clear();const current=generation;
  status.textContent='Loading your auctions…';
  try{
    const {data:{user},error:authError}=await db.auth.getUser();
    if(current!==generation)return;
    if(authError||!user){status.textContent='Sign in on the auction homepage to see your bids and results.';return;}
    const [{data,error},{data:payments,error:paymentError}]=await Promise.all([db.rpc('my_auction_activity'),db.rpc('my_auction_payments')]);
    if(current!==generation)return;
    if(error)throw error;
    if(paymentError)throw paymentError;
    const paymentByAuction=new Map((payments||[]).map(payment=>[payment.auction_id,payment]));
    for(const auction of data||[]){
      const payment=paymentByAuction.get(auction.auction_id);
      const paid=payment?.paid===true;
      const refunded=Number(payment?.refunded_cents||0);
      const pending=Number(payment?.refund_pending_cents||0);
      const paymentLabel=paid?(refunded>=Number(payment.total_cents)?'Sandbox payment fully refunded.':'Sandbox payment confirmed.'):'You have the winning bid. Sandbox payment testing is available.';
      const card=document.createElement('article');
      card.append(element('h2',auction.title),element('p',auction.is_winner?paymentLabel:describeOutcome(auction)));
      card.append(element('p',auction.participation==='seller'?'You are the seller':'You participated as a bidder'));
      if(auction.my_bid_cents!==null)card.append(element('p','Your highest bid: '+money(auction.my_bid_cents)));
      if(auction.highest_bid_cents!==null)card.append(element('p','Highest bid: '+money(auction.highest_bid_cents)));
      card.append(element('p','Closes: '+new Date(auction.ends_at).toLocaleString()));
      if(paid){
        card.append(element('p','Sandbox paid: '+money(payment.total_cents)));
        if(refunded>0)card.append(element('p','Refunded: '+money(refunded)));
        if(pending>0)card.append(element('p','Refund pending: '+money(pending)));
      }
      if(auction.is_winner&&auction.outcome==='winner_selected'&&!paid){
        const link=element('a','Test sandbox checkout');link.href='pay.html?auction='+encodeURIComponent(auction.auction_id);card.append(link);
      }
      holder.append(card);
    }
    status.textContent=data?.length?`${data.length} auction(s) in your activity.`:'You have not created an auction or placed a bid yet.';
  }catch(error){if(current===generation)status.textContent='Unable to load your activity: '+(error.message||'Please try again.');}
}
document.querySelector('#refresh').addEventListener('click',load);
db.auth.onAuthStateChange(()=>{clear();setTimeout(load,0);});
setInterval(()=>{if(!document.hidden)load();},15000);
load();
