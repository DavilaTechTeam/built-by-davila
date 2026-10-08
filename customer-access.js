/* Activate customer tools only after the backend validates the session. */
(async()=>{
  const base='https://built-by-davila-backend.onrender.com';
  const invitation=new URLSearchParams(location.hash.slice(1)).get('access');
  if(invitation){sessionStorage.removeItem('bbd_customer_access');location.replace('customer-login.html');return;}
  const token=sessionStorage.getItem('bbd_customer_access');
  function signIn(){sessionStorage.removeItem('bbd_customer_access');location.replace('customer-login.html');}
  if(!token){signIn();return;}
  try{
    const r=await fetch(base+'/customer-api/profile',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(75000)});
    if(r.status===401){signIn();return;}
    if(!r.ok)throw Error('Customer access is temporarily unavailable.');
    for(const old of document.querySelectorAll('script[data-customer-script]')){
      const script=document.createElement('script');script.textContent=old.textContent;old.replaceWith(script);
    }
    const logout=document.createElement('button');logout.type='button';logout.textContent='Sign out';
    logout.onclick=async()=>{logout.disabled=true;try{const response=await fetch(base+'/customer-auth/logout',{method:'POST',headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error();signIn();}catch{logout.disabled=false;logout.textContent='Unable to sign out. Try again';}};
    document.querySelector('header').append(logout);document.getElementById('customer-lock')?.remove();
  }catch{
    document.body.replaceChildren();const p=document.createElement('p');p.textContent='Unable to verify your session. Refresh to try again.';p.style.cssText='padding:40px;font:18px Arial';document.body.append(p);document.getElementById('customer-lock')?.remove();
  }
})();
