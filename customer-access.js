/* Activate customer tools only after the backend validates the session. */
(async()=>{
  const base='https://built-by-davila-backend.onrender.com';
  const invitation=new URLSearchParams(location.hash.slice(1)).get('access');
  if(invitation){sessionStorage.removeItem('bbd_customer_access');location.replace('customer-login.html');return;}
  const adminAccess=new URLSearchParams(location.hash.slice(1)).get('admin-access');
  if(adminAccess){sessionStorage.setItem('bbd_admin_portal_access',adminAccess);history.replaceState(null,'',location.pathname+location.search);}
  const adminToken=sessionStorage.getItem('bbd_admin_portal_access');
  const token=adminToken||sessionStorage.getItem('bbd_customer_access');
  window.bbdCustomerAccess=token;
  function signIn(){if(adminToken){sessionStorage.removeItem('bbd_admin_portal_access');location.replace('studio.html');return;}sessionStorage.removeItem('bbd_customer_access');location.replace('customer-login.html');}
  if(!token){signIn();return;}
  try{
    const r=await fetch(base+'/customer-api/profile',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(75000)});
    if(r.status===401){signIn();return;}
    if(!r.ok)throw Error('Customer access is temporarily unavailable.');
    if(adminToken){
      const banner=document.createElement('div');banner.textContent='Administrator view · Changes here affect this client’s project.';
      banner.style.cssText='padding:14px 24px;background:#fff0e8;color:#92351e;font:600 14px Arial';document.querySelector('header').after(banner);
    }
    for(const old of document.querySelectorAll('script[data-customer-script]')){
      const script=document.createElement('script');script.textContent=old.textContent;old.replaceWith(script);
    }
    const logout=document.createElement('button');logout.type='button';logout.textContent=adminToken?'Exit administrator view':'Sign out';
    logout.onclick=async()=>{if(adminToken){signIn();return;}logout.disabled=true;try{const response=await fetch(base+'/customer-auth/logout',{method:'POST',headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error();signIn();}catch{logout.disabled=false;logout.textContent='Unable to sign out. Try again';}};
    document.querySelector('header').append(logout);document.getElementById('customer-lock')?.remove();
  }catch{
    document.body.replaceChildren();const p=document.createElement('p');p.textContent='Unable to verify your session. Refresh to try again.';p.style.cssText='padding:40px;font:18px Arial';document.body.append(p);document.getElementById('customer-lock')?.remove();
  }
})();
