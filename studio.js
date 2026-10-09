const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const API_BASE='https://built-by-davila-backend.onrender.com';
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0));
const dateFmt=v=>v?new Date(/^\d{4}-\d{2}-\d{2}($|T00:00:00)/.test(String(v))?String(v).slice(0,10)+'T12:00:00':v).toLocaleDateString('en-US'):'—';
const esc=(v='')=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let token=sessionStorage.getItem('bbd_token')||'';

const store={clients:[],quotes:[],invoices:[],payments:[],subscriptions:[],dashboard:null};
const quotePackages={
  starter:{label:'Starter Website — $1,995',description:'Starter Website — up to 5 custom pages, mobile-first design, contact form, basic SEO setup, and 2 rounds of revisions.',price:1995,deposit:100,terms:'Full one-time build payment due before work begins. Final scope is agreed before work starts. Monthly care, domain registration, and paid software are separate unless included in the proposal.'},
  growth:{label:'Growth / Business Website — $3,995',description:'Business Website — up to 10 custom pages, custom visual direction, portfolio showcase, conversion-focused structure, analytics, and scoped integrations.',price:3995,deposit:50,terms:'50% deposit due to begin work. Remaining balance due prior to launch. Final scope and integrations are agreed before work starts. Monthly care and paid software are separate unless included in the proposal.'},
  premium:{label:'Premium Website — $5,995',description:'Premium Website — up to 20 custom pages, advanced forms, scoped CRM/calendar integrations, automation workflows, and advanced tracking.',price:5995,deposit:50,terms:'50% deposit due to begin work. Remaining balance due prior to launch. Final scope and workflows are agreed before work starts. Monthly care and paid software are separate unless included in the proposal.'}
};
let lineItems=[{package_key:'custom',description:'',quantity:1,unit_price:0}];

function setStatus(text,kind='ok'){const el=$('#api-status');if(!el)return;el.textContent=text;el.className='db-status '+kind;}
function showModal(id){const el=$('#'+id);if(!el)return;el.classList.add('show');el.setAttribute('aria-hidden','false');}
function hideModal(id){if(id==='stripe-checkout-modal'){studioCheckoutGeneration++;if(studioCheckout){studioCheckout.destroy();studioCheckout=null;}}const el=$('#'+id);if(!el)return;el.classList.remove('show');el.setAttribute('aria-hidden','true');}
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>hideModal(b.dataset.close)));
$$('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)hideModal(m.id)}));

document.addEventListener('keydown',e=>{if(e.key==='Escape')$$('.modal-backdrop.show').forEach(m=>hideModal(m.id));});

function toast(message,kind='success'){
  const stack=$('#toast-stack');
  const el=document.createElement('div');
  el.className=`studio-toast ${kind}`;
  el.innerHTML=`<div class="toast-dot"></div><div>${esc(message)}</div>`;
  stack.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('show'));
  setTimeout(()=>{
    el.classList.remove('show');
    setTimeout(()=>el.remove(),220);
  },3400);
}

let confirmResolver=null;
function studioConfirm({title='Confirm action',message='',confirmText='Continue'}={}){
  $('#confirm-title').textContent=title;
  $('#confirm-message').textContent=message;
  $('#confirm-ok').textContent=confirmText;
  showModal('confirm-modal');
  return new Promise(resolve=>{confirmResolver=resolve;});
}
$('#confirm-ok').onclick=()=>{
  hideModal('confirm-modal');
  if(confirmResolver){confirmResolver(true);confirmResolver=null;}
};
$('#confirm-cancel').onclick=()=>{
  hideModal('confirm-modal');
  if(confirmResolver){confirmResolver(false);confirmResolver=null;}
};


async function rawFetch(path,options={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),75000);
  try{
    const headers={'Content-Type':'application/json',...(options.headers||{})};
    if(token) headers.Authorization=`Bearer ${token}`;
    return await fetch(API_BASE+path,{...options,headers,signal:controller.signal});
  }finally{clearTimeout(timer)}
}
async function api(path,options={}){
  setStatus('Working…','loading');
  let r;
  try{r=await rawFetch(path,options);}
  catch(e){setStatus('Server unavailable','error');throw new Error(e.name==='AbortError'?'Server took too long to respond.':e.message)}
  const data=await r.json().catch(()=>({}));
  if(r.status===401){
    token='';sessionStorage.removeItem('bbd_token');showAuth();
    throw new Error(data.error||'Authentication required.');
  }
  if(!r.ok){setStatus('Action failed','error');throw new Error(data.error||`HTTP ${r.status}`)}
  setStatus('Live database','ok');return data;
}

async function initAuth(){
  showAuth();
  if(!token)return false;
  try{
    const r=await rawFetch('/api/auth/session');
    const data=await r.json();
    if(!r.ok || data.authenticated!==true || data.role!=='admin'){
      if(r.status===401){token='';sessionStorage.removeItem('bbd_token');}
      $('#login-message').textContent=data.error||'Please sign in again.';
      return false;
    }
    hideAuth();return true;
  }catch{$('#login-message').textContent='Unable to verify your session. Please try again.';return false;}
}
function showAuth(){$('.app').style.display='none';$('#auth-screen').classList.remove('hidden');$('#login-password').focus();}
function hideAuth(){$('#auth-screen').classList.add('hidden');$('.app').style.display='';}
$('#login-form').addEventListener('submit',async e=>{
  e.preventDefault();const msg=$('#login-message');msg.textContent='Signing in…';
  try{
    const data=await rawFetch('/api/auth/login',{method:'POST',body:JSON.stringify({password:$('#login-password').value})}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||'Login failed');return d});
    if(!data.token)throw new Error('Administrator login is unavailable.');token=data.token;sessionStorage.setItem('bbd_token',token)
    hideAuth();msg.textContent='';await loadAll();
  }catch(err){msg.textContent=err.message;msg.className='form-message error'}
});

