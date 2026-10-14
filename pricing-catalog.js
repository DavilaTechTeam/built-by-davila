/* Standard rate card and deterministic quote calculations. Amounts are USD. */
(()=>{'use strict';
const catalog=[
 ['website','setup','Custom website — up to 5 pages, mobile-friendly',1800,'Website design'],
 ['form','setup','Catering / business inquiry form',250,'Website design'],
 ['seo','setup','Basic SEO setup — titles, descriptions, indexing',250,'Website design'],
 ['dns','setup','Domain connection and DNS setup',100,'Domain registration'],
 ['host-setup','setup','Hosting and HTTPS setup',100,'Hosting & maintenance'],
 ['logo','setup','Existing logo cleanup / recreation',200,'Logo & branding'],
 ['facebook','setup','Facebook business page creation and configuration',250,'Facebook setup'],
 ['social-brand','setup','Facebook profile and cover graphics',150,'Facebook setup'],
 ['meta','setup','Meta Business Suite and ad account setup',200,'Paid advertising'],
 ['launch-posts','setup','Three launch posts — graphics and captions',150,'Facebook setup'],
 ['hosting','monthly','Website hosting, HTTPS, and maintenance',75,'Hosting & maintenance'],
 ['updates','monthly','Website content updates — up to 1 hour/month',75,'Website design'],
 ['posts8','monthly','Facebook content — 8 posts/month',250,'Facebook management'],
 ['posts12','monthly','Facebook content — 12 posts/month',350,'Facebook management'],
 ['inbox','monthly','Inbox and comments — 2 weekday checks, up to 3 hours/month',150,'Facebook management'],
 ['ads','monthly','Ad management — 1 campaign, up to 2 ad variations',150,'Paid advertising'],
 ['report','monthly','Monthly performance report with management service',0,'Facebook management'],
 ['page','setup','Additional website page',175,'Website design'],
 ['post','setup','Additional social post — graphic and caption',40,'Facebook management'],
 ['hour','setup','Additional work outside agreed scope — hour',75,'Business automation']
].map(([id,cycle,name,price,service])=>({id,cycle,name,price,service}));
function fail(message){throw Object.assign(new Error(message),{status:400});}
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
function number(v,label,max=1000000){if(v===''||v===null||typeof v==='boolean'||(typeof v!=='number'&&typeof v!=='string'))fail('Enter a valid '+label+'.');const n=Number(v);if(!Number.isFinite(n)||n<0||n>max)fail('Enter a valid '+label+'.');return n;}
function calculate(input){
 if(!Array.isArray(input.items)||!input.items.length||input.items.length>60)fail('Select at least one service for this quote.');
 const ids=new Set(),items=input.items.map(raw=>{if(!raw||typeof raw!=='object')fail('Invalid quote service.');const known=catalog.find(c=>c.id===raw.id),id=String(raw.id||'');if(!known&&!/^custom-[a-zA-Z0-9_-]{1,60}$/.test(id))fail('Invalid service selection.');if(ids.has(id))fail('A service is listed more than once.');ids.add(id);const name=String(raw.name??known?.name??'').trim();if(!name||name.length>300)fail('Enter a service description under 300 characters.');const cycle=raw.cycle??known?.cycle;if(!['setup','monthly'].includes(cycle))fail('Choose one-time or monthly billing.');const quantity=round(number(raw.quantity,'quantity',1000));if(quantity<=0)fail('Quantity must be greater than zero.');const price=round(number(raw.price,'service price'));if(raw.complimentary!=null&&typeof raw.complimentary!=='boolean')fail('Invalid complimentary selection.');const complimentary=raw.complimentary===true,value=round(quantity*price);return {id,name,cycle,quantity,price,complimentary,value,amount:complimentary?0:value};});
 if(ids.has('posts8')&&ids.has('posts12'))fail('Choose either 8 or 12 monthly posts, not both.');
 const discount={type:input.setup_discount?.type||'none',value:0};if(!['none','fixed','percent'].includes(discount.type))fail('Choose a valid setup discount.');if(discount.type!=='none')discount.value=number(input.setup_discount?.value,'setup discount',discount.type==='percent'?100:1000000);
 const total=cycle=>round(items.filter(i=>i.cycle===cycle).reduce((n,i)=>n+i.amount,0)),value=cycle=>round(items.filter(i=>i.cycle===cycle).reduce((n,i)=>n+i.value,0));
 const setup_before_discount=total('setup'),setup_value=value('setup'),setup_discount=discount.type==='percent'?round(setup_before_discount*discount.value/100):discount.type==='fixed'?round(discount.value):0;
 if(setup_discount>setup_before_discount)fail('Setup discount cannot exceed the payable setup amount.');
 const setup=round(setup_before_discount-setup_discount),monthly=total('monthly'),monthly_value=value('monthly');
 if(Math.max(setup_value,monthly_value)>1000000)fail('Quote total is too large.');
 const deposit=input.deposit==null?50:number(input.deposit,'deposit percentage',100),months=input.months==null||input.months===''?0:number(input.months,'promotional months',60);if(!Number.isInteger(months))fail('Promotional months must be a whole number.');
 const promo=input.promo==null||input.promo===''?null:round(number(input.promo,'promotional monthly price'));if(promo!==null&&(!months||promo>monthly))fail('Enter a promotion duration and a rate no higher than regular monthly pricing.');if(promo===null&&months)fail('Enter a promotional monthly rate, or clear promotional months.');
 return {mode:'catalog',items,setup_discount:discount,setup_value,setup_before_discount,setup_complimentary:round(setup_value-setup_before_discount),setup_discount_amount:setup_discount,setup,monthly,monthly_value,monthly_complimentary:round(monthly_value-monthly),promo,months,deposit,deposit_amount:round(setup*deposit/100),balance:round(setup-round(setup*deposit/100)),starts:String(input.starts||'').trim().slice(0,200),scope:String(input.scope||'').trim().slice(0,4000)};
}
const money=n=>'$'+Number(n).toFixed(2);
function quoteItems(p){if(p.mode!=='catalog')return [{description:p.scope||'Project setup — scope subject to review',quantity:1,unit_price:p.setup??0,amount:p.setup??0}];const rows=p.items.filter(i=>i.cycle==='setup').map(i=>({description:i.name+(i.complimentary?' — COMPLIMENTARY (standard value '+money(i.value)+')':''),quantity:i.quantity,unit_price:i.complimentary?0:i.price,amount:i.amount}));if(p.setup_discount_amount)rows.push({description:'Build-out discount'+(p.setup_discount.type==='percent'?' — '+p.setup_discount.value+'%':''),quantity:1,unit_price:-p.setup_discount_amount,amount:-p.setup_discount_amount});if(!rows.length)rows.push({description:'Monthly services only — no one-time setup charge',quantity:1,unit_price:0,amount:0});return rows;}
function summary(p){return ['Build-out standard value: '+money(p.setup_value)+'.','Complimentary setup services: '+money(p.setup_complimentary)+'.','Additional build-out discount: '+money(p.setup_discount_amount)+'.','Final one-time setup: '+money(p.setup)+'.',...p.items.filter(i=>i.cycle==='monthly').map(i=>'Monthly: '+i.name+' × '+i.quantity+' — '+(i.complimentary?'COMPLIMENTARY (standard value '+money(i.value)+'/month)':money(i.amount)+'/month')+'.'),'Monthly standard value: '+money(p.monthly_value)+'. Complimentary monthly value: '+money(p.monthly_complimentary)+'.','Recurring services are billed separately from the one-time setup total.'].join('\n');}
window.BBDPricing={catalog,calculate,quoteItems,summary};
})();
