const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const API_BASE='https://built-by-davila-backend.onrender.com';
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0));
const dateFmt=v=>v?new Date(v).toLocaleDateString('en-US'):'—';
const esc=(v='')=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let token=sessionStorage.getItem('bbd_token')||'';

const store={clients:[],quotes:[],invoices:[],payments:[],subscriptions:[]};
let lineItems=[{description:'Website Design & Development',quantity:1,unit_price:3995}];

function setStatus(text,kind='ok'){const el=$('#api-status');if(!el)return;el.textContent=text;el.className='db-status '+kind;}
function showModal(id){const el=$('#'+id);if(!el)return;el.classList.add('show');el.setAttribute('aria-hidden','false');}
function hideModal(id){const el=$('#'+id);if(!el)return;el.classList.remove('show');el.setAttribute('aria-hidden','true');}
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
  try{
    const r=await rawFetch('/api/auth/status');
    const data=await r.json();
    if(data.authRequired && !token){showAuth();return false;}
    return true;
  }catch{setStatus('Waking server…','loading');return true;}
}
function showAuth(){$('#auth-screen').classList.remove('hidden');$('#login-password').focus();}
function hideAuth(){$('#auth-screen').classList.add('hidden');}
$('#login-form').addEventListener('submit',async e=>{
  e.preventDefault();const msg=$('#login-message');msg.textContent='Signing in…';
  try{
    const data=await rawFetch('/api/auth/login',{method:'POST',body:JSON.stringify({password:$('#login-password').value})}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||'Login failed');return d});
    if(data.token){token=data.token;sessionStorage.setItem('bbd_token',token)}
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
    const [clients,quotes,invoices,payments,subscriptions]=await Promise.all([
      api('/api/clients'),api('/api/quotes'),api('/api/invoices'),api('/api/payments'),api('/api/subscriptions')
    ]);
    Object.assign(store,{clients,quotes,invoices,payments,subscriptions});
    renderAll();
  }catch(err){console.error(err);setStatus('Could not load','error')}
}
async function reload(resource){
  store[resource]=await api('/api/'+resource);
  renderAll();
}

function contactName(c){return [c.contact_first_name,c.contact_last_name].filter(Boolean).join(' ')||'—'}
function badge(status){return `<span class="badge ${esc(String(status||'').toLowerCase().replaceAll(' ','-'))}">${esc(status||'—')}</span>`}
function clientOptions(selected=''){return `<option value="">Select a client</option>`+store.clients.map(c=>`<option value="${c.id}" ${c.id===selected?'selected':''}>${esc(c.company_name)}</option>`).join('')}

