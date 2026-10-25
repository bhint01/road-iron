import {db} from './supabase-client.js';
import {runOperation,runSellerJob} from './operation-client.js';
const status=document.querySelector('#status'),holder=document.querySelector('#payments');const money=x=>(Number(x)/100).toLocaleString('en-US',{style:'currency',currency:'USD'});let generation=0;
const element=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
async function load(){const current=++generation;holder.replaceChildren();status.textContent='Checking administrator access…';
 try{const {data:{user},error:auth}=await db.auth.getUser();if(current!==generation)return;if(auth||!user)throw Error('Sign in through Auction administration first.');
  const {data,error}=await db.rpc('admin_auction_payment_operations');if(error)throw error;if(current!==generation)return;
  for(const row of data||[]){const card=element('article','');card.append(element('h2',row.title),element('p',`Paid: ${row.paid?'Yes':'No'} · Total: ${money(row.total_cents)} · Refunded: ${money(row.refunded_cents)} · Pending: ${money(row.refund_pending_cents)}`));
   if(row.disputed)card.append(element('p','DISPUTE HOLD — seller release is blocked. Review the case in Stripe.'));
   const actions=element('div','');actions.className='actions';card.append(actions);
   const outcome=element('p','');outcome.setAttribute('role','status');card.append(outcome);
   async function action(button,operation){button.disabled=true;const current=generation;try{const result=await operation();if(current!==generation)return;outcome.textContent=result.status?`Sandbox result: ${result.status}${result.reason?' — '+result.reason:''}`:'Sandbox action recorded.';}catch(e){if(current===generation)outcome.textContent=e.message;}finally{if(current===generation)button.disabled=false;}}
   const button=(label,fn)=>{const b=element('button',label);b.type='button';b.onclick=()=>action(b,()=>fn(b));actions.append(b);return b;};
   if(row.paid&&!row.disputed){
    const label=element('label','Refund amount (USD)');const amount=document.createElement('input');amount.type='number';amount.min='.01';amount.step='.01';amount.value=String((Number(row.total_cents)-Number(row.refunded_cents)-Number(row.refund_pending_cents))/100);label.append(amount);card.append(label);
    const operationId=crypto.randomUUID();button('Refund test payment',async()=>{const n=Math.round(Number(amount.value)*100);if(!Number.isSafeInteger(n)||n<=0)throw Error('Enter a positive refund amount.');if(!confirm(`Refund ${money(n)} of this sandbox payment?`))return {status:'cancelled'};return runOperation(db,'refund',row.id,n,operationId);});
    button('Record reviewed handoff proof',async()=>{const reference=prompt('Enter your reviewed sandbox delivery reference (at least 6 characters).');if(!reference)return {status:'cancelled'};const {error}=await db.rpc('confirm_auction_delivery',{p_obligation_id:row.id,p_proof_type:'admin_review',p_proof_reference:reference});if(error)throw error;return {status:'delivery_recorded'};});
    button('Approve reviewed sandbox allocation',async()=>{if(!confirm('Confirm you reviewed delivery evidence, risk, and the sandbox 10% commission / 90% seller allocation.'))return {status:'cancelled'};const {error}=await db.rpc('approve_auction_sandbox_release',{p_obligation_id:row.id});if(error)throw error;return {status:'approved'};});
    button('Release eligible seller transfer',()=>runSellerJob(db,row.id));
   }
   if(Number(row.refunded_cents)>0&&row.transfer_state)button('Reverse refunded seller share',()=>runSellerJob(db,row.id,'reverse_refund'));
   if(row.transfer_state==='submitted'&&!row.disputed&&Number(row.refunded_cents)===0){const operationId=crypto.randomUUID();button('Test bank payout',async()=>{if(!confirm('Send this sandbox seller share to its verified Stripe TEST BANK?'))return {status:'cancelled'};return runOperation(db,'bank_payout',row.id,null,operationId);});}
   if(row.bank_payout_state)button('Check test bank payout',()=>runOperation(db,'bank_status',row.id));
   holder.append(card);
  }status.textContent=`${data?.length||0} sandbox payment record(s). Refresh after webhook processing to see reconciled amounts.`;
 }catch(e){if(current===generation)status.textContent=e.message;}
}
document.querySelector('#refresh').onclick=load;db.auth.onAuthStateChange(()=>{generation++;holder.replaceChildren();setTimeout(load,0);});load();
