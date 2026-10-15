(()=>{'use strict';
window.BBDQuoteApproval={mount({root,d,request}){
 if(d.type!=='quote')return;
 const host=root.querySelector('aside.payment');if(!host)return;
 const section=document.createElement('section');section.className='quote-approval';
 const message=document.createElement('p');message.setAttribute('role','status');message.style.cssText='font-size:13px;line-height:1.5';
 if(d.approval||d.status==='Accepted'){
  const title=document.createElement('h2');title.textContent='Quote approved';section.append(title);
  message.textContent=d.approval?.email_status==='Submitted'?'Your invoice has been submitted for email delivery.':d.approval?.email_status==='Pending'||d.approval?.email_status==='Submitting'?'Your invoice is being prepared for email delivery.':'Contact hello@builtbydavila.com if you need your invoice link.';section.append(message);host.prepend(section);return;
 }
 if(!d.approval_available)return;
 section.innerHTML='<h2>Approve your quote</h2><p style="font-size:13px;line-height:1.5">Review the full scope, complimentary services, pricing and monthly terms before approving. Approval creates your invoice. No payment is charged here.</p><label style="display:block;font-size:13px;font-weight:bold">Your full name<input name="approver_name" autocomplete="name" maxlength="200" style="display:block;width:100%;padding:12px;margin:8px 0 16px;border:1px solid #d8e0e7;border-radius:8px;box-sizing:border-box"></label><label style="display:flex;gap:9px;align-items:flex-start;font-size:13px;line-height:1.6"><input name="approve_terms" type="checkbox" style="margin-top:5px;flex-shrink:0">I approve this quote, its scope, setup pricing, deposit requirement and recurring monthly terms.</label><button type="button" class="approve-quote" disabled>Approve quote &amp; get invoice</button>';
 section.append(message);host.prepend(section);
 const name=section.querySelector('[name="approver_name"]'),consent=section.querySelector('[name="approve_terms"]'),button=section.querySelector('button');let busy=false;
 function valid(){button.disabled=busy||!consent.checked||name.value.trim().length<2;}
 name.addEventListener('input',valid);consent.addEventListener('change',valid);
 button.onclick=async()=>{if(busy||button.disabled)return;busy=true;valid();message.textContent='Saving your approval and preparing your invoice…';
  try{const result=await request('/billing-api/quotes/approve',{name:name.value.trim(),accept:consent.checked,revision:d.revision});
   const url=new URL(result.url,location.origin);if(url.origin!==location.origin||url.protocol!=='https:')throw Error('Your approval was saved. Contact Built By Davila for the invoice link.');
   section.replaceChildren();const title=document.createElement('h2');title.textContent='Quote approved';const link=document.createElement('a');link.href=url.href;link.textContent='View invoice & pay deposit';link.style.cssText='display:block;background:#ff5a36;color:white;padding:15px;border-radius:9px;text-align:center;text-decoration:none;font-weight:bold';
   message.textContent=result.email_status==='Submitted'?'Invoice submitted for email delivery.':result.email_status==='Existing invoice'?'Your existing invoice is ready below.':'Your invoice is ready below and queued for email delivery. You can pay the deposit now.';section.append(title,message,link);
  }catch(e){message.textContent=e.message;busy=false;valid();}
 };
}};
})();
