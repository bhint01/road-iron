import { db } from './supabase-client.js';
import { describeOutcome } from './auction-status.js';
const status=document.querySelector('#status'), list=document.querySelector('#list');
const money=c=>(c/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
let auctions=[],generation=0,saved=new Set(),watchlistReady=false,signedIn=false;
const watchingPending=new Set();
if(db.previewOnly){document.querySelector('#sign').disabled=true;document.querySelector('#sign').textContent='Preview account';}
async function load(){
 const current=++generation;
 if(!db){status.textContent='Auction system setup in progress. No bidding is available yet.';return;}
 status.textContent='Loading auctions…';
 const {data:{user},error:authError}=await db.auth.getUser();
 const watched=user&&!authError?await db.rpc('my_watchlist'):{data:[],error:null};
 if(current!==generation)return;
 signedIn=Boolean(user&&!authError);watchlistReady=!watched.error;saved=new Set((watched.data||[]).map(a=>a.auction_id));
 const {data,error}=await db.from('auctions').select('id,title,description,image_url,opening_bid_cents,increment_cents,starts_at,ends_at,status').eq('status','published').order('ends_at');
 if(error){status.textContent='Unable to load auctions: '+error.message;return;}
 const loaded=await Promise.all((data||[]).map(async a=>{const [summary,result]=await Promise.all([db.rpc('auction_bid_summary',{p_auction_id:a.id}),db.rpc('auction_outcome',{p_auction_id:a.id})]);return {...a,result:result.data?.[0]||null,resultError:Boolean(result.error),highest_bid_cents:summary.error?null:summary.data?.[0]?.highest_bid_cents??null,bid_count:summary.error?null:summary.data?.[0]?.bid_count??null};}));if(current!==generation)return;auctions=loaded;render();
}
function render(){
 list.replaceChildren();
 const q=document.querySelector('#search').value.toLowerCase();
 const shown=auctions.filter(a=>(a.title+' '+a.description).toLowerCase().includes(q));
 status.textContent=shown.length+' auction(s) found';
 for(const a of shown){
 const card=el('article','card'), content=el('div','content');
 if(a.image_url&&(/^https:\/\//.test(a.image_url)||(db.previewOnly&&a.image_url.startsWith('./')))){const img=el('img');img.src=a.image_url;img.alt=a.title;img.loading='lazy';card.append(img);}
 content.append(el('h2','',a.title),el('p','meta',a.description.slice(0,180)));
 const now=Date.now(),start=Date.parse(a.starts_at),end=Date.parse(a.ends_at);
 const active=now>=start&&now<end&&!a.result;
 const top=Number(a.highest_bid_cents||0);
 const min=top?top+a.increment_cents:a.opening_bid_cents;
 content.append(el('p','',a.bid_count===null?'Bid information temporarily unavailable':top?'Current bid: '+money(top):'Opening bid: '+money(a.opening_bid_cents)));
 content.append(el('p','meta',active?'Closes: '+new Date(a.ends_at).toLocaleString():now<start?'Starts: '+new Date(a.starts_at).toLocaleString():'Auction ended'));
 if(a.result)content.append(el('p','status',describeOutcome(a.result)));else if(now>=end)content.append(el('p','status','Auction ended · result is being recorded'));
 const row=el('div','bid'),amount=el('input');amount.type='number';amount.min=String(min/100);amount.step='0.01';amount.value=(min/100).toFixed(2);amount.setAttribute('aria-label','Bid amount in dollars');
 const btn=el('button','', 'Place bid');btn.disabled=db.previewOnly||!active||a.bid_count===null||a.resultError;
 btn.onclick=async()=>{const cents=Math.round(Number(amount.value)*100);if(!Number.isSafeInteger(cents)||cents<min){alert('Minimum bid is '+money(min));return;}
 if(!confirm('Submit binding bid of '+money(cents)+'?'))return;
 btn.disabled=true;const {error}=await db.rpc('place_bid',{p_auction_id:a.id,p_amount_cents:cents});
 if(error)alert(error.message);else alert('Bid submitted');await load();};
 row.append(amount,btn);content.append(row);
 const watch=el('button','',saved.has(a.id)?'Watching':'Watch');
 watch.type='button';watch.setAttribute('aria-pressed',String(saved.has(a.id)));
 watch.setAttribute('aria-label',(saved.has(a.id)?'Stop watching ':'Watch ')+a.title);
 watch.disabled=Boolean(db.previewOnly)||!watchlistReady||watchingPending.has(a.id);
 watch.onclick=async()=>{
  if(!signedIn){status.textContent='Sign in to save auctions to your private watchlist.';return;}
  const current=generation,next=!saved.has(a.id);watchingPending.add(a.id);watch.disabled=true;
  try{
   const {error}=await db.rpc('set_watchlist',{p_auction_id:a.id,p_watching:next});
   if(current!==generation)return;
   if(error)throw error;
   if(next)saved.add(a.id);else saved.delete(a.id);
  }catch(error){if(current===generation)alert('Could not update your watchlist: '+error.message);}
  finally{watchingPending.delete(a.id);if(current===generation)render();}
 };
 content.append(watch);card.append(content);list.append(card);
 }
}
document.querySelector('#search').addEventListener('input',render);
document.querySelector('#refresh').onclick=load;
const signForm=document.querySelector('#signin-form'), signMessage=document.querySelector('#signin-status');
document.querySelector('#sign').onclick=async()=>{
 if(!db||db.previewOnly)return;
 if(!signedIn){location.assign(new URL('./auth.html',location.href).href);return;}
 try{const {error}=await db.auth.signOut();if(error)throw error;document.querySelector('#sign').textContent='Sign in';}
 catch(error){signForm.hidden=false;signMessage.textContent='Could not sign out: '+error.message;}
};
if(db)db.auth.onAuthStateChange((_event,session)=>{
 if(_event==='PASSWORD_RECOVERY'){
  location.replace(new URL('./auth.html?mode=password',location.href).href);return;
 }

 generation++;saved=new Set();watchlistReady=false;signedIn=Boolean(session);if(session){signForm.hidden=true;signMessage.textContent='';}render();
 if(!db.previewOnly)document.querySelector('#sign').textContent=session?'Sign out':'Sign in';
 setTimeout(load,0);
});
load();
setInterval(()=>{if(!document.hidden)load();},15000);
