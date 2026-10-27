export const MAX_AUCTION_PHOTOS=20;
export function auctionPhotos(auction){
 const urls=Array.isArray(auction.image_urls)&&auction.image_urls.length?auction.image_urls:[auction.image_url];
 return [...new Set(urls.filter(url=>typeof url==='string'&&/^https:\/\//.test(url)))].slice(0,MAX_AUCTION_PHOTOS);
}
let dialog,largeImage,counter,thumbnails,current=0,photos=[],title='',returnFocus;
function styles(){
 if(document.querySelector('#auction-gallery-style'))return;
 const style=document.createElement('style');style.id='auction-gallery-style';style.textContent=`
 .auctionPhotos{background:#101a1d;min-width:0}.auctionPhotos .photoOpen{display:block;width:100%;padding:0;margin:0;border:0;background:transparent;cursor:zoom-in}
 .auctionPhotos .photoOpen img{display:block;width:100%;height:240px;object-fit:contain;background:#0b1113}.auctionPhotos .photoBar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;color:#f6f1d8;font-size:14px}
 .auctionPhotos .photoBar button{width:auto;min-width:44px;min-height:44px;padding:7px 12px;margin:0;background:#eab64e;color:#17272a;border:0;border-radius:5px}
 .auctionPhotoDialog{box-sizing:border-box;width:min(1000px,96vw);max-width:96vw;max-height:94dvh;padding:16px;border:1px solid #64756b;border-radius:12px;background:#101a1d;color:#f6f1d8}.auctionPhotoDialog::backdrop{background:#000c}
 .auctionPhotoDialog .photoHeading,.auctionPhotoDialog .photoControls{display:flex;gap:12px;justify-content:space-between;align-items:center}.auctionPhotoDialog .photoHeading h2{font-size:18px;margin:0}.auctionPhotoDialog button{font:inherit;width:auto;min-height:44px;min-width:44px;margin:0;padding:8px 14px;border:1px solid #697968;border-radius:5px;background:#eab64e;color:#17272a}
 .auctionPhotoDialog .photoLarge{display:block;width:100%;height:min(58dvh,620px);object-fit:contain;background:#080d0e;margin:12px 0;touch-action:pan-y}.auctionPhotoDialog .photoThumbs{display:flex;gap:8px;overflow:auto;margin-top:12px;padding:3px}.auctionPhotoDialog .photoThumbs button{padding:2px;flex:0 0 64px;background:transparent;border:2px solid transparent}.auctionPhotoDialog .photoThumbs button[aria-current=true]{border-color:#eab64e}.auctionPhotoDialog .photoThumbs img{display:block;width:56px;height:48px;object-fit:cover}
 .auctionPhotoDialog button:focus-visible,.auctionPhotos button:focus-visible{outline:3px solid #fff;outline-offset:2px}`;document.head.append(style);
}
function button(text,label,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',label);b.onclick=action;return b;}
function show(index){
 current=(index+photos.length)%photos.length;largeImage.src=photos[current];largeImage.alt=title+' — photo '+(current+1)+' of '+photos.length;counter.textContent=(current+1)+' / '+photos.length;
 [...thumbnails.children].forEach((b,i)=>b.setAttribute('aria-current',String(i===current)));
}
function openGallery(urls,label,index,opener){
 styles();photos=urls;title=label;returnFocus=opener;
 if(!dialog){
  dialog=document.createElement('dialog');dialog.className='auctionPhotoDialog';dialog.setAttribute('aria-label','Auction photo gallery');
  const heading=document.createElement('div');heading.className='photoHeading';const h=document.createElement('h2');h.textContent='Auction photos';heading.append(h,button('✕','Close photo gallery',()=>dialog.close()));
  largeImage=document.createElement('img');largeImage.className='photoLarge';
  const controls=document.createElement('div');controls.className='photoControls';counter=document.createElement('span');counter.setAttribute('aria-live','polite');controls.append(button('←','Previous photo',()=>show(current-1)),counter,button('→','Next photo',()=>show(current+1)));
  thumbnails=document.createElement('div');thumbnails.className='photoThumbs';dialog.append(heading,largeImage,controls,thumbnails);document.body.append(dialog);
  dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();show(current+(e.key==='ArrowRight'?1:-1));}});
  dialog.addEventListener('close',()=>{largeImage.removeAttribute('src');thumbnails.replaceChildren();if(returnFocus?.isConnected)returnFocus.focus();});
  let touchX;largeImage.addEventListener('touchstart',e=>{touchX=e.changedTouches[0].clientX;},{passive:true});largeImage.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>50)show(current+(dx<0?1:-1));},{passive:true});
 }
 thumbnails.replaceChildren();urls.forEach((url,i)=>{const b=button('', 'View photo '+(i+1),()=>show(i));const img=document.createElement('img');img.src=url;img.alt='';img.loading='lazy';b.append(img);thumbnails.append(b);});
 show(index);dialog.showModal();
}
export function createAuctionGallery(auction){
 const urls=auctionPhotos(auction);if(!urls.length)return null;styles();let index=0;
 const holder=document.createElement('div');holder.className='auctionPhotos';const img=document.createElement('img');img.src=urls[0];img.alt=auction.title+' — cover photo';img.loading='lazy';
 const open=button('', 'View '+urls.length+' photo'+(urls.length===1?'':'s')+' of '+auction.title,()=>openGallery(urls,auction.title,index,open));open.className='photoOpen';open.append(img);holder.append(open);
 const bar=document.createElement('div');bar.className='photoBar';const count=document.createElement('span');
 const update=()=>{img.src=urls[index];img.alt=auction.title+' — photo '+(index+1)+' of '+urls.length;count.textContent=(index+1)+' / '+urls.length+' · Tap to enlarge';};
 if(urls.length>1)bar.append(button('←','Previous listing photo',()=>{index=(index+urls.length-1)%urls.length;update();}));bar.append(count);
 if(urls.length>1)bar.append(button('→','Next listing photo',()=>{index=(index+1)%urls.length;update();}));update();holder.append(bar);return holder;
}
