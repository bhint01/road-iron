import {db} from './supabase-client.js';
const message=document.querySelector('#message'),retry=document.querySelector('#retry-button');
const currentUrl=new URL(location.href),id=currentUrl.searchParams.get('auction');
for(const key of ['payment_intent_client_secret','setup_intent_client_secret'])currentUrl.searchParams.delete(key);
history.replaceState(null,'',currentUrl.pathname+currentUrl.search+currentUrl.hash);
let generation=0,busy=false;
db.auth.onAuthStateChange((event)=>{
 if(event==='SIGNED_OUT'){generation++;busy=false;retry.hidden=true;message.textContent='You signed out. Sign in to your winning bidder account to continue.';}
});
async function start(){
 if(busy)return;busy=true;const attempt=++generation;retry.hidden=true;
 try{
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||''))throw Error('Open this page from your winning auction.');
  const {data:{session},error}=await db.auth.getSession();
  if(attempt!==generation)return;
  if(error||!session?.access_token)throw Error('Sign in to your winning bidder account first.');
  message.textContent='Checking your winning auction and sandbox checkout…';
  const response=await fetch('https://aefukymxvapmwkujuxtq.supabase.co/functions/v1/auction-sandbox-checkout',{
   method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':'sb_publishable_myk5127XIz8uUW0NnbQ1Jg_zRg81sq7'},body:JSON.stringify({auctionId:id}),credentials:'omit'
  });
  const result=await response.json();if(attempt!==generation)return;
  if(!response.ok){retry.hidden=result.retryable!==true;throw Error(result.error||'Sandbox checkout unavailable.');}
  if(['paid','processing'].includes(result.status)){message.textContent=result.message;return;}
  let destination;try{destination=new URL(result.url)}catch{throw Error('Invalid Stripe checkout destination.')}
  if(destination.protocol!=='https:'||destination.hostname!=='checkout.stripe.com')throw Error('Invalid Stripe checkout destination.');
  message.textContent='Opening Stripe sandbox checkout…';location.assign(destination.href);
 }catch(error){if(attempt===generation)message.textContent=error.message||'Checkout unavailable.';}
 finally{if(attempt===generation)busy=false;}
}
retry.addEventListener('click',start);
start();
