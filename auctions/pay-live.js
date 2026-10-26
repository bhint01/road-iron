import {db} from './supabase-client.js';
import {LIVE_API_ORIGIN} from './live-config.js';
const message=document.querySelector('#message');let generation=0;
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){generation++;document.querySelector('#fulfillment-order')?.remove();message.textContent='You signed out. Sign in to your winning bidder account to continue.'}});
async function start(){
 if(!LIVE_API_ORIGIN){message.textContent='Live auction payments are not enabled yet.';return;}
 const endpoint=new URL(LIVE_API_ORIGIN);if(endpoint.origin!=='https://aefukymxvapmwkujuxtq.supabase.co'||endpoint.pathname!=='/functions/v1/auction-live'||endpoint.search||endpoint.hash)throw Error('Payment configuration requires assistance');
 const auctionId=new URL(location.href).searchParams.get('auction');
 if(!/^[0-9a-f-]{36}$/i.test(auctionId||''))throw Error('Open payment from your winning auction.');
 const attempt=++generation;
 const {data:{session},error}=await db.auth.getSession();if(attempt!==generation)return;
 if(error||!session?.access_token)throw Error('Sign in to your winning bidder account first.');
 const {showFulfillment}=await import('./live-fulfillment-ui.js');if(attempt!==generation)return;
 await showFulfillment({db,auctionId,token:session.access_token,message,isCurrent:()=>attempt===generation});
}
start().catch(e=>{message.textContent=e.message||'Payment unavailable. Contact ROAD IRON.'});
