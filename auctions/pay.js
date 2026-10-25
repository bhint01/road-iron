import {db} from './supabase-client.js';
const $=s=>document.querySelector(s);
const id=new URLSearchParams(location.search).get('auction');
const message=$('#message');
for(const s of ['#card-section','#review-section','#pending-section','#receipt-section'])$(s).hidden=true;
$('#disclosure').textContent='ROAD IRON Auctions sandbox test only. Winning bid only; no surcharge, shipping or tax is charged in this test. No real funds are collected.';
async function start(){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||''))throw Error('Open this page from your winning auction.');
 const {data:{session},error}=await db.auth.getSession();
 if(error||!session?.access_token)throw Error('Sign in to your winning bidder account first.');
 message.textContent='Checking your winning auction and sandbox checkout…';
 const response=await fetch('https://aefukymxvapmwkujuxtq.supabase.co/functions/v1/auction-sandbox-checkout',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':'sb_publishable_myk5127XIz8uUW0NnbQ1Jg_zRg81sq7'},body:JSON.stringify({auctionId:id}),credentials:'omit'});
 const result=await response.json();
 if(!response.ok)throw Error(result.error||'Sandbox checkout unavailable.');
 if(typeof result.url!=='string'||!result.url.startsWith('https://checkout.stripe.com/'))throw Error('Invalid Stripe checkout destination.');
 message.textContent='Opening Stripe sandbox checkout…';
 location.assign(result.url);
}
start().catch(error=>{message.textContent=error.message||'Checkout unavailable.';});
