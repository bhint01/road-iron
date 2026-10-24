// Store and auction sessions remain separate; each backend enforces its own permissions.
(function(){
 const app=document.getElementById('app');
 const storeTab=document.getElementById('store-tab'),auctionTab=document.getElementById('auctions-tab');
 const storePanel=document.getElementById('store-tools'),auctionPanel=document.getElementById('auction-tools');
 const frame=document.getElementById('auction-admin-frame');
 let current='store',available=!app.classList.contains('hidden');
 function show(name,updateHash=true){
  if(!available)return;
  current=name;
  const auction=name==='auctions';
  storePanel.hidden=auction;auctionPanel.hidden=!auction;
  for(const [tab,selected] of [[storeTab,!auction],[auctionTab,auction]]){tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;}
  if(auction&&!frame.getAttribute('src'))frame.src='/admin-auctions/index.html';
  if(updateHash)history.replaceState(null,'',location.pathname+location.search+(auction?'#auctions':''));
 }
 function checkAccess(){
  const next=!app.classList.contains('hidden');
  if(!next){available=false;frame.removeAttribute('src');auctionPanel.hidden=true;storePanel.hidden=false;current='store';return;}
  if(!available){available=true;show(location.hash==='#auctions'?'auctions':'store',false);}
 }
 storeTab.addEventListener('click',()=>show('store'));
 auctionTab.addEventListener('click',()=>show('auctions'));
 const tabs=[storeTab,auctionTab];
 tabs.forEach((tab,index)=>tab.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?1:1-index;
  tabs[next].focus();show(next?'auctions':'store');
 }));
 new MutationObserver(checkAccess).observe(app,{attributes:true,attributeFilter:['class']});
 window.addEventListener('hashchange',()=>show(location.hash==='#auctions'?'auctions':'store',false));
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='road-iron-auction-frame-size')return;
  const height=Number(event.data.height);if(Number.isFinite(height))frame.style.height=Math.max(400,Math.min(20000,Math.ceil(height)))+'px';
 });
 document.getElementById('auctionLogOut').addEventListener('click',()=>window.logout());
 window.roadIronAuctions={
  async signOut(){
   frame.removeAttribute('src');
   const {db}=await import('./auctions/supabase-client.js');
   const {error}=await db.auth.signOut({scope:'local'});if(error)throw error;
  }
 };
 if(available)show(location.hash==='#auctions'?'auctions':'store',false);
})();
