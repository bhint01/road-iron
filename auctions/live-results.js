import {db} from './supabase-client.js';
import {LIVE_API_ORIGIN} from './live-config.js';
let generation=0;const message=document.querySelector('#message');
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){generation++;message.textContent='You signed out.'}});
async function refresh(){
 const attempt=++generation;
 if(!LIVE_API_ORIGIN){message.textContent='Live payments are not enabled.';return;}
 const {data:{session}}=await db.auth.getSession();if(attempt!==generation)return;
 if(!session)throw Error('Sign in to your auction account.');
 const response=await fetch(LIVE_API_ORIGIN+'/status',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({auctionId:new URL(location.href).searchParams.get('auction')}),credentials:'omit'});
 const result=await response.json();if(attempt!==generation)return;
 if(!response.ok)throw Error('Payment status unavailable. Do not pay again while ROAD IRON checks it.');
 const money=c=>(c/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
 message.textContent=result.paid?'Payment received: '+money(result.totalCents)+'. Refunded: '+money(result.refundedCents)+'.'+(result.disputed?' Payment is under review.':''):'Payment confirmation is processing. Do not pay again. Refresh this page shortly.';
}
const run=()=>refresh().catch(e=>message.textContent=e.message);document.querySelector('#refresh').onclick=run;run();
