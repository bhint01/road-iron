import {LIVE_API_ORIGIN} from './live-config.js';
const unavailable='Live payment status could not be verified. Refresh to check again. Publishing a draft does not charge a buyer.';
export function paymentStatusMessage(data){
 if(!data||data.ready!==true||data.accountVerified!==true||data.databaseConnected!==true||typeof data.checkoutEnabled!=='boolean')return {state:'unavailable',text:unavailable};
 if(data.checkoutEnabled)return {state:'enabled',text:'Live auction checkout is enabled. Buyers can pay eligible winning auctions after delivery and tax setup. Publishing a draft only schedules the auction; it does not charge a buyer.'};
 return {state:'disabled',text:'Live auction checkout is currently disabled. Publishing a draft only schedules the auction; it does not charge a buyer.'};
}
export function createPaymentStatusMonitor({notice,fetchStatus,timer=setTimeout,clearTimer=clearTimeout}){
 let generation=0,active;
 return async function refresh(){
  if(!notice)return;
  active?.abort();const current=++generation,controller=new AbortController();active=controller;
  notice.textContent='Checking live payment status… Publishing a draft does not charge a buyer.';notice.dataset.state='checking';
  const timeout=timer(()=>controller.abort(),10000);
  try{
   const response=await fetchStatus(controller.signal);if(!response.ok)throw Error('Status unavailable');
   const message=paymentStatusMessage(await response.json());if(current!==generation)return;
   notice.textContent=message.text;notice.dataset.state=message.state;
  }catch{if(current===generation){notice.textContent=unavailable;notice.dataset.state='unavailable';}}
  finally{clearTimer(timeout);}
 };
}
const notice=document.querySelector('#payment-status');
if(notice){
 const refresh=createPaymentStatusMonitor({notice,fetchStatus:signal=>fetch(LIVE_API_ORIGIN+'/health',{method:'GET',cache:'no-store',credentials:'omit',signal})});
 document.querySelector('#refresh')?.addEventListener('click',refresh);
 refresh();
}