function nav(view){
  $$('.side button[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===view));
  const btn=$(`.side button[data-view="${view}"]`);
  $('#page-title').textContent=btn?btn.textContent.trim():'Studio';
}
$$('.side button[data-view]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.view)));
$('#top-new-quote').addEventListener('click',()=>nav('quote-builder'));
$$('.go-new-quote').forEach(b=>b.addEventListener('click',()=>nav('quote-builder')));

async function loadAll(){
  setStatus('Waking server…','loading');
  try{
    const [clients,quotes,invoices,payments,subscriptions,dashboard]=await Promise.all([
      api('/api/clients'),api('/api/quotes'),api('/api/invoices'),api('/api/payments'),api('/api/subscriptions'),api('/api/dashboard')
    ]);
    Object.assign(store,{clients,quotes,invoices,payments,subscriptions,dashboard});
    renderAll();
  }catch(err){console.error(err);setStatus('Could not load','error')}
}
async function reload(resource){
  store[resource]=await api('/api/'+resource);
  try{store.dashboard=await api('/api/dashboard')}catch{}
  renderAll();
}

function contactName(c){return [c.contact_first_name,c.contact_last_name].filter(Boolean).join(' ')||'—'}
function badge(status){return `<span class="badge ${esc(String(status||'').toLowerCase().replaceAll(' ','-'))}">${esc(status||'—')}</span>`}
function clientOptions(selected=''){return `<option value="">Select a client</option>`+store.clients.map(c=>`<option value="${c.id}" ${c.id===selected?'selected':''}>${esc(c.company_name)}</option>`).join('')}

function renderClients(list=store.clients){
  $('#client-body').innerHTML=list.length?list.map(c=>`<tr><td><a href="client-workspace.html?client=${encodeURIComponent(c.id)}" style="color:inherit;font-weight:800;text-decoration:none">${esc(c.company_name)} ↗</a></td><td>${esc(contactName(c))}</td><td>${esc(c.email||'—')}</td><td>${esc(c.phone||'—')}</td><td>${badge(c.status)}</td><td class="actions-cell"><a class="mini-btn" href="client-workspace.html?client=${encodeURIComponent(c.id)}">Open Client</a></td></tr>`).join(''):`<tr><td colspan="6">No clients yet.</td></tr>`;
  $('#qb-client').innerHTML=clientOptions($('#qb-client').value);$('#sf-client').innerHTML=clientOptions();
}
async function clientPortal(button,open){
 const tab=open?window.open('about:blank','_blank'):null;
 if(tab)tab.opener=null;
 button.disabled=true;
 try{
  const r=await api('/api/clients/'+button.dataset.id+'/portal-link',{method:'POST',body:'{}'});
  const url=new URL(r.url);
  if(url.origin!==location.origin||(url.pathname!=='/customer-login.html'||!(/^[A-Za-z0-9_-]{43}$/).test(new URLSearchParams(url.hash.slice(1)).get('invite')||'')))throw new Error('Invalid customer portal link.');
  const holder=[...$$('.client-portal-link')].find(el=>el.dataset.id===button.dataset.id);
  if(holder){holder.innerHTML='';const link=document.createElement('a');link.className='mini-btn';link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open portal ↗';holder.append(link);}
  if(open){if(tab)tab.location.replace(url.href);else toast('Use the Open portal link in this client row.');}
  else{try{await navigator.clipboard.writeText(url.href);toast('Customer invitation copied. Valid for 7 days.');}catch{toast('Right-click Open portal and choose Copy Link Address.');}}
 }catch(e){if(tab)tab.close();toast(e.message,'error');}
 finally{button.disabled=false;}
}


async function openClientMaterials(id){
 const client=store.clients.find(c=>c.id===id);if(!client)return;
 let modal=$('#client-materials-modal');
 if(!modal){modal=document.createElement('div');modal.id='client-materials-modal';modal.className='modal-backdrop';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','materials-title');modal.innerHTML='<div class="client-modal detail-modal"><div class="modal-header"><h2 id="materials-title"></h2><button type="button" class="close-modal" aria-label="Close project materials">×</button></div><div id="materials-content"></div></div>';document.body.append(modal);modal.querySelector('.close-modal').onclick=()=>hideModal('client-materials-modal');modal.onclick=e=>{if(e.target===modal)hideModal('client-materials-modal')};}
 $('#materials-title').textContent=client.company_name+' — Project details & files';$('#materials-content').textContent='Loading…';showModal('client-materials-modal');
 try{
  const d=await api('/api/clients/'+id+'/project-materials');
  $('#materials-content').innerHTML='<div class="detail-section"><h4>Project questionnaire</h4>'+(d.intake?Object.entries(d.intake.answers).filter(([,v])=>v).map(([k,v])=>'<p><strong>'+esc(k.replaceAll('_',' '))+'</strong><br>'+esc(v).replaceAll('\n','<br>')+'</p>').join('')||'<p>No answers entered yet.</p>':'<p>The customer has not saved their project details yet.</p>')+'</div><div class="detail-section"><h4>Customer uploads</h4>'+(d.uploads.map(f=>'<p><strong>'+esc(f.filename)+'</strong> · '+esc(f.category)+' · '+(Number(f.size_bytes)/1024/1024).toFixed(2)+' MB <button class="mini-btn" data-material-file="'+esc(f.id)+'" data-name="'+esc(f.filename)+'">Download</button></p>').join('')||'<p>No files uploaded yet.</p>')+'</div>';
  $$('#materials-content [data-material-file]').forEach(button=>button.onclick=async()=>{
   button.disabled=true;
   try{const response=await fetch(API_BASE+'/api/client-uploads/'+button.dataset.materialFile,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(75000)});if(!response.ok)throw Error('Unable to download file.');const url=URL.createObjectURL(await response.blob()),a=document.createElement('a');a.href=url;a.download=button.dataset.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
   catch(e){toast(e.message,'error')}finally{button.disabled=false;}
  });
 }catch(e){$('#materials-content').textContent=e.message;}
}

function renderQuotes(){
  $('#quote-body').innerHTML=store.quotes.length?store.quotes.map(q=>`<tr>
    <td><strong>${esc(q.quote_number)}</strong></td><td>${esc(q.company_name)}</td><td>${money(q.total)}</td><td>${Number(q.deposit_percent||0)}%</td><td>${badge(q.status)}</td><td>${dateFmt(q.created_at)}</td>
    <td class="actions-cell">
      <button class="mini-btn view-quote" data-id="${q.id}">View</button>
      ${q.status!=='Accepted'?`<button class="mini-btn quote-status" data-id="${q.id}" data-status="Sent">Mark Sent</button>`:''}
      <button class="mini-btn primary-mini convert-quote" data-id="${q.id}">Create Invoice</button>
    </td>
  </tr>`).join(''):`<tr><td colspan="7">No quotes yet.</td></tr>`;
  $$('.view-quote').forEach(b=>b.onclick=()=>openQuoteDetail(b.dataset.id));
  $$('.quote-status').forEach(b=>b.onclick=async()=>{try{await api('/api/quotes/'+b.dataset.id,{method:'PATCH',body:JSON.stringify({status:b.dataset.status})});await reload('quotes');toast('Quote updated.')}catch(e){toast(e.message,'error')}});
  $$('.convert-quote').forEach(b=>b.onclick=()=>convertQuote(b.dataset.id));
}
function invoiceDisplay(i){
  const cents=Number(i.sandbox_paid_cents || i.sandbox_payments?.reduce((sum,p)=>sum+Number(p.amount_cents),0) || 0);
  if(i.client_id!=='9756cec8-8fbb-4614-b259-6853df83581a'||cents<=0||i.status==='Void')return i;
  const paid=Math.min(Number(i.total),cents/100);
  return {...i,real_amount_paid:i.real_amount_paid??i.amount_paid,amount_paid:paid,balance_due:Math.max(0,Number(i.total)-paid),status:paid>=Number(i.total)?'Paid (Test)':'Partially Paid (Test)'};
}
function renderInvoices(){
  $('#invoice-body').innerHTML=store.invoices.length?store.invoices.map(invoiceDisplay).map(i=>`<tr>
    <td><strong>${esc(i.invoice_number)}</strong></td><td>${esc(i.company_name)}</td><td>${money(i.total)}</td><td>${money(i.amount_paid)}</td><td>${money(i.balance_due)}</td><td>${badge(i.status)}</td><td>${dateFmt(i.due_date)}</td>
    <td class="actions-cell">
      <button class="mini-btn view-invoice" data-id="${i.id}">View</button>
      ${checkoutAvailable(i)?`<button class="mini-btn primary-mini checkout-invoice" data-id="${i.id}">${esc(checkoutLabel(i))}</button>`:''}
    </td>
  </tr>`).join(''):`<tr><td colspan="8">No invoices yet.</td></tr>`;
  $$('.view-invoice').forEach(b=>b.onclick=()=>openInvoiceDetail(b.dataset.id));
  $$('.checkout-invoice').forEach(b=>b.onclick=async()=>{try{const i=invoiceDisplay(await api('/api/invoices/'+b.dataset.id));await openStudioCheckout(i,isTestInvoice(i),depositDue(i)>=0.5?'deposit':'balance')}catch(e){toast(e.message,'error')}});
}
function isTestInvoice(i){return i.client_id==='9756cec8-8fbb-4614-b259-6853df83581a'}
function depositDue(i){return Math.min(Number(i.balance_due),Math.max(0,Math.round(Number(i.total)*Number(i.deposit_percent||0))/100-Number(i.amount_paid)))}
function checkoutAvailable(i){return Number(i.balance_due)>=0.5&&!['Void','Draft','Paid','Paid (Test)'].includes(i.status)}
function checkoutLabel(i){const deposit=depositDue(i);return (isTestInvoice(i)?'Test: ':'')+(deposit>=0.5?'Pay Deposit ':'Pay Balance ')+money(deposit>=0.5?deposit:i.balance_due)}
function renderPayments(){
  $('#payment-body').innerHTML=store.payments.length?store.payments.map(p=>`<tr>
    <td>${dateFmt(p.paid_at||p.created_at)}</td><td>${esc(p.company_name)}</td><td>${esc(p.invoice_number||'—')}</td><td>${esc(p.type)}</td><td>${esc(p.method)}</td><td>${money(p.amount)}</td><td>${badge(p.status)}</td>
  </tr>`).join(''):`<tr><td colspan="7">No payments recorded yet.</td></tr>`;
}
function renderSubs(){
  $('#subs-list').innerHTML=store.subscriptions.length?`<div class="sub-grid">`+store.subscriptions.map(s=>`<div class="subscription-card live-sub">
    <div><strong>${esc(s.company_name)}</strong><div class="sub-name">${esc(s.plan_name)}</div><div class="sub-next">Next billing: ${dateFmt(s.next_billing_at)}</div></div>
    <div class="sub-right"><strong>${money(s.amount)}/mo</strong>${badge(s.status)}${s.status==='Active'?`<button class="mini-btn sub-pause" data-id="${s.id}">Pause</button>`:`<button class="mini-btn sub-activate" data-id="${s.id}">Activate</button>`}</div>
  </div>`).join('')+`</div>`:`<div class="empty-state">No recurring plans yet.</div>`;
  $$('.sub-pause').forEach(b=>b.onclick=()=>updateSub(b.dataset.id,'Paused'));
  $$('.sub-activate').forEach(b=>b.onclick=()=>updateSub(b.dataset.id,'Active'));
}
function renderDashboard(){
  const d=store.dashboard||{};
  $('#metric-revenue').textContent=money(d.payments_received||0);
  $('#metric-mrr').textContent=money(d.monthly_recurring_revenue||0);
  $('#metric-open').textContent=Number(d.open_invoices||0);
  $('#metric-quotes').textContent=Number(d.total_quotes||0);
  const recent=d.recent_invoices||store.invoices.slice(0,5);
  $('#dash-invoices').innerHTML=recent.map(i=>`<tr><td>${esc(i.invoice_number)}</td><td>${esc(i.company_name)}</td><td>${money(i.total)}</td><td>${money(i.balance_due)}</td><td>${badge(i.status)}</td></tr>`).join('')||`<tr><td colspan="5">No invoices yet.</td></tr>`;
  const active=d.active_subscriptions||store.subscriptions.filter(s=>s.status==='Active').slice(0,5);
  $('#dash-subs').innerHTML=active.map(s=>`<div class="subscription-card"><div><strong>${esc(s.company_name)}</strong><div class="sub-name">${esc(s.plan_name)}</div></div><div class="sub-right"><strong>${money(s.amount)}/mo</strong>${badge(s.status)}</div></div>`).join('')||`<div class="empty-state">No active recurring plans.</div>`;
}
function renderAll(){renderClients();renderQuotes();renderInvoices();renderPayments();renderSubs();renderDashboard();updatePreview();renderStripeReceipts()}

async function renderStripeReceipts(){
 const statusEl=$('#stripe-status');if(!statusEl)return;
 let panel=$('#stripe-receipts');
 if(!panel){panel=document.createElement('div');panel.id='stripe-receipts';panel.className='panel';$('#payments').append(panel);}
 try{
  const [status,receipts]=await Promise.all([api('/api/stripe/status'),api('/api/stripe/receipts')]);
  statusEl.textContent=status.configured?`Stripe webhook configured (${status.mode}). Refresh after payment to see the latest records.`:'Stripe webhook awaits activation. Manual payment recording remains available.';
  panel.innerHTML='<h3>Stripe payments needing review</h3>'+ (receipts.length?receipts.map(r=>`<div class="detail-line"><div><strong>${money(Number(r.amount_cents)/100)} ${esc(r.currency.toUpperCase())}</strong><small>${esc(r.customer_email||'No email')} • ${esc(r.session_id)}</small><select data-receipt="${esc(r.session_id)}"><option value="">Choose invoice after verifying the customer</option>${store.invoices.filter(i=>!['Void','Draft','Paid'].includes(i.status)&&Number(i.balance_due)>=Number(r.amount_cents)/100).map(i=>`<option value="${esc(i.id)}">${esc(i.invoice_number)} — ${esc(i.company_name)}</option>`).join('')}</select></div><button class="btn secondary" data-assign="${esc(r.session_id)}">Assign payment</button></div>`).join(''):'<p>No unassigned Stripe payments.</p>');
  panel.querySelectorAll('[data-assign]').forEach(b=>b.onclick=async()=>{
   const select=Array.from(panel.querySelectorAll('[data-receipt]')).find(s=>s.dataset.receipt===b.dataset.assign);
   if(!select.value)return toast('Choose an invoice first.','error');
   if(!await studioConfirm({title:'Assign Stripe payment',message:'Confirm that this Stripe receipt belongs to the selected customer and invoice.',confirmText:'Assign payment'}))return;
   try{await api('/api/stripe/receipts/'+encodeURIComponent(b.dataset.assign)+'/assign',{method:'POST',body:JSON.stringify({invoice_id:select.value})});await loadAll();toast('Stripe payment assigned.');}catch(e){toast(e.message,'error')}
  });
 }catch(e){statusEl.textContent=e.message;panel.textContent='Stripe receipts unavailable.';}
}

/* Client modal */
function openClient(id=''){
  $('#client-form').reset();$('#cf-id').value='';$('#cf-status').value='Lead';$('#client-form-message').textContent='';
  $('#client-modal-title').textContent=id?'Edit Client':'Add Client';
  if(id){
    const c=store.clients.find(x=>x.id===id);if(!c)return;
    $('#cf-id').value=c.id;$('#cf-company').value=c.company_name||'';$('#cf-status').value=c.status||'Active';
    $('#cf-first').value=c.contact_first_name||'';$('#cf-last').value=c.contact_last_name||'';$('#cf-email').value=c.email||'';
    $('#cf-billing-email').value=c.billing_email||'';$('#cf-phone').value=c.phone||'';$('#cf-website').value=c.website||'';$('#cf-notes').value=c.notes||'';
  }
  let deleteBtn=$('#client-delete-btn');
  if(deleteBtn) deleteBtn.remove();
  if(id){
    const btn=document.createElement('button');
    btn.type='button';btn.id='client-delete-btn';btn.className='btn danger';btn.textContent='Delete Client';
    btn.onclick=()=>deleteClient(id);
    $('#client-form .modal-actions').prepend(btn);
  }
  showModal('client-modal');setTimeout(()=>$('#cf-company').focus(),60);
}
$('#add-client').onclick=()=>openClient();
$('#refresh-clients').onclick=()=>reload('clients');
$('#client-search').oninput=e=>{const q=e.target.value.toLowerCase().trim();renderClients(!q?store.clients:store.clients.filter(c=>[c.company_name,c.contact_first_name,c.contact_last_name,c.email,c.phone,c.status].filter(Boolean).join(' ').toLowerCase().includes(q)))};
$('#client-form').onsubmit=async e=>{
  e.preventDefault();const id=$('#cf-id').value,msg=$('#client-form-message'),btn=$('#save-client-btn');
  const payload={company_name:$('#cf-company').value.trim(),status:$('#cf-status').value,contact_first_name:$('#cf-first').value.trim(),contact_last_name:$('#cf-last').value.trim(),email:$('#cf-email').value.trim(),billing_email:$('#cf-billing-email').value.trim(),phone:$('#cf-phone').value.trim(),website:$('#cf-website').value.trim(),notes:$('#cf-notes').value.trim()};
  try{btn.disabled=true;btn.textContent='Saving…';msg.textContent='Saving to live database…';await api(id?'/api/clients/'+id:'/api/clients',{method:id?'PATCH':'POST',body:JSON.stringify(payload)});await reload('clients');hideModal('client-modal')}
  catch(err){msg.textContent=err.message;msg.className='form-message error'}finally{btn.disabled=false;btn.textContent='Save Client'}
};


async function deleteClient(id){
  const c=store.clients.find(x=>x.id===id);
  if(!c)return;
  const ok=await studioConfirm({
    title:'Delete Client',
    message:`Delete ${c.company_name}? Clients with quotes, invoices, payments, or subscriptions cannot be deleted and should be marked Inactive instead.`,
    confirmText:'Delete Client'
  });
  if(!ok)return;
  try{
    await api('/api/clients/'+id,{method:'DELETE'});
    hideModal('client-modal');
    await reload('clients');
    toast(`${c.company_name} deleted.`);
  }catch(e){toast(e.message,'error')}
}

/* Quote Builder */
function renderLines(){
  $('#line-items').innerHTML=lineItems.map((l,i)=>`<div class="line-row rich-line">
    <label style="grid-column:1 / -1">Service / Package
      <select data-package="${i}" style="width:100%;margin-top:6px" aria-label="Service or package for line ${i+1}">
        <option value="custom" ${!quotePackages[l.package_key]?'selected':''}>Custom Item — enter description and price</option>
        ${Object.entries(quotePackages).map(([key,p])=>`<option value="${key}" ${l.package_key===key?'selected':''}>${esc(p.label)}</option>`).join('')}
      </select>
    </label>
    <input class="line-desc" data-desc="${i}" value="${esc(l.description)}" placeholder="Service description">
    <input class="line-qty" data-qty="${i}" type="number" min="0.01" step="0.01" value="${l.quantity}">
    <input class="line-price" data-price="${i}" type="number" min="0" step="0.01" value="${l.unit_price}">
    <button class="btn secondary line-delete" data-del="${i}" type="button">×</button>
  </div>`).join('');
  $$('[data-package]').forEach(el=>el.onchange=e=>{
    const index=Number(e.target.dataset.package),key=e.target.value,item=lineItems[index],pkg=quotePackages[key];
    item.package_key=key;
    if(pkg){
      item.description=pkg.description;item.quantity=1;item.unit_price=pkg.price;
      if(index===0){$('#qb-deposit').value=pkg.deposit;$('#qb-notes').value=pkg.terms;}
    }
    renderLines();updatePreview();
  });
  $$('[data-desc]').forEach(el=>el.oninput=e=>{lineItems[+e.target.dataset.desc].description=e.target.value;updatePreview()});
  $$('[data-qty]').forEach(el=>el.oninput=e=>{lineItems[+e.target.dataset.qty].quantity=Number(e.target.value);updatePreview()});
  $$('[data-price]').forEach(el=>el.oninput=e=>{lineItems[+e.target.dataset.price].unit_price=Number(e.target.value);updatePreview()});
  $$('[data-del]').forEach(el=>el.onclick=e=>{if(lineItems.length>1){lineItems.splice(+e.target.dataset.del,1);renderLines();updatePreview()}});
}
function proposalTotals(){
  const subtotal=Math.round(lineItems.reduce((sum,item)=>sum+Math.round(Number(item.quantity)*Number(item.unit_price)*100)/100,0)*100)/100;
  const type=$('#qb-discount-type').value,value=Number($('#qb-discount-value').value);
  if(!Number.isFinite(subtotal)||subtotal<0||lineItems.some(i=>!Number.isFinite(Number(i.quantity))||Number(i.quantity)<=0||!Number.isFinite(Number(i.unit_price))||Number(i.unit_price)<0))throw new Error('Enter valid quantities and nonnegative service prices.');
  if(type!=='none'&&(!Number.isFinite(value)||value<0||(type==='percent'&&value>100)||(type==='fixed'&&value>subtotal)))throw new Error('Discount must be between zero and the subtotal (or 0–100%).');
  const discount=Math.round((type==='percent'?subtotal*value/100:type==='fixed'?value:0)*100)/100;
  return {subtotal,discount,total:Math.round((subtotal-discount)*100)/100,type,value};
}
function proposalItems(){
  const totals=proposalTotals();
  const items=lineItems.map(({description,quantity,unit_price})=>({description,quantity,unit_price}));
  if(totals.discount>0)items.push({description:($('#qb-discount-label').value.trim()||'Discount')+(totals.type==='percent'?' ('+totals.value+'%)':''),quantity:1,unit_price:-totals.discount});
  return items;
}
function syncPaymentTerms(){
  const field=$('#qb-notes'),percent=Number($('#qb-deposit').value);
  if(!Number.isFinite(percent)||percent<0||percent>100)return;
  const opening=/^(?:\d+(?:\.\d+)?% deposit due to begin work\. Remaining balance due prior to launch\.|Full one-time build payment due before work begins\.|No deposit required\. Full payment due prior to launch\.)/;
  const text=percent===100?'Full one-time build payment due before work begins.':percent===0?'No deposit required. Full payment due prior to launch.':percent+'% deposit due to begin work. Remaining balance due prior to launch.';
  if(opening.test(field.value))field.value=field.value.replace(opening,text);
}

function updatePreview(){
  syncPaymentTerms();
  const c=store.clients.find(x=>x.id===$('#qb-client').value);
  $('#pv-client').textContent=c?.company_name||'Select a client';
  let totals;try{totals=proposalTotals()}catch(e){$('#pv-total').textContent=e.message;return;}const total=totals.total,dep=Number($('#qb-deposit').value||0);$('#pv-subtotal').textContent=money(totals.subtotal);$('#pv-discount').textContent='−'+money(totals.discount);
  $('#pv-lines').innerHTML=lineItems.map(l=>`<div class="preview-line"><span>${esc(l.description)} × ${Number(l.quantity||0)}</span><strong>${money(Number(l.quantity||0)*Number(l.unit_price||0))}</strong></div>`).join('');
  $('#pv-total').textContent=money(total);$('#pv-deposit').textContent=money(total*dep/100);$('#pv-balance').textContent=money(total-total*dep/100);
}
$('#add-line').onclick=()=>{lineItems.push({package_key:'custom',description:'',quantity:1,unit_price:0});renderLines();updatePreview()};
$('#qb-client').onchange=updatePreview;$('#qb-deposit').oninput=updatePreview;['qb-discount-type','qb-discount-value','qb-discount-label'].forEach(id=>$('#'+id).addEventListener('input',updatePreview));
$('#clear-quote').onclick=()=>{lineItems=[{package_key:'custom',description:'',quantity:1,unit_price:0}];$('#qb-notes').value='50% deposit due to begin work. Remaining balance due prior to launch. Scope changes may require a revised quote.';$('#qb-client').value='';$('#qb-deposit').value=50;$('#qb-discount-type').value='none';$('#qb-discount-value').value=0;$('#qb-discount-label').value='Discount';renderLines();updatePreview()};
async function saveQuote(status){
  const client_id=$('#qb-client').value;if(!client_id)return toast('Select a client first.','error');
  if(!lineItems.length)return toast('Add at least one line item.','error');
  if(lineItems.some(item=>!item.description.trim()))return toast('Enter a description for every line item.','error');
  try{
    const q=await api('/api/quotes',{method:'POST',body:JSON.stringify({client_id,status,deposit_percent:Number($('#qb-deposit').value||0),notes:$('#qb-notes').value,items:proposalItems()})});
    await reload('quotes');toast(`${q.quote_number} saved to the live database.`);nav('quotes');$('#clear-quote').click();
  }catch(e){toast(e.message,'error')}
}
$('#save-quote').onclick=()=>saveQuote('Draft');$('#save-send-quote').onclick=()=>saveQuote('Sent');

async function convertQuote(id){
  const q=store.quotes.find(x=>x.id===id);
  if(!q)return;

  const due=new Date();
  due.setDate(due.getDate()+14);

  try{
    setStatus('Creating invoice…','loading');
    const inv=await api('/api/invoices/from-quote/'+id,{
      method:'POST',
      body:JSON.stringify({due_date:due.toISOString().slice(0,10)})
    });

    const [quotes,invoices]=await Promise.all([
      api('/api/quotes'),
      api('/api/invoices')
    ]);
    store.quotes=quotes;
    store.invoices=invoices;
    renderAll();
    toast(`${inv.invoice_number} created successfully.`);
    nav('invoices');
    hideModal('quote-detail-modal');
    await openInvoiceDetail(inv.id);
  }catch(e){
    console.error(e);
    toast(e.message,'error');
  }
}



/* Proposal message composer */
function quoteMessage(q,c){
  const total=Number(q.total),deposit=Math.round(total*Number(q.deposit_percent||0))/100;
  const name=c.contact_first_name||c.company_name||q.company_name||'there';
  return [
    'Hi '+name+',',
    '',
    'Here is our website proposal for '+q.company_name+' ('+q.quote_number+'):',
    '',
    ...(q.items||[]).map(it=>it.description+': '+money(it.amount)),
    '',
    'Total project: '+money(total),
    'Initial payment ('+Number(q.deposit_percent||0)+'%): '+money(deposit),
    'Remaining balance: '+money(total-deposit),
    '',
    q.notes||'',
    '',
    'Please let me know if you have any questions or would like to move forward.',
    '',
    'Joaquin Davila',
    'Built by Davila',
    'https://builtbydavila.com'
  ].join('\n');
}
function whatsappURL(phone,message){
  const digits=String(phone).replace(/[^0-9]/g,'');
  if(digits.length<8||digits.length>15)throw new Error('Enter the client phone number with its country code (for example, 1 followed by the US number).');
  return 'https://wa.me/'+digits+'?text='+encodeURIComponent(message);
}
function attachQuoteComposer(q){
  const c=store.clients.find(c=>c.id===q.client_id)||{};
  const section=document.createElement('div');section.className='detail-section';
  section.innerHTML=`<h4>Proposal message</h4>
    <label for="qm-phone">WhatsApp number (include country code)</label>
    <input id="qm-phone" type="tel" style="width:100%;margin:8px 0 16px" value="${esc(c.phone||'')}" placeholder="1 + US phone number">
    <label for="qm-message">Message — edit before sharing</label>
    <textarea id="qm-message" rows="12" style="width:100%;margin:8px 0 16px"></textarea>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn secondary" id="qm-copy">Copy Message</button><button class="btn primary" id="qm-whatsapp">Open in WhatsApp</button></div>
    <p style="font-size:13px">Review the recipient and tap Send in WhatsApp. Opening a chat does not mark this quote as sent. Message edits stay here until you close this quote.</p>`;
  $('#qd-content').appendChild(section);
  $('#qm-message').value=quoteMessage(q,c);
  $('#qm-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('#qm-message').value);toast('Message copied.')}catch{toast('Select the message and copy it manually.','error')}};
  $('#qm-whatsapp').onclick=()=>{
    try{
      const message=$('#qm-message').value.trim();if(!message)throw new Error('Enter a message first.');
      const url=whatsappURL($('#qm-phone').value,message);
      window.open(url,'_blank','noopener,noreferrer');
    }catch(e){toast(e.message,'error')}
  };
}

async function openQuoteDetail(id){
  try{
    const q=await api('/api/quotes/'+id);
    $('#qd-title').textContent=q.quote_number;
    $('#qd-subtitle').textContent=`${q.company_name} • ${dateFmt(q.created_at)} • ${q.status}`;
    $('#qd-content').innerHTML=`
      <div class="detail-summary">
        <div><span>Total</span><strong>${money(q.total)}</strong></div>
        <div><span>Deposit</span><strong>${Number(q.deposit_percent||0)}%</strong></div>
        <div><span>Status</span>${badge(q.status)}</div>
      </div>
      <div class="detail-section"><h4>Line Items</h4>
        ${(q.items||[]).map(it=>`<div class="detail-line"><div><strong>${esc(it.description)}</strong><small>${Number(it.quantity)} × ${money(it.unit_price)}</small></div><strong>${money(it.amount)}</strong></div>`).join('')}
      </div>
      <div class="detail-section"><h4>Notes / Terms</h4><p>${esc(q.notes||'No notes.')}</p></div>`;
    $('#qd-actions').innerHTML=`
      ${['Draft','Declined','Expired'].includes(q.status)?`<button class="btn danger" id="qd-delete">Delete Quote</button>`:''}
      ${q.status!=='Accepted'?`<button class="btn secondary" id="qd-sent">Mark Sent</button><button class="btn primary" id="qd-convert">Create Invoice</button>`:''}`;
    if($('#qd-delete')) $('#qd-delete').onclick=()=>deleteQuote(q.id,q.quote_number);
    if($('#qd-sent')) $('#qd-sent').onclick=async()=>{try{await api('/api/quotes/'+q.id,{method:'PATCH',body:JSON.stringify({status:'Sent'})});hideModal('quote-detail-modal');await reload('quotes');toast('Quote marked Sent.')}catch(e){toast(e.message,'error')}};
    if($('#qd-convert')) $('#qd-convert').onclick=()=>{hideModal('quote-detail-modal');convertQuote(q.id)};
    attachQuoteComposer(q);
    attachEmailComposer(q,'quote');
    showModal('quote-detail-modal');
  }catch(e){toast(e.message,'error')}
}
async function deleteQuote(id,number){
  const ok=await studioConfirm({title:'Delete Quote',message:`Delete ${number}? This is only allowed for unused draft/declined/expired quotes.`,confirmText:'Delete Quote'});
  if(!ok)return;
  try{
    await api('/api/quotes/'+id,{method:'DELETE'});
    hideModal('quote-detail-modal');
    await reload('quotes');
    toast(`${number} deleted.`);
  }catch(e){toast(e.message,'error')}
}

async function openInvoiceDetail(id){
  try{
    const i=invoiceDisplay(await api('/api/invoices/'+id));
    $('#id-title').textContent=i.invoice_number;
    $('#id-subtitle').textContent=`${i.company_name} • ${i.status} • Due ${dateFmt(i.due_date)}`;
    $('#id-content').innerHTML=`
      <div class="detail-summary four">
        <div><span>Total</span><strong>${money(i.total)}</strong></div>
        <div><span>Paid</span><strong>${money(i.amount_paid)}</strong></div>
        <div><span>Balance</span><strong>${money(i.balance_due)}</strong></div>
        <div><span>Status</span>${badge(i.status)}</div>
      </div>
      <div class="detail-section"><h4>Line Items</h4>
        ${(i.items||[]).map(it=>`<div class="detail-line"><div><strong>${esc(it.description)}</strong><small>${Number(it.quantity)} × ${money(it.unit_price)}</small></div><strong>${money(it.amount)}</strong></div>`).join('')}
      </div>
      <div class="detail-section"><h4>Payment History</h4>
        ${(i.payments||[]).length?(i.payments||[]).map(p=>`<div class="detail-line"><div><strong>${esc(p.type)} • ${esc(p.method)}</strong><small>${dateFmt(p.paid_at||p.created_at)}${p.reference?` • ${esc(p.reference)}`:''}</small></div><strong>${money(p.amount)}</strong></div>`).join(''):'<p>No payments recorded.</p>'}
      </div>`;
    attachEmailComposer(i,'invoice');
    const sandbox=isTestInvoice(i);
    if(sandbox){
      $('#id-content').insertAdjacentHTML('beforeend',`<div class="detail-section"><h4>Test payments</h4><p>No real money is charged. Test payments are separate from your revenue.</p><button class="btn secondary" id="id-test-refresh">Refresh Test Result</button></div>`);
      $('#id-test-refresh').onclick=async()=>{await openInvoiceDetail(i.id);await reload('invoices');toast('Test payment status refreshed.')};
    }
    const deposit=depositDue(i);
    $('#id-actions').innerHTML=`
      ${checkoutAvailable(i)?`<button class="btn primary" id="id-checkout">${esc(checkoutLabel(i))}</button>${deposit>=0.5&&deposit<Number(i.balance_due)?`<button class="btn secondary" id="id-pay-full">${sandbox?'Test: ':''}Pay Full Balance ${money(i.balance_due)}</button>`:''}`:''}
      ${Number(i.balance_due)>0&&i.status!=='Void'?`<button class="btn secondary" id="id-payment">Record Manual Payment</button>`:''}
      ${Number(i.real_amount_paid??i.amount_paid??0)===0&&i.status!=='Void'?`<button class="btn danger" id="id-void">Void Invoice</button>`:''}`;
    if(!sandbox&&checkoutAvailable(i)){
      $('#id-content').insertAdjacentHTML('beforeend',`<div class="detail-section"><h4>Customer payment link</h4><button class="btn secondary" id="id-get-portal">Get Customer Portal Link</button><p>Payment due: ${money(deposit>=0.5?deposit:i.balance_due)}. Generate a secure link to share with your customer.</p><button class="btn secondary" id="id-get-link">Get Payment Link</button><div id="id-link-result"></div></div>`);
      $('#id-get-portal').onclick=async()=>{
       const button=$('#id-get-portal');button.disabled=true;
       try{
        const r=await api('/api/clients/'+i.client_id+'/portal-link',{method:'POST',body:'{}'});
        $('#id-link-result').innerHTML='<label for="id-portal-url" style="display:block;margin-top:16px">Customer setup/reset invitation — expires in 7 days</label><input id="id-portal-url" readonly style="width:100%;margin:8px 0"><a class="btn secondary" id="id-open-portal" target="_blank" rel="noopener noreferrer">Open Customer Portal ↗</a> <button class="btn secondary" id="id-copy-portal">Copy Portal Link</button>';
        $('#id-portal-url').value=r.url;
        $('#id-open-portal').href=r.url;
        $('#id-portal-url').onclick=e=>e.target.select();
        $('#id-copy-portal').onclick=async()=>{try{await navigator.clipboard.writeText(r.url);toast('Customer invitation copied.')}catch{$('#id-portal-url').focus();$('#id-portal-url').select();toast('Press Command+C to copy the selected link.')}};
       }catch(e){toast(e.message,'error')}finally{button.disabled=false}
      };
      $('#id-get-link').onclick=()=>getCustomerPaymentLink(i,deposit>=0.5?'deposit':'balance');
    }
    if($('#id-checkout')) $('#id-checkout').onclick=()=>openStudioCheckout(i,sandbox,deposit>=0.5?'deposit':'balance');
    if($('#id-pay-full')) $('#id-pay-full').onclick=()=>openStudioCheckout(i,sandbox,'balance');
    if($('#id-payment')) $('#id-payment').onclick=()=>{hideModal('invoice-detail-modal');openPayment(i.id)};
    if($('#id-void')) $('#id-void').onclick=()=>voidInvoice(i.id,i.invoice_number);
    showModal('invoice-detail-modal');
  }catch(e){toast(e.message,'error')}
}

async function getCustomerPaymentLink(invoice,kind){
 const button=$('#id-get-link'),resultBox=$('#id-link-result');
 button.disabled=true;button.textContent='Creating payment link…';
 try{
  const result=await api('/api/invoices/'+invoice.id+'/stripe-checkout',{method:'POST',body:JSON.stringify({kind,embedded:false})});
  const url=new URL(result.url);
  if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw new Error('Stripe did not return a valid customer payment link.');
  if(!resultBox.isConnected)return;
  resultBox.innerHTML=`<label for="id-customer-link" style="display:block;margin-top:16px">Customer pays ${money(result.amount)}</label><input id="id-customer-link" readonly style="width:100%;margin:8px 0" aria-label="Customer payment link"><button class="btn secondary" id="id-copy-link">Copy Payment Link</button><p style="font-size:13px">This link expires. Generate it again if your customer needs a fresh link. Payment is recorded after Stripe confirms it.</p>`;
  $('#id-customer-link').value=url.href;
  $('#id-customer-link').onclick=e=>e.target.select();
  $('#id-copy-link').onclick=async()=>{try{await navigator.clipboard.writeText(url.href);toast('Payment link copied.')}catch{$('#id-customer-link').focus();$('#id-customer-link').select();toast('Press Command+C to copy the selected link.')}};
 }catch(e){if(resultBox.isConnected)resultBox.textContent=e.message;toast(e.message,'error')}
 finally{button.disabled=false;button.textContent='Get Payment Link'}
}

async function voidInvoice(id,number){
  const ok=await studioConfirm({title:'Void Invoice',message:`Void ${number}? This keeps the accounting record but removes it from open balances.`,confirmText:'Void Invoice'});
  if(!ok)return;
  try{
    await api('/api/invoices/'+id+'/void',{method:'POST'});
    hideModal('invoice-detail-modal');
    await reload('invoices');
    toast(`${number} voided.`);
  }catch(e){toast(e.message,'error')}
}


let studioCheckout=null,studioCheckoutGeneration=0;
async function openStudioCheckout(invoice,sandbox,kind){
 const generation=++studioCheckoutGeneration;
 if(studioCheckout){studioCheckout.destroy();studioCheckout=null;}
 $('#checkout-title').textContent=sandbox?'Test Payment':'Invoice Payment';
 $('#checkout-subtitle').textContent=invoice.invoice_number+' — Built By Davila'+(sandbox?' — Sandbox':'');
 $('#checkout-mount').innerHTML='<p style="padding:24px">Loading secure payment form…</p>';
 hideModal('invoice-detail-modal');showModal('stripe-checkout-modal');
 try{
  if(typeof Stripe!=='function')throw new Error('Stripe could not load. Refresh Studio and try again.');
  const result=await api('/api/invoices/'+invoice.id+(sandbox?'/stripe-test-link':'/stripe-checkout'),{method:'POST',body:JSON.stringify({kind,embedded:true})});
  if(generation!==studioCheckoutGeneration)return;
  const stripe=Stripe(result.publishableKey);
  const createCheckout=result.uiMode==='embedded_page'?stripe.createEmbeddedCheckoutPage.bind(stripe):stripe.initEmbeddedCheckout.bind(stripe);
  const checkout=await createCheckout({
   fetchClientSecret:async()=>result.clientSecret,
   onComplete:async()=>{
    toast('Payment submitted. Checking Stripe confirmation…');
    hideModal('stripe-checkout-modal');
    await reload('invoices');await openInvoiceDetail(invoice.id);
   }
  });
  if(generation!==studioCheckoutGeneration){checkout.destroy();return;}
  studioCheckout=checkout;$('#checkout-mount').innerHTML='';checkout.mount('#checkout-mount');
 }catch(e){if(generation===studioCheckoutGeneration){$('#checkout-mount').textContent=e.message;toast(e.message,'error');}}
}


/* Email drafts: the email app owns delivery; opening a draft never marks it sent. */
const zellePaymentEmail='jdavila@builtbydavila.com';
const zellePaymentURL='https://enroll.zellepay.com/qr-codes?data=eyJuYW1lIjoiSk9BUVVJTiBEQVZJTEEiLCJhY3Rpb24iOiJwYXltZW50IiwidG9rZW4iOiJqZGF2aWxhQGJ1aWx0YnlkYXZpbGEuY29tIn0=';
function attachEmailComposer(record,kind){
 const client=store.clients.find(c=>c.id===record.client_id)||{},host=kind==='quote'?$('#qd-content'):$('#id-content'),section=document.createElement('section');section.className='detail-section billing-workspace';
 section.innerHTML='<div class="billing-editor"><div class="eyebrow">CUSTOMER EMAIL</div><h4>Send '+kind+'</h4><p>Send a branded email with a secure document link and payment options.</p><label>To</label><input type="email" class="billing-to" style="width:100%;margin:8px 0"><label>Personal message</label><textarea class="billing-note" rows="3" style="width:100%;margin:8px 0" placeholder="Add a short note for your customer"></textarea><button class="btn primary billing-review">Update preview</button></div><div class="billing-preview"><div class="billing-preview-empty"><span>EMAIL PREVIEW</span><h3>Ready for your customer.</h3><p>Review the recipient and add a personal note, The email preview loads automatically. Update it after changing your message.</p></div></div>';
 host.appendChild(section);
 host.parentElement.querySelector('.billing-tabs')?.remove();const tabs=document.createElement('nav');tabs.className='billing-tabs';tabs.setAttribute('aria-label','Document views');tabs.innerHTML='<button class="active" type="button">Overview</button><button type="button">Email '+kind+'</button>';host.before(tabs);section.hidden=true;const actions=host.parentElement.querySelector('.detail-actions');function switchView(email){for(const child of host.children)child.hidden=email?child!==section:child===section;if(actions)actions.hidden=email;tabs.children[0].classList.toggle('active',!email);tabs.children[1].classList.toggle('active',email);}tabs.children[0].onclick=()=>switchView(false);tabs.children[1].onclick=()=>switchView(true);
 section.querySelector('.billing-to').value=client.billing_email||client.email||record.billing_email||record.email||'';
 const reviewButton=section.querySelector('.billing-review');
 reviewButton.onclick=async()=>{const preview=section.querySelector('.billing-preview');try{const draft=await api('/api/billing/'+kind+'/'+record.id+'/prepare',{method:'POST',body:JSON.stringify({to:section.querySelector('.billing-to').value,note:section.querySelector('.billing-note').value})});preview.innerHTML='<div class="billing-envelope"><strong>From:</strong> '+esc(draft.from)+'<br><strong>To:</strong> '+esc(draft.to)+'<br><strong>Subject:</strong> '+esc(draft.subject)+'</div><iframe sandbox="" referrerpolicy="no-referrer" title="Customer email preview" style="width:100%;height:680px;border:1px solid #e4e8ec;border-radius:12px;background:white"></iframe><p><a class="btn secondary" target="_blank" rel="noopener noreferrer" href="'+esc(draft.url)+'">Open customer document</a></p><button class="btn primary billing-send" '+(draft.configured?'':'disabled')+'>Send '+kind+'</button><p class="billing-result">'+(draft.configured?'Review the recipient and email before sending.':'Email delivery needs to be connected. The preview and customer document are ready.')+'</p>';preview.querySelector('iframe').srcdoc=draft.html;preview.querySelector('.billing-send').onclick=async e=>{e.target.disabled=true;try{const result=await api('/api/billing/deliveries/'+draft.id+'/send',{method:'POST',body:'{}'});preview.querySelector('.billing-result').textContent=result.message;}catch(err){preview.querySelector('.billing-result').textContent=err.message;}};}catch(e){preview.innerHTML='<p class="billing-result">'+esc(e.message)+'</p>';toast(e.message,'error')}};
 switchView(true);
 section.querySelector('.billing-preview').innerHTML='<p class="billing-result" role="status">Loading email preview…</p>';
 reviewButton.click();
}

/* Payments */
function openPayment(invoiceId=''){
  const open=store.invoices.filter(i=>i.status!=='Void');
  $('#pf-invoice').innerHTML=`<option value="">Select invoice</option>`+open.map(i=>`<option value="${i.id}" ${i.id===invoiceId?'selected':''}>${esc(i.invoice_number)} — ${esc(i.company_name)} — ${money(i.balance_due)} due</option>`).join('');
  $('#payment-form').reset();if(invoiceId)$('#pf-invoice').value=invoiceId;
  const inv=store.invoices.find(i=>i.id===invoiceId);if(inv)$('#pf-amount').value=Number(inv.balance_due||0).toFixed(2);
  $('#payment-form-message').textContent='';showModal('payment-modal');
}
$('#add-payment').onclick=()=>openPayment();
$('#pf-invoice').onchange=e=>{const inv=store.invoices.find(i=>i.id===e.target.value);if(inv)$('#pf-amount').value=Number(inv.balance_due||0).toFixed(2)};
$('#payment-form').onsubmit=async e=>{
  e.preventDefault();const inv=store.invoices.find(i=>i.id===$('#pf-invoice').value),msg=$('#payment-form-message');if(!inv)return;
  try{
    await api('/api/payments',{method:'POST',body:JSON.stringify({invoice_id:inv.id,client_id:inv.client_id,amount:Number($('#pf-amount').value),type:$('#pf-type').value,method:$('#pf-method').value,status:'Succeeded',reference:$('#pf-reference').value})});
    await Promise.all([reload('payments'),reload('invoices')]);hideModal('payment-modal');renderDashboard()
  }catch(err){msg.textContent=err.message;msg.className='form-message error'}
};

/* Subscriptions */
$('#add-sub').onclick=()=>{$('#sub-form').reset();$('#sf-client').innerHTML=clientOptions();$('#sf-status').value='Active';$('#sub-form-message').textContent='';showModal('sub-modal')};
$('#sub-form').onsubmit=async e=>{
  e.preventDefault();const msg=$('#sub-form-message');
  try{
    await api('/api/subscriptions',{method:'POST',body:JSON.stringify({client_id:$('#sf-client').value,plan_name:$('#sf-plan').value,amount:Number($('#sf-amount').value),status:$('#sf-status').value,next_billing_at:$('#sf-next').value||null,interval_months:1})});
    await reload('subscriptions');hideModal('sub-modal');renderDashboard()
  }catch(err){msg.textContent=err.message;msg.className='form-message error'}
};
async function updateSub(id,status){try{await api('/api/subscriptions/'+id,{method:'PATCH',body:JSON.stringify({status})});await reload('subscriptions')}catch(e){toast(e.message,'error')}}

renderLines();
(async()=>{const ok=await initAuth();if(ok){await loadAll();const p=new URLSearchParams(location.search);if(p.get('invoice')){nav('invoices');await openInvoiceDetail(p.get('invoice'));}else if(p.get('quote')){nav('quotes');await openQuoteDetail(p.get('quote'));}else if(p.get('view')==='quote-builder'){nav('quote-builder');$('#qb-client').value=p.get('client')||'';if(p.get('offer')==='kplay-growth-30'&&p.get('client')==='3c856081-18b6-40f8-9f16-fc98031927a0'){lineItems=[{package_key:'growth',description:quotePackages.growth.description,quantity:1,unit_price:3995}];$('#qb-deposit').value=50;$('#qb-discount-type').value='percent';$('#qb-discount-value').value=30;$('#qb-discount-label').value='Introductory client discount — 30%';$('#qb-notes').value=quotePackages.growth.terms+' Introductory discount applies to the one-time website build only. Zelle: jdavila@builtbydavila.com (JOAQUIN DAVILA).';renderLines();}updatePreview();}}})();





