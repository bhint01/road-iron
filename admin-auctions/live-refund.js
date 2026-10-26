import {db} from './supabase-client.js';
import {LIVE_API_ORIGIN} from './live-config.js';
const form=document.querySelector('form'),message=document.querySelector('#message');let busy=false;
form.onsubmit=async event=>{
 event.preventDefault();if(busy)return;
 if(!LIVE_API_ORIGIN){message.textContent='Live refunds are not enabled.';return;}
 const obligationId=form.elements.obligationId.value.trim(),amount=form.elements.amount.value;
 if(!/^\d+(\.\d{1,2})?$/.test(amount))return;
 const amountCents=Math.round(Number(amount)*100);if(!Number.isSafeInteger(amountCents)||amountCents<=0)return;
 if(!confirm('Refund $'+(amountCents/100).toFixed(2)+' of real funds for obligation '+obligationId+'?'))return;
 busy=true;form.querySelector('button').disabled=true;
 const key='auction-live-refund:'+obligationId+':'+amountCents;
 // Retain the same ID after a network failure or reload; never silently rotate it.
 const requestId=sessionStorage.getItem(key)||crypto.randomUUID();sessionStorage.setItem(key,requestId);
 try{
  const {data:{session}}=await db.auth.getSession();if(!session)throw Error('Administrator sign-in required');
  const response=await fetch(LIVE_API_ORIGIN+'/refund',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({obligationId,requestId,amountCents}),credentials:'omit'});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Refund requires reconciliation');
  message.textContent='Refund '+result.refundId+': '+result.status+'. Refresh the buyer payment status for confirmation.';
 }catch(e){message.textContent=e.message;}finally{busy=false;form.querySelector('button').disabled=false;}
};
