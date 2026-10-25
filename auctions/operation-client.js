export async function runOperation(db,action,obligationId=null,amountCents=null,operationId=crypto.randomUUID()){
 const {data,error}=await db.rpc('enqueue_auction_sandbox_operation',{p_id:operationId,p_action:action,p_obligation_id:obligationId,p_amount_cents:amountCents});
 if(error)throw error;
 const response=await fetch('https://aefukymxvapmwkujuxtq.supabase.co/functions/v1/auction-sandbox-operations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),credentials:'omit'});
 const result=await response.json();
 if(!response.ok)throw Error(result.code==='more_permissions_required'?'The sandbox Stripe key needs additional permissions for this operation.':result.error||'Sandbox operation unavailable');
 return result;
}
export async function runSellerJob(db,obligationId,action='release'){
 const {data,error}=await db.rpc('enqueue_sandbox_seller_job',{p_obligation_id:obligationId,p_action:action});if(error)throw error;
 const response=await fetch('https://aefukymxvapmwkujuxtq.supabase.co/functions/v1/auction-sandbox-payout-worker',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),credentials:'omit'});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Seller operation unavailable');return result;
}
