// Public, read-only search. Checkout, inventory, bidding and authentication remain in their existing pages.
const form=document.querySelector('#market-search'),input=document.querySelector('#query'),status=document.querySelector('#search-status');
const sources=[
 {id:'store-results',url:'https://sblnblmcvyvmllyvrnbb.supabase.co',key:'sb_publishable_eV80ZW_U97yqGquu4bFL0A_i4S0hCia',table:'products',state:'active',fields:['name','description','make','model','part_number'],columns:'id,name,description,category,price,make,model,year,part_number',order:'created_at.desc'},
 {id:'auction-results',url:'https://aefukymxvapmwkujuxtq.supabase.co',key:'sb_publishable_myk5127XIz8uUW0NnbQ1Jg_zRg81sq7',table:'auctions',state:'published',fields:['title','description'],columns:'id,title,description,starts_at,ends_at',order:'ends_at.asc'}
];
let generation=0,controller;
const node=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el;};
const money=value=>Number(value).toLocaleString('en-US',{style:'currency',currency:'USD'});
async function runSearch(){
 const q=input.value.trim().slice(0,120);if(!q)return;
 controller?.abort();controller=new AbortController();const signal=controller.signal,current=++generation;
 const url=new URL(location.href);url.searchParams.set('q',q);history.replaceState(null,'',url);
 status.textContent='Searching the parts store and auctions…';
 // Quote each literal filter value. User input cannot add fields, filters or change listing visibility.
 const literal=q.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/[%_*]/g,' ');
 const outcomes=await Promise.all(sources.map(async source=>{
  const section=document.getElementById(source.id),message=section.querySelector('.result-status'),holder=section.querySelector('.search-results');holder.replaceChildren();message.textContent='Searching…';
  try{
   const params=new URLSearchParams({select:source.columns,status:'eq.'+source.state,or:'('+source.fields.map(field=>field+'.ilike."*'+literal+'*"').join(',')+')',order:source.order,limit:'100'});
   const response=await fetch(source.url+'/rest/v1/'+source.table+'?'+params,{headers:{apikey:source.key},signal});if(!response.ok)throw Error('Search unavailable');
   const rows=await response.json();if(!Array.isArray(rows))throw Error('Search unavailable');if(current!==generation)return null;
   message.textContent=rows.length?rows.length+' matching listing'+(rows.length===1?'':'s')+(rows.length===100?' · Refine your search for more specific results.':''):'No matching listings. Try a different keyword.';
   for(const item of rows){
    const card=node('article','');card.className='search-result';const title=source.table==='products'?item.name:item.title;card.append(node('h3',title));
    if(source.table==='products'){
     card.append(node('p',[item.category,item.year,item.make,item.model,item.part_number].filter(Boolean).join(' · ')),node('p',money(item.price)));
     const link=node('a','View part →');link.href='/product.html?id='+encodeURIComponent(item.id);card.append(link);
    }else{
     const now=Date.now(),ended=Date.parse(item.ends_at)<=now,upcoming=Date.parse(item.starts_at)>now;
     card.append(node('p',ended?'Auction ended':upcoming?'Upcoming auction':'Live auction'));
     const link=node('a','View auction →');link.href='/auctions/?q='+encodeURIComponent(item.title)+'#browse';card.append(link);
    }
    holder.append(card);
   }
   return {count:rows.length};
  }catch(error){if(current!==generation||signal.aborted)return null;message.textContent='Search is temporarily unavailable. Please try again or browse this marketplace.';const link=node('a',source.table==='products'?'Browse parts →':'Browse auctions →');link.href=source.table==='products'?'/#inventory':'/auctions/';holder.append(link);return {error:true};}
 }));
 if(current!==generation)return;
 const failed=outcomes.filter(x=>x?.error).length,total=outcomes.reduce((sum,x)=>sum+(x?.count||0),0);
 status.textContent=failed===2?'Search is temporarily unavailable. Use the browse links below or try again.':failed?'Some results are available below. One marketplace could not be searched; please try it again.':total+' matching listing'+(total===1?'':'s')+' across the parts store and auctions.';
}
form.addEventListener('submit',event=>{event.preventDefault();if(form.reportValidity())runSearch();});
input.value=(new URLSearchParams(location.search).get('q')||'').slice(0,120);if(input.value.trim())runSearch();