function renderClients(list=store.clients){
  $('#client-body').innerHTML=list.length?list.map(c=>`<tr>
    <td><strong>${esc(c.company_name)}</strong></td><td>${esc(contactName(c))}</td><td>${esc(c.email||'—')}</td><td>${esc(c.phone||'—')}</td><td>${badge(c.status)}</td>
    <td class="actions-cell"><button class="mini-btn edit-client" data-id="${c.id}">Edit</button></td>
  </tr>`).join(''):`<tr><td colspan="6">No clients yet.</td></tr>`;
  $$('.edit-client').forEach(b=>b.onclick=()=>openClient(b.dataset.id));
  $('#qb-client').innerHTML=clientOptions($('#qb-client').value);
  $('#sf-client').innerHTML=clientOptions();
}
function renderQuotes(){
  $('#quote-body').innerHTML=store.quotes.length?store.quotes.map(q=>`<tr>
    <td><strong>${esc(q.quote_number)}</strong></td><td>${esc(q.company_name)}</td><td>${money(q.total)}</td><td>${Number(q.deposit_percent||0)}%</td><td>${badge(q.status)}</td><td>${dateFmt(q.created_at)}</td>
    <td class="actions-cell">${q.status!=='Accepted'?`<button class="mini-btn quote-status" data-id="${q.id}" data-status="Sent">Mark Sent</button>`:''}<button class="mini-btn primary-mini convert-quote" data-id="${q.id}">Create Invoice</button></td>
  </tr>`).join(''):`<tr><td colspan="7">No quotes yet.</td></tr>`;
  $$('.quote-status').forEach(b=>b.onclick=async()=>{try{await api('/api/quotes/'+b.dataset.id,{method:'PATCH',body:JSON.stringify({status:b.dataset.status})});await reload('quotes')}catch(e){toast(e.message,'error')}});
  $$('.convert-quote').forEach(b=>b.onclick=()=>convertQuote(b.dataset.id));
}
function renderInvoices(){
  $('#invoice-body').innerHTML=store.invoices.length?store.invoices.map(i=>`<tr>
    <td><strong>${esc(i.invoice_number)}</strong></td><td>${esc(i.company_name)}</td><td>${money(i.total)}</td><td>${money(i.amount_paid)}</td><td>${money(i.balance_due)}</td><td>${badge(i.status)}</td><td>${dateFmt(i.due_date)}</td>
    <td class="actions-cell">${Number(i.balance_due)>0&&i.status!=='Void'?`<button class="mini-btn primary-mini pay-invoice" data-id="${i.id}">Record Payment</button>`:''}</td>
  </tr>`).join(''):`<tr><td colspan="8">No invoices yet.</td></tr>`;
  $$('.pay-invoice').forEach(b=>b.onclick=()=>openPayment(b.dataset.id));
}
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
  const received=store.payments.filter(p=>p.status==='Succeeded'&&p.type!=='Refund').reduce((s,p)=>s+Number(p.amount),0)
    -store.payments.filter(p=>p.status==='Succeeded'&&p.type==='Refund').reduce((s,p)=>s+Number(p.amount),0);
  const mrr=store.subscriptions.filter(s=>s.status==='Active').reduce((s,p)=>s+Number(p.amount),0);
  $('#metric-revenue').textContent=money(received);
  $('#metric-mrr').textContent=money(mrr);
  $('#metric-open').textContent=store.invoices.filter(i=>Number(i.balance_due)>0&&i.status!=='Void').length;
  $('#metric-quotes').textContent=store.quotes.length;
  $('#dash-invoices').innerHTML=store.invoices.slice(0,5).map(i=>`<tr><td>${esc(i.invoice_number)}</td><td>${esc(i.company_name)}</td><td>${money(i.total)}</td><td>${money(i.balance_due)}</td><td>${badge(i.status)}</td></tr>`).join('')||`<tr><td colspan="5">No invoices yet.</td></tr>`;
  $('#dash-subs').innerHTML=store.subscriptions.filter(s=>s.status==='Active').slice(0,4).map(s=>`<div class="subscription-card"><div><strong>${esc(s.company_name)}</strong><div class="sub-name">${esc(s.plan_name)}</div></div><div class="sub-right"><strong>${money(s.amount)}/mo</strong>${badge(s.status)}</div></div>`).join('')||`<div class="empty-state">No active recurring plans.</div>`;
}
function renderAll(){renderClients();renderQuotes();renderInvoices();renderPayments();renderSubs();renderDashboard();updatePreview()}

