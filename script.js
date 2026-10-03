const header=document.querySelector('.site-header');
const nav=document.querySelector('.main-nav');
const toggle=document.querySelector('.menu-toggle');
function closeMenu(){nav?.classList.remove('open');toggle?.setAttribute('aria-expanded','false');toggle?.setAttribute('aria-label','Open navigation')}
window.addEventListener('scroll',()=>header?.classList.toggle('scrolled',window.scrollY>20),{passive:true});
toggle?.addEventListener('click',()=>{const open=nav?.classList.toggle('open');toggle.setAttribute('aria-expanded',String(Boolean(open)));toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation')});
document.querySelectorAll('.main-nav a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav?.classList.contains('open')){closeMenu();toggle?.focus()}});
window.addEventListener('resize',()=>{if(window.innerWidth>960)closeMenu()});
document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
