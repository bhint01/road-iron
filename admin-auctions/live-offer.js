import {LIVE_API_ORIGIN} from './live-config.js';
import {db} from './supabase-client.js';
const form=document.querySelector('#setup'),status=document.querySelector('#status');let generation=0;
const cents=value=>{const n=Math.round(Number(value)*100);if(!Number.isSafeInteger(n)||n<0||n>99999999)throw Error('Enter a valid nonnegative charge.');return n;};
async function load(){const current=++generation;form.hidden=true;
 try{const {data:{user},error}=await db.auth.getUser();if(error||!user)throw Error('Sign in through Auction administration first.');
  const allowed=await db.rpc('is_auction_admin');if(allowed.error||allowed.data!==true)throw Error('Verified administrator access required.');
  const result=await db.rpc('admin_list_auctions',{p_status:'draft'});if(result.error)throw result.error;if(current!==generation)return;
  form.elements.auction.replaceChildren();for(const a of result.data||[]){const option=document.createElement('option');option.value=a.id;option.textContent=a.title;form.elements.auction.append(option);}
  form.hidden=false;status.textContent=form.elements.auction.options.length?'Choose a draft and enter its delivery details.':'No draft auctions are available.';
 }catch(e){if(current===generation)status.textContent=e.message;}
}
form.onsubmit=async event=>{event.preventDefault();const current=generation,button=form.querySelector('button');button.disabled=true;
 try{const get=name=>form.elements[name].value.trim(),pickup=form.elements.pickup.checked,shipping=form.elements.shipping.checked;
  if(!pickup&&!shipping)throw Error('Offer pickup, shipping, or both.');const address={country:'US'};for(const key of ['line1','line2','city','state','postal_code'])address[key]=get(key);address.state=address.state.toUpperCase();
  if(pickup&&(!address.line1||!address.city||!address.state||!address.postal_code))throw Error('Complete the pickup address.');
  const settings={pickup:{enabled:pickup,feeCents:cents(get('pickupFee')),address},shipping:{enabled:shipping,pricing:'fixed',amountCents:shipping?cents(get('shippingFee')):0}};
  if(!LIVE_API_ORIGIN)throw Error('Live setup is disabled');const {data:{session}}=await db.auth.getSession();if(!session)throw Error('Sign in required');const response=await fetch(LIVE_API_ORIGIN+'/offer',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({auctionId:get('auction'),settings,taxCode:get('taxCode')}),credentials:'omit'});if(!response.ok)throw Error('Setup was not saved. Check permissions and that bidding has not started.');
  if(current===generation)status.textContent='Live pickup/shipping setup saved. These charges must be disclosed in the listing before publication.';
 }catch(e){if(current===generation)status.textContent=e.message;}finally{if(current===generation)button.disabled=false;}
};
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){generation++;form.hidden=true;status.textContent='Signed out.';}});load();
