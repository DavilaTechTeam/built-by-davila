(()=>{
'use strict';
let dialog,previewImage,message,title,activeUrl='',controller,requestNumber=0;
function release(){controller?.abort();controller=null;if(activeUrl){URL.revokeObjectURL(activeUrl);activeUrl='';}if(previewImage)previewImage.removeAttribute('src');}
function setup(){
 if(dialog)return;
 const style=document.createElement('style');style.textContent='.bbd-file-preview{width:min(1000px,calc(100vw - 32px));max-height:90vh;border:1px solid #e5e1da;border-radius:20px;padding:24px;background:#f5f3ef;color:#17191c}.bbd-file-preview::backdrop{background:#0009;backdrop-filter:blur(4px)}.bbd-file-preview-head{display:flex;justify-content:space-between;align-items:center;gap:20px}.bbd-file-preview h2{font:700 20px Inter,Arial,sans-serif;overflow-wrap:anywhere;margin:8px 0}.bbd-file-preview img{display:block;max-width:100%;max-height:65vh;object-fit:contain;margin:20px auto;background:white;border-radius:10px}.bbd-file-preview img:not([src]){display:none}.bbd-file-preview button{font:700 14px Inter,Arial,sans-serif;border:1px solid #dedbd4;border-radius:24px;background:white;padding:10px 16px;cursor:pointer}.file-name-preview{border:0!important;padding:0!important;border-radius:0!important;background:transparent!important;text-align:left;font:inherit!important;color:#d84626!important;text-decoration:underline;overflow-wrap:anywhere}.file-actions{display:flex;flex-wrap:wrap;gap:8px;flex-shrink:0}';
 document.head.append(style);
 dialog=document.createElement('dialog');dialog.className='bbd-file-preview';dialog.setAttribute('aria-labelledby','bbd-preview-title');
 dialog.innerHTML='<div class="bbd-file-preview-head"><div><small>BUILT BY DAVILA</small><h2 id="bbd-preview-title"></h2></div><button type="button">Close</button></div><p role="status"></p><img alt="">';
 document.body.append(dialog);title=dialog.querySelector('h2');message=dialog.querySelector('p');previewImage=dialog.querySelector('img');
 dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{requestNumber++;release();});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
}
const tr=s=>window.bbdTranslate?window.bbdTranslate(s):s;
window.bbdPreviewProjectFile=async({url,token,name,type})=>{
 setup();release();const current=++requestNumber;title.textContent=name;previewImage.alt=name;message.textContent=tr('Loading image…');dialog.querySelector('button').textContent=tr('Close');if(!dialog.open)dialog.showModal();
 if(!['image/jpeg','image/png','image/webp'].includes(type)){message.textContent=tr('This file cannot be previewed. Please download it.');return;}
 controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),75000);
 try{
  const response=await fetch(url,{headers:{Authorization:'Bearer '+token},signal:controller.signal});if(!response.ok)throw Error('Unable to load this image.');
  const blob=await response.blob();if(current!==requestNumber||!dialog.open)return;
  activeUrl=URL.createObjectURL(new Blob([blob],{type}));previewImage.onload=()=>{if(current===requestNumber)message.textContent='';};previewImage.onerror=()=>{if(current===requestNumber)message.textContent=tr('Unable to load this image.');};previewImage.src=activeUrl;
 }catch(e){if(current===requestNumber&&dialog.open)message.textContent=tr('Unable to load this image.');}
 finally{clearTimeout(timeout);}
};
setup();
})();