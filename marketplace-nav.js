// Navigation and initial search terms only. Existing marketplace modules own all business logic.
const toggle=document.querySelector('.menu-toggle'),nav=document.querySelector('.site-nav');
function closeMenu(){nav?.classList.remove('is-open');toggle?.setAttribute('aria-expanded','false');toggle?.setAttribute('aria-label','Open navigation menu');}
if(toggle&&nav){
 toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';nav.classList.toggle('is-open',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close navigation menu':'Open navigation menu');});
 nav.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenu();document.querySelectorAll('.site-more[open]').forEach(el=>el.open=false);toggle.focus();}});
 document.addEventListener('click',event=>{if(!event.target.closest('.site-header')){closeMenu();document.querySelectorAll('.site-more[open]').forEach(el=>el.open=false);}});
 matchMedia('(min-width:851px)').addEventListener('change',closeMenu);
}
const q=new URLSearchParams(location.search).get('q');
if(q){const input=document.querySelector('#search');if(input){input.value=q.slice(0,120);input.dispatchEvent(new Event('input',{bubbles:true}));}}
// Preserve older homepage bookmarks after moving the long sections to their own pages.
if(location.pathname==='/'){
 const moved={'#contact':'/contact.html','#sell':'/seller.html','#advertise':'/advertising.html','#policies':'/policies.html','#marketplace-catalog':'/how-it-works.html#marketplace-catalog'};
 if(moved[location.hash])location.replace(moved[location.hash]);
}
