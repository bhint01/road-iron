import { db } from './supabase-client.js';
import { describeOutcome } from './auction-status.js';

const status=document.querySelector('#status'),holder=document.querySelector('#saved');
const money=cents=>(Number(cents)/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
const element=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
let generation=0;
function clear(){generation++;holder.replaceChildren();}
async function load(){
 clear();const current=generation;
 status.textContent='Loading your watchlist…';
 try{
  const {data:{user},error:authError}=await db.auth.getUser();
  if(current!==generation)return;
  if(authError||!user){status.textContent='Sign in on the auction homepage to see your private watchlist.';return;}
  const {data,error}=await db.rpc('my_watchlist');
  if(current!==generation)return;
  if(error)throw error;
  for(const auction of data||[]){
   const card=document.createElement('article');
   card.append(element('h2',auction.title),element('p',describeOutcome(auction)));
   card.append(element('p',auction.highest_bid_cents===null?'Opening bid: '+money(auction.opening_bid_cents):'Highest bid: '+money(auction.highest_bid_cents)));
   card.append(element('p','Closes: '+new Date(auction.ends_at).toLocaleString()));
   const remove=element('button','Remove from watchlist');remove.type='button';remove.disabled=Boolean(db.previewOnly);
   remove.addEventListener('click',async()=>{
    remove.disabled=true;
    try{
     const {error}=await db.rpc('set_watchlist',{p_auction_id:auction.auction_id,p_watching:false});
     if(current!==generation)return;
     if(error)throw error;
     await load();
    }catch(error){if(current===generation){remove.disabled=false;status.textContent='Could not remove auction: '+error.message;}}
   });
   card.append(remove);holder.append(card);
  }
  status.textContent=data?.length?`${data.length} saved auction(s).`:'Your watchlist is empty. Choose Watch on an auction to save it here.';
 }catch(error){if(current===generation)status.textContent='Unable to load your watchlist: '+(error.message||'Please try again.');}
}
document.querySelector('#refresh').addEventListener('click',load);
db.auth.onAuthStateChange(()=>{clear();setTimeout(load,0);});
setInterval(()=>{if(!document.hidden)load();},15000);
load();
