const apiBase='https://built-by-davila-backend.onrender.com';
const invite=new URLSearchParams(location.hash.slice(1)).get('invite')||sessionStorage.getItem('bbd_customer_invite')||'';
if(invite)sessionStorage.setItem('bbd_customer_invite',invite);
history.replaceState(null,'',location.pathname+location.search);
const element=id=>document.getElementById(id);
if(invite){element('title').textContent='Set your customer password';element('description').textContent='Use the customer contact email provided to Built by Davila. Choose a password of at least 12 characters. This invitation works once.';element('password').minLength=12;element('password').autocomplete='new-password';element('submit').textContent='Set password and sign in';}
element('login').onsubmit=async event=>{
 event.preventDefault();const button=element('submit'),message=element('message');button.disabled=true;message.textContent='Signing in…';
 try{
  const response=await fetch(apiBase+'/customer-auth/'+(invite?'setup':'login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:element('email').value,password:element('password').value,...(invite?{invite}:{})}),signal:AbortSignal.timeout(75000)});
  const result=await response.json();if(!response.ok||!result.token)throw Error(result.error||'Unable to sign in.');
  sessionStorage.setItem('bbd_customer_access',result.token);sessionStorage.removeItem('bbd_customer_invite');element('password').value='';location.replace('client-portal.html');
 }catch(error){message.textContent=error.message;}finally{button.disabled=false;}
};
