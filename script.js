
const header=document.querySelector('.site-header');
const nav=document.querySelector('.main-nav');
const toggle=document.querySelector('.menu-toggle');
window.addEventListener('scroll',()=>header?.classList.toggle('scrolled',window.scrollY>20));
toggle?.addEventListener('click',()=>nav?.classList.toggle('open'));
document.querySelectorAll('.main-nav a').forEach(a=>a.addEventListener('click',()=>nav?.classList.remove('open')));
document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
