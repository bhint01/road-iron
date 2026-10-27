import {preparePhoto,uploadPhoto} from './seller-photos.js';
import {auctionPhotos,MAX_AUCTION_PHOTOS} from './auction-gallery.js';
export function createPhotoEditor({input,holder,message,onChange}){
 let entries=[],generation=0,busy=false,locked=false;
 const release=()=>entries.forEach(e=>{if(e.preview)URL.revokeObjectURL(e.preview);});
 function render(){
  holder.replaceChildren();input.disabled=locked||busy||entries.length>=MAX_AUCTION_PHOTOS;
  entries.forEach((entry,i)=>{
   const card=document.createElement('div');card.className='photoTile';const img=document.createElement('img');img.src=entry.preview||entry.url;img.alt='Listing photo '+(i+1);card.append(img);
   const label=document.createElement('p');label.textContent=i===0?'Cover photo':'Photo '+(i+1);card.append(label);
   const action=(text,fn,disabled=false)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.disabled=locked||busy||disabled;b.onclick=()=>{fn();onChange();render();};card.append(b);};
   action('Make cover',()=>{entries.splice(i,1);entries.unshift(entry);},i===0);
   action('Move left',()=>{[entries[i-1],entries[i]]=[entries[i],entries[i-1]];},i===0);
   action('Remove',()=>{entries.splice(i,1);if(entry.preview)URL.revokeObjectURL(entry.preview);});holder.append(card);
  });
 }
 input.onchange=async()=>{
  if(locked||busy)return;const files=Array.from(input.files||[]);input.value='';if(!files.length)return;
  if(entries.length+files.length>MAX_AUCTION_PHOTOS){message.textContent='Up to 20 photos per auction. You can add '+(MAX_AUCTION_PHOTOS-entries.length)+' more.';return;}
  const revision=++generation;busy=true;render();const errors=[];
  try{for(let i=0;i<files.length;i++){
   message.textContent='Preparing photo '+(i+1)+' of '+files.length+'…';
   try{const blob=await preparePhoto(files[i]);if(revision!==generation)return;entries.push({blob,preview:URL.createObjectURL(blob)});onChange();}
   catch(error){if(revision!==generation)return;errors.push(files[i].name+': '+error.message);}
  }}finally{if(revision===generation){busy=false;render();message.textContent=entries.length+' / 20 photos. First photo is the cover. '+errors.join(' ');}}
 };
 return {
  get busy(){return busy;},
  load(auction={}){generation++;busy=false;release();entries=auctionPhotos(auction).map(url=>({url}));input.value='';message.textContent=entries.length+' / 20 photos. Add more or change the cover.';render();},
  lock(value){locked=value;render();},
  async upload(db,userId){const ownerGeneration=generation;const urls=[];for(let i=0;i<entries.length;i++){
   if(generation!==ownerGeneration)throw Error('Photo selection changed. Sign in and reopen your draft.');
   const entry=entries[i];if(!entry.url){message.textContent='Uploading photo '+(i+1)+' of '+entries.length+'…';const result=await uploadPhoto(db,userId,entry.blob);if(generation!==ownerGeneration)throw Error('Photo selection changed. Reopen your draft.');entry.url=result.url;}
   urls.push(entry.url);
  }return urls;},
 };
}
