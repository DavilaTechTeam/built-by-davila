(() => {
  const modal=document.getElementById('client-modal');
  const form=document.getElementById('client-form');
  if(!modal||!form)return;

  const style=document.createElement('style');
  style.textContent=`
    .client-hub{margin:0 0 20px;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#f8f8f6}
    .client-hub-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}
    .client-hub-head strong{font-size:15px}.client-hub-sub{font-size:11px;color:#667085;margin-top:3px}
    .client-snapshot{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:10px}
    .client-snapshot-card{background:#111;color:#fff;border-radius:11px;padding:10px 12px;min-height:58px;display:flex;flex-direction:column;justify-content:center}
    .client-snapshot-card span{font-size:9px;color:#bdbdbd;text-transform:uppercase;letter-spacing:.06em;font-weight:800}.client-snapshot-card strong{font-size:15px;margin-top:3px;line-height:1.2}.client-snapshot-card small{font-size:9px;color:#cfcfcf;margin-top:2px}
    .client-hub-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
    .client-hub-link,.client-hub-btn{display:flex;flex-direction:column;gap:3px;align-items:flex-start;justify-content:center;min-height:58px;padding:10px 12px;border:1px solid #deded9;border-radius:11px;background:#fff;color:#111;text-decoration:none;font:inherit;cursor:pointer}
    .client-hub-link:hover,.client-hub-btn:hover{border-color:#ff543b}.client-hub-link b,.client-hub-btn b{font-size:12px}.client-hub-link small,.client-hub-btn small{font-size:10px;color:#667085}
    .client-hub-primary{background:#111;color:#fff;border-color:#111}.client-hub-primary small{color:#cfcfcf}.client-hub-primary:hover{border-color:#111;filter:brightness(1.08)}
    .client-prospect-card{margin-top:10px;padding:12px;border:1px solid #e5e7eb;border-radius:11px;background:#fff;display:none}.client-prospect-card.on{display:block}.client-prospect-card h4{margin:0 0 6px;font-size:13px}.client-prospect-card p{margin:3px 0;font-size:11px;color:#667085;line-height:1.45}
    .client-scope-banner{margin:0 0 16px;padding:10px 12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:11px;color:#9a3412;font-size:12px;font-weight:700;display:flex;justify-content:space-between;gap:10px;align-items:center}
    .client-scope-banner a{color:#9a3412}
    @media(max-width:720px){.client-hub-grid{grid-template-columns:1fr 1fr}.client-snapshot{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);

  const hub=document.createElement('div');
  hub.id='client-hub';
  hub.className='client-hub';
  hub.style.display='none';
  form.parentNode.insertBefore(hub,form);

  const escHub=(v='')=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmt=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n||0));
  const getToken=()=>sessionStorage.getItem('bbd_token')||'';
  async function fetchJson(path){
    const headers={'Content-Type':'application/json'};const t=getToken();if(t)headers.Authorization=`Bearer ${t}`;
    const r=await fetch('https://built-by-davila-backend.onrender.com'+path,{headers});
    if(!r.ok)throw new Error('Could not load linked records.');
    return r.json();
  }
  function related(id){
    try{
      const quotes=(store?.quotes||[]).filter(x=>String(x.client_id)===String(id));
      const invoices=(store?.invoices||[]).filter(x=>String(x.client_id)===String(id));
      const payments=(store?.payments||[]).filter(x=>String(x.client_id)===String(id));
      const subscriptions=(store?.subscriptions||[]).filter(x=>String(x.client_id)===String(id));
      return{quotes,invoices,payments,subscriptions};
    }catch{return{quotes:[],invoices:[],payments:[],subscriptions:[]}}
  }
  function goStudio(view,id){
    location.href=`studio.html?view=${encodeURIComponent(view)}&client=${encodeURIComponent(id)}`;
  }
  async function renderHub(){
    const id=document.getElementById('cf-id')?.value||'';
    if(!id){hub.style.display='none';hub.innerHTML='';return;}
    hub.style.display='block';
    const r=related(id);
    const openBalance=r.invoices.filter(i=>String(i.status)!=='Void').reduce((s,i)=>s+Number(i.balance_due||0),0);
    const paid=r.payments.filter(p=>!p.status||p.status==='Succeeded').reduce((s,p)=>s+Number(p.amount||0),0);
    const mrr=r.subscriptions.filter(s=>s.status==='Active').reduce((s,p)=>s+Number(p.amount||0),0);
    hub.innerHTML=`
      <div class="client-hub-head"><div><strong>Client Hub</strong><div class="client-hub-sub">Everything tied to this client in one place.</div></div></div>
      <div class="client-snapshot">
        <div class="client-snapshot-card"><span>Project</span><strong id="hub-project-stage">Loading…</strong><small id="hub-project-progress">Current website build</small></div>
        <div class="client-snapshot-card"><span>Open Balance</span><strong>${fmt(openBalance)}</strong><small>${r.invoices.length} invoice${r.invoices.length===1?'':'s'}</small></div>
        <div class="client-snapshot-card"><span>Paid to Date</span><strong>${fmt(paid)}</strong><small>${r.payments.length} payment${r.payments.length===1?'':'s'}</small></div>
        <div class="client-snapshot-card"><span>Monthly Recurring</span><strong>${fmt(mrr)}</strong><small>${r.subscriptions.filter(s=>s.status==='Active').length} active plan${r.subscriptions.filter(s=>s.status==='Active').length===1?'':'s'}</small></div>
      </div>
      <div class="client-hub-grid">
        <a class="client-hub-link client-hub-primary" href="projects.html?client=${encodeURIComponent(id)}"><b>Projects</b><small id="hub-project-count">Loading…</small></a>
        <a class="client-hub-link" href="studio.html?view=quote-builder&client=${encodeURIComponent(id)}"><b>New Quote</b><small>Create project quote</small></a>
        <a class="client-hub-link" href="studio.html?view=quotes&client=${encodeURIComponent(id)}"><b>Quotes</b><small>${r.quotes.length} linked</small></a>
        <a class="client-hub-link" href="studio.html?view=invoices&client=${encodeURIComponent(id)}"><b>Invoices</b><small>${r.invoices.length} linked</small></a>
        <a class="client-hub-link" href="studio.html?view=payments&client=${encodeURIComponent(id)}"><b>Payments</b><small>${r.payments.length} linked</small></a>
        <a class="client-hub-link" href="client-portal.html?client=${encodeURIComponent(id)}"><b>Client Portal</b><small>Website review & edits</small></a>
        <button type="button" class="client-hub-btn" id="hub-prospect"><b>Original Prospect</b><small id="hub-prospect-status">Loading…</small></button>
        <a class="client-hub-link" href="studio.html?view=subscriptions&client=${encodeURIComponent(id)}"><b>Subscriptions</b><small>${r.subscriptions.length} linked</small></a>
      </div>
      <div class="client-prospect-card" id="client-prospect-card"></div>`;

    try{
      const [projects,prospects]=await Promise.all([fetchJson('/api/projects'),fetchJson('/api/prospects')]);
      const linkedProjects=(projects||[]).filter(p=>String(p.client_id)===String(id));
      const activeProject=linkedProjects.find(p=>!['Live','Completed','Canceled','On Hold'].includes(String(p.status)))||linkedProjects[0];
      const pc=document.getElementById('hub-project-count');if(pc)pc.textContent=`${linkedProjects.length} project${linkedProjects.length===1?'':'s'}`;
      const ps1=document.getElementById('hub-project-stage');if(ps1)ps1.textContent=activeProject?.status||'No project';
      const ps2=document.getElementById('hub-project-progress');if(ps2)ps2.textContent=activeProject?`${Number(activeProject.progress||activeProject.progress_percent||0)}% complete`:'Create a project to start';
      const prospect=(prospects||[]).find(p=>String(p.converted_client_id)===String(id));
      const ps=document.getElementById('hub-prospect-status');if(ps)ps.textContent=prospect?'View intake':'No linked intake';
      const pb=document.getElementById('hub-prospect');
      if(pb)pb.onclick=()=>{
        const card=document.getElementById('client-prospect-card');
        if(!prospect){card.innerHTML='<p>No converted prospect is linked to this client.</p>';card.classList.add('on');return;}
        card.innerHTML=`<h4>${escHub(prospect.company||'Original Prospect')}</h4><p><strong>Goal:</strong> ${escHub(prospect.goal||'—')}</p><p><strong>Style:</strong> ${escHub(prospect.style||'—')}</p><p><strong>Ideal customer:</strong> ${escHub(prospect.audience||'—')}</p><p><strong>Business:</strong> ${escHub(prospect.business||'—')}</p><div style="margin-top:8px"><a class="btn secondary" style="padding:7px 10px;font-size:11px" href="prospects.html?v=14">Open Prospects</a></div>`;
        card.classList.toggle('on');
      };
    }catch{
      const pc=document.getElementById('hub-project-count');if(pc)pc.textContent='Open projects';
      const ps=document.getElementById('hub-prospect-status');if(ps)ps.textContent='Open prospects';
    }
  }

  function applyClientScope(){
    const params=new URLSearchParams(location.search);const id=params.get('client');const view=params.get('view');
    if(!id||!['quotes','invoices','payments','subscriptions'].includes(view))return;
    let tries=0;
    const run=()=>{
      tries++;
      const client=(store?.clients||[]).find(c=>String(c.id)===String(id));
      if(!client&&tries<40){setTimeout(run,150);return;}
      if(!client)return;
      const section=document.getElementById(view);if(!section)return;
      if(!section.querySelector('.client-scope-banner')){
        const banner=document.createElement('div');banner.className='client-scope-banner';
        banner.innerHTML=`<span>Showing ${escHub(view)} for <strong>${escHub(client.company_name)}</strong>.</span><a href="studio.html?view=${encodeURIComponent(view)}">Show all</a>`;
        section.prepend(banner);
      }
      const rows=section.querySelectorAll('tbody tr,.live-sub');
      rows.forEach(row=>{const text=row.textContent||'';row.style.display=text.includes(client.company_name)?'':'none'});
    };
    setTimeout(run,350);
  }

  const queueRender=()=>setTimeout(renderHub,80);
  const observer=new MutationObserver(()=>{if(modal.classList.contains('show'))queueRender();});
  observer.observe(modal,{attributes:true,attributeFilter:['class']});
  document.addEventListener('click',e=>{const edit=e.target.closest?.('.edit-client');if(edit)queueRender();});
  if(modal.classList.contains('show'))queueRender();
  applyClientScope();
})();
