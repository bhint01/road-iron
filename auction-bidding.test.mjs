// Run with: node --test auction-bidding.test.mjs
// Development-only adapter checks. These do not test database transactions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source = await readFile(new URL('./auction-bidding.js', import.meta.url), 'utf8');
const {createAuctionBidClient} = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

const id='123e4567-e89b-42d3-a456-426614174000';
const key='123e4567-e89b-42d3-a456-426614174001';
function mock({user={id},rpcError=null}={}) {
  const calls=[];
  const supabase={
    auth:{async getUser(){return {data:{user},error:null}}},
    async rpc(name,args){calls.push({name,args});return rpcError?
      {data:null,error:{message:rpcError}}:
      {data:[{bid_id:id,accepted_amount:args.p_amount,closes_at:'2026-10-22T20:00:00Z'}],error:null};}
  };
  return {supabase,calls};
}
test('bidding is disabled by default',async()=>{
  const m=mock();
  await assert.rejects(createAuctionBidClient(m.supabase).placeBid({lotId:id,amount:12,requestKey:key}),/not enabled/);
  assert.equal(m.calls.length,0);
});
test('must be signed in',async()=>{
  const m=mock({user:null});
  await assert.rejects(createAuctionBidClient(m.supabase,{featureEnabled:true}).placeBid({lotId:id,amount:12,requestKey:key}),/sign in/);
  assert.equal(m.calls.length,0);
});
test('rejects malformed IDs and amounts before RPC',async()=>{
  const m=mock(),client=createAuctionBidClient(m.supabase,{featureEnabled:true});
  for(const args of [
    {lotId:'bad',amount:12,requestKey:key},
    {lotId:id,amount:12,requestKey:'bad'},
    {lotId:id,amount:-1,requestKey:key},
    {lotId:id,amount:0.001,requestKey:key},
    {lotId:id,amount:'Infinity',requestKey:key},
  ]) await assert.rejects(client.placeBid(args));
  assert.equal(m.calls.length,0);
});
test('submits verified session with no bidder-id parameter',async()=>{
  const m=mock(),client=createAuctionBidClient(m.supabase,{featureEnabled:true});
  const result=await client.placeBid({lotId:id,amount:12.5,requestKey:key});
  assert.equal(result.bid_id,id);
  assert.deepEqual(m.calls,[{name:'auction_place_bid',args:{p_lot_id:id,p_amount:'12.50',p_request_key:key}}]);
});
test('surfaces RPC errors without claiming success',async()=>{
  const m=mock({rpcError:'Auction is closed'});
  await assert.rejects(createAuctionBidClient(m.supabase,{featureEnabled:true}).placeBid({lotId:id,amount:12,requestKey:key}),/closed/);
});
