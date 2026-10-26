import {LIVE_API_ORIGIN} from './live-config.js';
const money=x=>(Number(x)/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
export async function showFulfillment({db,auctionId,token,message,isCurrent}){
 const optionsResponse=await fetch(LIVE_API_ORIGIN+'/options',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({auctionId}),credentials:'omit'});const options=await optionsResponse.json(),error=!optionsResponse.ok;
 if(!isCurrent())return;if(error||!options)throw Error('Delivery options are unavailable. Contact ROAD IRON before paying.');
 document.querySelector('#fulfillment-order')?.remove();
 const form=document.createElement('form');form.id='fulfillment-order';
 form.innerHTML='<h2>Pickup or shipping</h2><p>Check delivery details before preparing payment. Changes afterward require ROAD IRON assistance.</p><label>Delivery method <select name="method" required></select></label><fieldset id="delivery-address"><legend>US delivery address</legend><label>Street <input name="line1" autocomplete="shipping address-line1"></label><label>Apartment/unit <input name="line2" autocomplete="shipping address-line2"></label><label>City <input name="city" autocomplete="shipping address-level2"></label><label>State <input name="state" maxlength="2" autocomplete="shipping address-level1"></label><label>ZIP <input name="postal_code" autocomplete="shipping postal-code"></label></fieldset><button type="submit">Review total with tax</button><div id="order-summary" role="status"></div>';
 const select=form.elements.method,fields=form.querySelector('fieldset'),button=form.querySelector('button'),summary=form.querySelector('#order-summary');
 const add=(value,label)=>{const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);};
 if(options.pickup?.enabled)add('pickup',`Local pickup — ${options.pickup.city||''}, ${options.pickup.state||''} (${money(options.pickup.feeCents||0)})`);
 if(options.shipping?.enabled&&options.shipping.pricing==='fixed')add('shipping',`Shipping — ${money(options.shipping.amountCents)}`);
 if(!select.options.length)throw Error('A shipping quote or pickup arrangement must be approved before payment.');
 if(options.selection){select.value=options.selection.method;for(const [key,value] of Object.entries(options.selection.address||{}))if(form.elements[key])form.elements[key].value=value;}
 const change=()=>{fields.hidden=select.value!=='shipping';for(const name of ['line1','city','state','postal_code'])form.elements[name].required=select.value==='shipping';};
 select.onchange=change;change();message.after(form);message.textContent='Choose your delivery method. The next screen shows item, delivery, tax and total before payment.';
 form.onsubmit=async event=>{
  event.preventDefault();if(button.disabled||!isCurrent())return;button.disabled=true;summary.textContent='Preparing your order total…';
  try{
   const input={auctionId,method:select.value};
   if(select.value==='shipping'){input.address={country:'US'};for(const key of ['line1','line2','city','state','postal_code'])input.address[key]=form.elements[key].value.trim();}
   const response=await fetch(LIVE_API_ORIGIN+'/checkout',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},credentials:'omit',body:JSON.stringify(input)});
   const result=await response.json();if(!isCurrent())return;if(!response.ok)throw Error(result.error||'Order total unavailable');
   if(result.status==='processing'){summary.textContent=result.message;return;}
   const url=new URL(result.url);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw Error('Invalid Stripe destination');
   summary.replaceChildren();for(const [label,value] of [['Winning item',result.itemCents],['Pickup/shipping',result.shippingCents],['Sales tax',result.taxCents],['Total',result.totalCents]]){const p=document.createElement('p');p.textContent=label+': '+money(value);summary.append(p);}
   const link=document.createElement('a');link.href=url.href;link.textContent='Continue to Stripe — '+money(result.totalCents);summary.append(link);
   message.textContent='Review the total before continuing; no surcharge is added.';form.querySelectorAll('input,select').forEach(e=>e.disabled=true);button.hidden=true;
  }catch(e){if(isCurrent())summary.textContent=e.message;}finally{if(isCurrent())button.disabled=false;}
 };
}