/* Client modal */
function openClient(id=''){
  $('#client-form').reset();$('#cf-id').value='';$('#cf-status').value='Active';$('#client-form-message').textContent='';
  $('#client-modal-title').textContent=id?'Edit Client':'Add Client';
  if(id){
    const c=store.clients.find(x=>x.id===id);if(!c)return;
    $('#cf-id').value=c.id;$('#cf-company').value=c.company_name||'';$('#cf-status').value=c.status||'Active';
    $('#cf-first').value=c.contact_first_name||'';$('#cf-last').value=c.contact_last_name||'';$('#cf-email').value=c.email||'';
    $('#cf-billing-email').value=c.billing_email||'';$('#cf-phone').value=c.phone||'';$('#cf-website').value=c.website||'';$('#cf-notes').value=c.notes||'';
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

/* Quote Builder */
function renderLines(){
  $('#line-items').innerHTML=lineItems.map((l,i)=>`<div class="line-row rich-line">
    <input class="line-desc" data-desc="${i}" value="${esc(l.description)}" placeholder="Service description">
    <input class="line-qty" data-qty="${i}" type="number" min="0.01" step="0.01" value="${l.quantity}">
    <input class="line-price" data-price="${i}" type="number" min="0" step="0.01" value="${l.unit_price}">
    <button class="btn secondary line-delete" data-del="${i}" type="button">×</button>
  </div>`).join('');
  $$('[data-desc]').forEach(el=>el.oninput=e=>{lineItems[+e.target.dataset.desc].description=e.target.value;updatePreview()});
  $$('[data-qty]').forEach(el=>el.oninput=e=>{lineItems[+e.target.dataset.qty].quantity=Number(e.target.value);updatePreview()});
  $$('[data-price]').forEach(el=>el.oninput=e=>{lineItems[+e.target.dataset.price].unit_price=Number(e.target.value);updatePreview()});
  $$('[data-del]').forEach(el=>el.onclick=e=>{if(lineItems.length>1){lineItems.splice(+e.target.dataset.del,1);renderLines();updatePreview()}});
}
function updatePreview(){
  const c=store.clients.find(x=>x.id===$('#qb-client').value);
  $('#pv-client').textContent=c?.company_name||'Select a client';
  const total=lineItems.reduce((s,l)=>s+Number(l.quantity||0)*Number(l.unit_price||0),0), dep=Number($('#qb-deposit').value||0);
  $('#pv-lines').innerHTML=lineItems.map(l=>`<div class="preview-line"><span>${esc(l.description)} × ${Number(l.quantity||0)}</span><strong>${money(Number(l.quantity||0)*Number(l.unit_price||0))}</strong></div>`).join('');
  $('#pv-total').textContent=money(total);$('#pv-deposit').textContent=money(total*dep/100);$('#pv-balance').textContent=money(total-total*dep/100);
}
$('#add-line').onclick=()=>{lineItems.push({description:'New Service',quantity:1,unit_price:0});renderLines();updatePreview()};
$('#qb-client').onchange=updatePreview;$('#qb-deposit').oninput=updatePreview;
$('#clear-quote').onclick=()=>{lineItems=[{description:'Website Design & Development',quantity:1,unit_price:3995}];$('#qb-client').value='';$('#qb-deposit').value=50;renderLines();updatePreview()};
async function saveQuote(status){
  const client_id=$('#qb-client').value;if(!client_id)return toast('Select a client first.','error');
  if(!lineItems.length)return toast('Add at least one line item.','error');
  try{
    const q=await api('/api/quotes',{method:'POST',body:JSON.stringify({client_id,status,deposit_percent:Number($('#qb-deposit').value||0),notes:$('#qb-notes').value,items:lineItems})});
    await reload('quotes');toast(`${q.quote_number} saved to the live database.`);nav('quotes');$('#clear-quote').click();
  }catch(e){toast(e.message,'error')}
}
$('#save-quote').onclick=()=>saveQuote('Draft');$('#save-send-quote').onclick=()=>saveQuote('Sent');

async function convertQuote(id){
  const q=store.quotes.find(x=>x.id===id);
  if(!q)return;

  const confirmed=await studioConfirm({
    title:'Create Invoice',
    message:`Create an invoice from ${q.quote_number} for ${q.company_name}?`,
    confirmText:'Create Invoice'
  });
  if(!confirmed)return;

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
  }catch(e){
    console.error(e);
    toast(e.message,'error');
  }
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
(async()=>{const ok=await initAuth();if(ok)await loadAll()})();
