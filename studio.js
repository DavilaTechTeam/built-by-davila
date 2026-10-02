const $=(s)=>document.querySelector(s), $$=(s)=>document.querySelectorAll(s);
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0));
const API_BASE='https://built-by-davila-backend.onrender.com';

const esc=(v='')=>String(v).replace(/[&<>"']/g,ch=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[ch]));

const store={
  clients: [],
  quotes: JSON.parse(localStorage.getItem('bbd_quotes')||'null') || [
    {id:'Q-1001',client:'KPLAY USA',total:4500,status:'Sent',date:'Oct 1, 2026'}
  ],
  invoices: JSON.parse(localStorage.getItem('bbd_invoices')||'null') || [
    {id:'INV-1001',client:'Demo Client',total:1995,status:'Paid',due:'Sep 28, 2026'}
  ],
  payments: JSON.parse(localStorage.getItem('bbd_payments')||'null') || [
    {date:'Sep 28, 2026',client:'Demo Client',amount:997.50,type:'Deposit'}
  ],
  subscriptions: JSON.parse(localStorage.getItem('bbd_subs')||'null') || [
    {client:'Demo Client',plan:'Growth Care',amount:149,status:'Active'}
  ]
};

function saveLocal(){
  localStorage.setItem('bbd_quotes',JSON.stringify(store.quotes));
  localStorage.setItem('bbd_invoices',JSON.stringify(store.invoices));
  localStorage.setItem('bbd_payments',JSON.stringify(store.payments));
  localStorage.setItem('bbd_subs',JSON.stringify(store.subscriptions));
}

function setDbStatus(text, kind='ok'){
  const el=$('#db-status');
  if(!el) return;
  el.textContent=text;
  el.className='db-status '+kind;
}

async function loadClients(){
  setDbStatus('Connecting…','loading');
  try{
    const r=await fetch(`${API_BASE}/api/clients`);
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    store.clients=await r.json();
    setDbStatus('Live database','ok');
    renderClients();
  }catch(err){
    console.error(err);
    setDbStatus('Database unavailable','error');
    $('#client-body').innerHTML='<tr><td colspan="5">Could not reach the client database. The free Render service may be waking up; try Refresh Clients in a moment.</td></tr>';
  }
}

async function createClient(payload){
  setDbStatus('Saving…','loading');
  const r=await fetch(`${API_BASE}/api/clients`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error||`HTTP ${r.status}`);
  return data;
}

function contactName(c){
  return [c.contact_first_name,c.contact_last_name].filter(Boolean).join(' ') || '—';
}

function renderClients(list=store.clients){
  const body=$('#client-body');
  if(!body) return;
  if(!list.length){
    body.innerHTML='<tr><td colspan="5">No clients yet. Click “Add Client” to create your first live database record.</td></tr>';
    return;
  }
  body.innerHTML=list.map(c=>`<tr>
    <td>${esc(c.company_name)}</td>
    <td>${esc(contactName(c))}</td>
    <td>${esc(c.email||'—')}</td>
    <td>${esc(c.phone||'—')}</td>
    <td><span class="badge ${esc((c.status||'Lead').toLowerCase())}">${esc(c.status||'Lead')}</span></td>
  </tr>`).join('');
}

$$('.side button[data-view]').forEach(b=>b.onclick=()=>{
  $$('.side button').forEach(x=>x.classList.remove('active')); b.classList.add('active');
  $$('.view').forEach(v=>v.classList.remove('active')); $('#'+b.dataset.view).classList.add('active');
  $('#page-title').textContent=b.textContent.trim();
});

function render(){
  renderClients();
  $('#quote-body').innerHTML=store.quotes.map(q=>`<tr><td>${esc(q.id)}</td><td>${esc(q.client)}</td><td>${money(q.total)}</td><td><span class="badge ${esc(q.status.toLowerCase())}">${esc(q.status)}</span></td><td>${esc(q.date)}</td></tr>`).join('');
  $('#invoice-body').innerHTML=store.invoices.map(i=>`<tr><td>${esc(i.id)}</td><td>${esc(i.client)}</td><td>${money(i.total)}</td><td><span class="badge ${esc(i.status.toLowerCase())}">${esc(i.status)}</span></td><td>${esc(i.due)}</td></tr>`).join('');
  $('#payment-body').innerHTML=store.payments.map(p=>`<tr><td>${esc(p.date)}</td><td>${esc(p.client)}</td><td>${esc(p.type)}</td><td>${money(p.amount)}</td></tr>`).join('');
  $('#subs-list').innerHTML=store.subscriptions.map(s=>`<div class="subscription-card"><div><strong>${esc(s.client)}</strong><div style="color:#999;font-size:12px">${esc(s.plan)}</div></div><div><strong>${money(s.amount)}/mo</strong><div style="color:#35c27f;font-size:11px;text-align:right">${esc(s.status)}</div></div></div>`).join('');
  const revenue=store.payments.reduce((a,b)=>a+Number(b.amount),0), mrr=store.subscriptions.reduce((a,b)=>a+Number(b.amount),0);
  $('#metric-revenue').textContent=money(revenue); $('#metric-mrr').textContent=money(mrr);
  $('#metric-open').textContent=store.invoices.filter(i=>i.status!=='Paid').length; $('#metric-quotes').textContent=store.quotes.length;
}
render();
loadClients();

$('#add-client').onclick=async()=>{
  const company_name=prompt('Company name?');
  if(!company_name?.trim()) return;

  const contact_first_name=prompt('Contact first name?')||'';
  const contact_last_name=prompt('Contact last name?')||'';
  const email=prompt('Email?')||'';
  const phone=prompt('Phone?')||'';

  try{
    const client=await createClient({
      company_name:company_name.trim(),
      contact_first_name:contact_first_name.trim()||null,
      contact_last_name:contact_last_name.trim()||null,
      email:email.trim()||null,
      phone:phone.trim()||null,
      status:'Active'
    });
    store.clients.unshift(client);
    setDbStatus('Live database','ok');
    renderClients();
    alert(`${client.company_name} was saved to the live database.`);
  }catch(err){
    console.error(err);
    setDbStatus('Save failed','error');
    alert('Could not save the client. If the Render service was asleep, wait a few seconds and try again.');
  }
};

$('#refresh-clients')?.addEventListener('click',loadClients);

$('#client-search')?.addEventListener('input',e=>{
  const q=e.target.value.trim().toLowerCase();
  if(!q) return renderClients();
  renderClients(store.clients.filter(c=>{
    const hay=[
      c.company_name,c.contact_first_name,c.contact_last_name,c.email,c.phone,c.status
    ].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  }));
});

let lineItems=[{desc:'Website Design & Development',amount:3995}];
function renderLines(){
  $('#line-items').innerHTML=lineItems.map((l,i)=>`<div class="line-row"><input data-desc="${i}" value="${esc(l.desc)}"><input data-amt="${i}" type="number" value="${Number(l.amount||0)}"><button class="btn secondary" data-del="${i}">×</button></div>`).join('');
  $$('[data-desc]').forEach(el=>el.oninput=e=>{lineItems[+e.target.dataset.desc].desc=e.target.value; updatePreview();});
  $$('[data-amt]').forEach(el=>el.oninput=e=>{lineItems[+e.target.dataset.amt].amount=+e.target.value; updatePreview();});
  $$('[data-del]').forEach(el=>el.onclick=e=>{lineItems.splice(+e.target.dataset.del,1);renderLines();updatePreview();});
}
function updatePreview(){
  const client=$('#qb-client').value||'Client Company';
  const total=lineItems.reduce((a,b)=>a+Number(b.amount||0),0);
  const depositPct=Number($('#qb-deposit').value||50);
  $('#pv-client').textContent=client; $('#pv-lines').innerHTML=lineItems.map(l=>`<div style="display:flex;justify-content:space-between;margin:9px 0"><span>${esc(l.desc)}</span><strong>${money(l.amount)}</strong></div>`).join('');
  $('#pv-total').textContent=money(total); $('#pv-deposit').textContent=money(total*depositPct/100); $('#pv-balance').textContent=money(total-total*depositPct/100);
}
$('#add-line').onclick=()=>{lineItems.push({desc:'New Service',amount:0});renderLines();updatePreview();}
$('#qb-client').oninput=updatePreview; $('#qb-deposit').oninput=updatePreview;
renderLines();updatePreview();

$('#save-quote').onclick=()=>{
  const client=$('#qb-client').value.trim(); if(!client){alert('Enter a client/company name first.');return;}
  const total=lineItems.reduce((a,b)=>a+Number(b.amount||0),0);
  const id='Q-'+String(1000+store.quotes.length+1);
  store.quotes.unshift({id,client,total,status:'Draft',date:new Date().toLocaleDateString()});saveLocal();render();alert(id+' saved as draft.');
}
$('#invoice-from-quote').onclick=()=>{
  const client=$('#qb-client').value.trim(); if(!client){alert('Enter a client/company name first.');return;}
  const total=lineItems.reduce((a,b)=>a+Number(b.amount||0),0);
  const depositPct=Number($('#qb-deposit').value||50), deposit=total*depositPct/100;
  const id='INV-'+String(1000+store.invoices.length+1);
  store.invoices.unshift({id,client,total,status:'Sent',due:'Due on receipt'});
  store.payments.unshift({date:'Pending',client,amount:deposit,type:'Initial payment requested'});
  saveLocal();render();alert(id+' created. Stripe is the next phase for real payment collection of '+money(deposit)+'.');
}
$('#add-sub').onclick=()=>{
  const client=prompt('Client/company?'); if(!client)return; const amount=Number(prompt('Monthly recurring amount?','149')); if(!amount)return;
  store.subscriptions.push({client,plan:'Custom Care Plan',amount,status:'Active'});saveLocal();render();
}
