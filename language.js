(()=>{'use strict';
const originals=new WeakMap(),attrs=new WeakMap();let dict={},lang='en',pending=false;
const norm=s=>s.replace(/\s+/g,' ').trim();
const stored=()=>{try{return localStorage.getItem('bbd_language')}catch{return null}};
const requested=new URLSearchParams(location.search).get('lang');lang=['en','es'].includes(requested)?requested:(stored()==='es'?'es':'en');
function lookup(s){
 const key=norm(s);if(dict[key])return dict[key];
 let m;
 if((m=key.match(/^Last saved (.+)$/)))return 'Último guardado '+m[1];
 if((m=key.match(/^Preparing (.+) for your website…$/)))return 'Preparando '+m[1]+' para su sitio web…';
 if((m=key.match(/^Uploading (.+) \((\d+) of (\d+)\)…$/)))return 'Subiendo '+m[1]+' ('+m[2]+' de '+m[3]+')…';
 if((m=key.match(/^(\d+) files? uploaded\.$/)))return m[1]+' archivo'+(m[1]==='1'?'':'s')+' subido'+(m[1]==='1'?'':'s')+'.';
 if((m=key.match(/^(Logo|Photos|Brand guidelines|Website content|Other)( · .+)$/)))return (dict[m[1]]||m[1])+m[2];
 if((m=key.match(/^(Submitted|Approved|Published|Changes requested)( · .+)$/)))return (dict[m[1]]||m[1])+m[2].replace(' · Published',' · Publicado');
 return s;
}
function translate(root=document){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement?.closest('script,style,[data-language-control],textarea,[data-key],[contenteditable],.browser .site,#editor-browser,.site-logo')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
 for(const o of root.querySelectorAll?.('select option')??[])if(!o.hasAttribute('value'))o.value=o.textContent;
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const n of nodes){let original=originals.get(n);if(original===undefined||(n.textContent!==original&&n.textContent!==lookup(original))){original=n.textContent;originals.set(n,original)}const target=lang==='es'?lookup(original):original;if(n.textContent!==target)n.textContent=target;}
 for(const el of root.querySelectorAll?.('[placeholder],[aria-label],img[alt],meta[name="description"],input[type="submit"]')??[]){
  let saved=attrs.get(el);if(!saved){saved={};for(const a of ['placeholder','aria-label','alt','content'])if(el.hasAttribute(a))saved[a]=el.getAttribute(a);attrs.set(el,saved)}
  for(const [a,v]of Object.entries(saved)){const t=lang==='es'?lookup(v):v;if(el.getAttribute(a)!==t)el.setAttribute(a,t)}
 }
 document.documentElement.lang=lang;
}
window.bbdTranslate=s=>lang==='es'?lookup(s):s;
function setLanguage(value){lang=value;try{localStorage.setItem('bbd_language',lang)}catch{}const url=new URL(location.href);url.searchParams.set('lang',lang);history.replaceState(null,'',url);translate();control.querySelectorAll('button').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.lang===lang))});}
const control=document.createElement('div');control.dataset.languageControl='';control.className='bbd-language';control.setAttribute('role','group');control.setAttribute('aria-label','Language / Idioma');
control.innerHTML='<button type="button" data-lang="en" lang="en" aria-label="English">EN</button><button type="button" data-lang="es" lang="es" aria-label="Español">ES</button>';
const style=document.createElement('style');style.textContent='.bbd-language{display:inline-flex;gap:2px;align-items:center;border:1px solid #17191820;border-radius:9px;background:#f3f1ec;padding:3px;margin:0 0 0 16px;flex-shrink:0}.bbd-language button{line-height:1.2;font-family:inherit;font-size:11px;font-weight:700;letter-spacing:.04em;cursor:pointer;background:transparent;color:#555;padding:7px 9px;border:0;border-radius:6px;min-width:32px}.bbd-language button[aria-pressed="true"]{background:#ff5a36;color:#fff;box-shadow:0 1px 3px #0001}.bbd-language button:hover{color:#171918}.bbd-language button[aria-pressed="true"]:hover{color:#fff}.bbd-language button:focus-visible{outline:2px solid #ff5a36;outline-offset:3px}.bbd-language-floating{position:fixed;right:16px;top:16px;z-index:1000;box-shadow:0 3px 12px #0002}@media(max-width:960px){.site-header .bbd-language{margin-left:12px}.site-header .bbd-language button{padding:6px 7px}}';document.head.append(style);
const header=document.querySelector('.site-header .nav-wrap')||document.querySelector('.site-header .container')||document.querySelector('.site-header');if(header)header.append(control);else{control.classList.add('bbd-language-floating');document.body.append(control)}
control.addEventListener('click',e=>{const b=e.target.closest('button');if(b)setLanguage(b.dataset.lang)});
// Keep submission values stable while translating option labels.
document.querySelectorAll('select option').forEach(o=>{if(!o.hasAttribute('value'))o.value=o.textContent});
fetch('translations-es.json?v=20261007-editor-page').then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>{dict=d;setLanguage(lang);new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;translate()})}).observe(document.body,{childList:true,characterData:true,subtree:true});}).catch(()=>{control.hidden=true;document.documentElement.lang='en'});
})();

