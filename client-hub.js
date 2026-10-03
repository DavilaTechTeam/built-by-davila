(() => {
  const modal=document.getElementById('client-modal');
  const form=document.getElementById('client-form');
  if(!modal||!form)return;

  const style=document.createElement('style');
  style.textContent=`
    .client-hub{margin:0 0 20px;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#f8f8f6}
    .client-hub-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}
    .client-hub-head strong{font-size:15px}.client-hub-sub{font-size:11px;color:#667085;margin-top:3px}
    .client-hub-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
    .client-hub-link,.client-hub-btn{display:flex;flex-direction:column;gap:3px;align-items:flex-start;justify-content:center;min-height:58px;padding:10px 12px;border:1px solid #deded9;border-radius:11px;background:#fff;color:#111;text-decoration:none;font:inherit;cursor:pointer}
    .client-hub-link:hover,.client-hub-btn:hover{border-color:#ff543b}.client-hub-link b,.client-hub-btn b{font-size:12px}.client-hub-link small,.client-hub-btn small{font-size:10px;color:#667085}
    .client-hub-primary{background:#111;color:#fff;border-color:#111}.client-hub-primary small{color:#cfcfcf}.client-hub-primary:hover{border-color:#111;filter:brightness(1.08)}
    .client-prospect-card{margin-top:10px;padding:12px;border:1px solid #e5e7eb;border-radius:11px;background:#fff;display:none}.client-prospect-card.on{display:block}.client-prospect-card h4{margin:0 0 6px;font-size:13px}.client-prospect-card p{margin:3px 0;font-size:11px;color:#667085;line-height:1.45}
    @media(max-width:720px){.client-hub-grid{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);

  const hub=document.createElement('div');
  hub.id='client-hub';
  hub.className='client-hub';
  hub.style.display='none';
  form.parentNode.insertBefore(hub,form);

  const escHub=(v='')=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const getToken=()=>sessionStorage.getItem('bbd_token')||'';
  async function fetchJson(path){
    const headers={'Content-Type':'application/json'};const t=getToken();if(t)headers.Authorization=`Bearer ${t}`;
    const r=await fetch('https://built-by-davila-backend.onrender.com'+path,{headers});
    if(!r.ok)throw new Error('Could not load linked records.');
    return r.json();
  }
  function clientCounts(id){
    try{
      return{
        quotes:(store?.quotes||[]).filter(x=>String(x.client_id)===String(id)).length,
        invoices:(store?.invoices||[]).filter(x=>String(x.client_id)===String(id)).length,
        payments:(store?.payments||[]).filter(x=>String(x.client_id)===String(id)).length,
        subscriptions:(store?.subscriptions||[]).filter(x=>String(x.client_id)===String(id)).length
      };
    }catch{return{quotes:0,invoices:0,payments:0,subscriptions:0}}
  }
  function goStudio(view){
    if(typeof hideModal==='function')hideModal('client-modal');
    if(typeof nav==='function')nav(view);
  }
  async function renderHub(){
    const id=document.getElementById('cf-id')?.value||'';
    if(!id){hub.style.display='none';hub.innerHTML='';return;}
    hub.style.display='block';
    const c=clientCounts(id);
    hub.innerHTML=`
      <div class="client-hub-head"><div><strong>Client Hub</strong><div class="client-hub-sub">Everything tied to this client in one place.</div></div></div>
      <div class="client-hub-grid">
        <a class="client-hub-link client-hub-primary" href="projects.html?client=${encodeURIComponent(id)}"><b>Projects</b><small id="hub-project-count">Loading…</small></a>
        <a class="client-hub-link" href="studio.html?view=quote-builder&client=${encodeURIComponent(id)}"><b>New Quote</b><small>Create project quote</small></a>
        <button type="button" class="client-hub-btn" data-hub-view="quotes"><b>Quotes</b><small>${c.quotes} linked</small></button>
        <button type="button" class="client-hub-btn" data-hub-view="invoices"><b>Invoices</b><small>${c.invoices} linked</small></button>
        <button type="button" class="client-hub-btn" data-hub-view="payments"><b>Payments</b><small>${c.payments} linked</small></button>
        <a class="client-hub-link" href="client-portal.html?client=${encodeURIComponent(id)}"><b>Client Portal</b><small>Website review & edits</small></a>
        <button type="button" class="client-hub-btn" id="hub-prospect"><b>Original Prospect</b><small id="hub-prospect-status">Loading…</small></button>
        <button type="button" class="client-hub-btn" data-hub-view="subscriptions"><b>Subscriptions</b><small>${c.subscriptions} linked</small></button>
      </div>
      <div class="client-prospect-card" id="client-prospect-card"></div>`;
    hub.querySelectorAll('[data-hub-view]').forEach(b=>b.onclick=()=>goStudio(b.dataset.hubView));

    try{
      const [projects,prospects]=await Promise.all([fetchJson('/api/projects'),fetchJson('/api/prospects')]);
      const linkedProjects=(projects||[]).filter(p=>String(p.client_id)===String(id));
      const pc=document.getElementById('hub-project-count');if(pc)pc.textContent=`${linkedProjects.length} project${linkedProjects.length===1?'':'s'}`;
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

  const queueRender=()=>setTimeout(renderHub,80);
  const observer=new MutationObserver(()=>{if(modal.classList.contains('show'))queueRender();});
  observer.observe(modal,{attributes:true,attributeFilter:['class']});
  document.addEventListener('click',e=>{
    const edit=e.target.closest?.('.edit-client');
    if(edit)queueRender();
  });
  if(modal.classList.contains('show'))queueRender();
})();
