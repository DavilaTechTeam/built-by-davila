
const $=(s)=>document.querySelector(s), $$=(s)=>document.querySelectorAll(s);
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0));

const store={
  clients: JSON.parse(localStorage.getItem('bbd_clients')||'null') || [
    {id:1,company:'KPLAY USA',name:'Primary Contact',email:'contact@kplayusa.com',phone:'(956) 555-0101'},
    {id:2,company:'Demo Client',name:'Maria Lopez',email:'maria@example.com',phone:'(956) 555-0180'}
  ],
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
function save(){localStorage.setItem('bbd_clients',JSON.stringify(store.clients));localStorage.setItem('bbd_quotes',JSON.stringify(store.quotes));localStorage.setItem('bbd_invoices',JSON.stringify(store.invoices));localStorage.setItem('bbd_payments',JSON.stringify(store.payments));localStorage.setItem('bbd_subs',JSON.stringify(store.subscriptions));}

$$('.side button[data-view]').forEach(b=>b.onclick=()=>{
  $$('.side button').forEach(x=>x.classList.remove('active')); b.classList.add('active');
  $$('.view').forEach(v=>v.classList.remove('active')); $('#'+b.dataset.view).classList.add('active');
  $('#page-title').textContent=b.textContent.trim();
});

function render(){
  $('#client-body').innerHTML=store.clients.map(c=>`<tr><td>${c.company}</td><td>${c.name}</td><td>${c.email}</td><td>${c.phone}</td></tr>`).join('');
  $('#quote-body').innerHTML=store.quotes.map(q=>`<tr><td>${q.id}</td><td>${q.client}</td><td>${money(q.total)}</td><td><span class="badge ${q.status.toLowerCase()}">${q.status}</span></td><td>${q.date}</td></tr>`).join('');
  $('#invoice-body').innerHTML=store.invoices.map(i=>`<tr><td>${i.id}</td><td>${i.client}</td><td>${money(i.total)}</td><td><span class="badge ${i.status.toLowerCase()}">${i.status}</span></td><td>${i.due}</td></tr>`).join('');
  $('#payment-body').innerHTML=store.payments.map(p=>`<tr><td>${p.date}</td><td>${p.client}</td><td>${p.type}</td><td>${money(p.amount)}</td></tr>`).join('');
  $('#subs-list').innerHTML=store.subscriptions.map(s=>`<div class="subscription-card"><div><strong>${s.client}</strong><div style="color:#999;font-size:12px">${s.plan}</div></div><div><strong>${money(s.amount)}/mo</strong><div style="color:#35c27f;font-size:11px;text-align:right">${s.status}</div></div></div>`).join('');
  const revenue=store.payments.reduce((a,b)=>a+Number(b.amount),0), mrr=store.subscriptions.reduce((a,b)=>a+Number(b.amount),0);
  $('#metric-revenue').textContent=money(revenue); $('#metric-mrr').textContent=money(mrr);
  $('#metric-open').textContent=store.invoices.filter(i=>i.status!=='Paid').length; $('#metric-quotes').textContent=store.quotes.length;
}
render();

$('#add-client').onclick=()=>{const company=prompt('Company name?'); if(!company)return; const name=prompt('Contact name?')||''; const email=prompt('Email?')||''; const phone=prompt('Phone?')||''; store.clients.push({id:Date.now(),company,name,email,phone}); save(); render();}

let lineItems=[{desc:'Website Design & Development',amount:3995}];
function renderLines(){
  $('#line-items').innerHTML=lineItems.map((l,i)=>`<div class="line-row"><input data-desc="${i}" value="${l.desc}"><input data-amt="${i}" type="number" value="${l.amount}"><button class="btn secondary" data-del="${i}">×</button></div>`).join('');
  $$('[data-desc]').forEach(el=>el.oninput=e=>{lineItems[+e.target.dataset.desc].desc=e.target.value; updatePreview();});
  $$('[data-amt]').forEach(el=>el.oninput=e=>{lineItems[+e.target.dataset.amt].amount=+e.target.value; updatePreview();});
  $$('[data-del]').forEach(el=>el.onclick=e=>{lineItems.splice(+e.target.dataset.del,1);renderLines();updatePreview();});
}
function updatePreview(){
  const client=$('#qb-client').value||'Client Company';
  const total=lineItems.reduce((a,b)=>a+Number(b.amount||0),0);
  const depositPct=Number($('#qb-deposit').value||50);
  $('#pv-client').textContent=client; $('#pv-lines').innerHTML=lineItems.map(l=>`<div style="display:flex;justify-content:space-between;margin:9px 0"><span>${l.desc}</span><strong>${money(l.amount)}</strong></div>`).join('');
  $('#pv-total').textContent=money(total); $('#pv-deposit').textContent=money(total*depositPct/100); $('#pv-balance').textContent=money(total-total*depositPct/100);
}
$('#add-line').onclick=()=>{lineItems.push({desc:'New Service',amount:0});renderLines();updatePreview();}
$('#qb-client').oninput=updatePreview; $('#qb-deposit').oninput=updatePreview;
renderLines();updatePreview();

$('#save-quote').onclick=()=>{
  const client=$('#qb-client').value.trim(); if(!client){alert('Enter a client/company name first.');return;}
  const total=lineItems.reduce((a,b)=>a+Number(b.amount||0),0);
  const id='Q-'+String(1000+store.quotes.length+1);
  store.quotes.unshift({id,client,total,status:'Draft',date:new Date().toLocaleDateString()});save();render();alert(id+' saved as draft.');
}
$('#invoice-from-quote').onclick=()=>{
  const client=$('#qb-client').value.trim(); if(!client){alert('Enter a client/company name first.');return;}
  const total=lineItems.reduce((a,b)=>a+Number(b.amount||0),0);
  const depositPct=Number($('#qb-deposit').value||50), deposit=total*depositPct/100;
  const id='INV-'+String(1000+store.invoices.length+1);
  store.invoices.unshift({id,client,total,status:'Sent',due:'Due on receipt'});
  store.payments.unshift({date:'Pending',client,amount:deposit,type:'Initial payment requested'});
  save();render();alert(id+' created. In production, this is where a Stripe Checkout / Payment Link would be created for '+money(deposit)+'.');
}
$('#add-sub').onclick=()=>{
  const client=prompt('Client/company?'); if(!client)return; const amount=Number(prompt('Monthly recurring amount?','149')); if(!amount)return;
  store.subscriptions.push({client,plan:'Custom Care Plan',amount,status:'Active'});save();render();
}
