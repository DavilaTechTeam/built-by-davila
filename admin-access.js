/* Management pages remain inactive until the server validates an admin session. */
(async () => {
  const lock = document.getElementById('admin-lock');
  function deny(message) {
    document.body.replaceChildren();
    const main = document.createElement('main');
    main.style.cssText = 'max-width:600px;margin:80px auto;padding:24px;font-family:Arial,sans-serif';
    const title = document.createElement('h1'); title.textContent = 'Administrator sign-in required';
    const p = document.createElement('p'); p.textContent = message;
    const a = document.createElement('a'); a.href = 'studio.html'; a.textContent = 'Sign in to Studio';
    main.append(title, p, a); document.body.append(main); lock?.remove();
  }
  const token = sessionStorage.getItem('bbd_token');
  if (!token) { deny('Sign in to access your management tools.'); return; }
  try {
    const r = await fetch('https://built-by-davila-backend.onrender.com/api/auth/session', {
      headers: {Authorization: 'Bearer ' + token}, signal: AbortSignal.timeout(75000)
    });
    const data = await r.json();
    if (!r.ok || data.authenticated !== true || data.role !== 'admin') {
      if (r.status === 401) sessionStorage.removeItem('bbd_token');
      deny(data.error || 'Your administrator session could not be verified.'); return;
    }
    for (const old of Array.from(document.querySelectorAll('script[data-admin-script]'))) {
      const script = document.createElement('script');
      for (const attr of old.attributes) if (!['type','data-admin-script'].includes(attr.name)) script.setAttribute(attr.name, attr.value);
      script.textContent = old.textContent;
      if (script.src) {
        await new Promise((resolve, reject) => {script.onload=resolve;script.onerror=reject;old.replaceWith(script);});
      } else old.replaceWith(script);
    }
    lock?.remove();
  } catch { deny('Unable to verify your session. Please try again when the server is available.'); }
})();