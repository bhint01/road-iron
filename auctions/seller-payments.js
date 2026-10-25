import {db} from './supabase-client.js';
import {runOperation} from './operation-client.js';
const status=document.querySelector('#status'),controls=document.querySelector('#controls');let generation=0,busy=false;
function clear(){generation++;controls.hidden=true;busy=false;status.textContent='Sign in on the auction homepage to set up seller payments.';}
async function check(){const current=++generation;
 try{const {data:{user},error}=await db.auth.getUser();if(current!==generation)return;if(error||!user){clear();return;}
  controls.hidden=false;const result=await runOperation(db,'seller_status');if(current!==generation)return;
  status.textContent=result.ready?'Your sandbox seller account can receive transfers and payouts.':result.status==='not_started'?'Start your sandbox seller setup with Stripe.':'Stripe verification is incomplete. Continue setup to provide outstanding information.';
 }catch(e){if(current===generation)status.textContent=e.message;}
}
document.querySelector('#check').onclick=check;
document.querySelector('#onboard').onclick=async()=>{if(busy)return;busy=true;const current=++generation;status.textContent='Preparing secure Stripe sandbox setup…';
 try{const result=await runOperation(db,'onboard');if(current!==generation)return;const url=new URL(result.url);
  if(url.protocol!=='https:'||!['connect.stripe.com','onboarding.stripe.com'].includes(url.hostname))throw Error('Invalid Stripe setup destination');location.assign(url.href);
 }catch(e){if(current===generation)status.textContent=e.message;}finally{if(current===generation)busy=false;}
};
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')clear();});check();
