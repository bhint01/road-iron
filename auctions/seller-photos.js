export async function preparePhoto(file) {
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPG, PNG or WebP photo. If your phone uses HEIC, export it as JPG first.');
 if(file.size>20*1024*1024)throw new Error('Choose a photo smaller than 20 MB.');
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();img.src=url;await img.decode();
  if(!img.naturalWidth||!img.naturalHeight)throw new Error('This photo could not be opened. Choose another photo.');
  const scale=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.85));
  if(!blob||blob.size>5*1024*1024)throw new Error('Could not prepare this photo. Try a smaller photo.');
  return blob;
 }finally{URL.revokeObjectURL(url);}
}
export async function uploadPhoto(db,userId,blob) {
 const path=userId+'/'+crypto.randomUUID()+'.jpg';
 const bucket=db.storage.from('auction-photos');
 const {error}=await bucket.upload(path,blob,{contentType:'image/jpeg',upsert:false});
 if(error)throw new Error('Photo upload failed: '+error.message);
 return {path,url:bucket.getPublicUrl(path).data.publicUrl};
}
