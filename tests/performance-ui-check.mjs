import fs from 'node:fs';
const app=fs.readFileSync('assets/js/app.js','utf8');
const premium=fs.readFileSync('assets/js/premium.js','utf8');
const css=fs.readFileSync('assets/css/premium.css','utf8');
const failures=[];
for(const page of ['home','drinks','suppliers','events','venues']){
  if(!premium.includes(`'${page}'`)) failures.push(`Premium router missing ${page}`);
}
if(!app.includes('DrinkSearcherPremium.renderMain(page)')) failures.push('Main pages still wait for async Supabase render instead of immediate premium render');
if(!premium.includes("window.DrinkSearcherPremium")) failures.push('Premium renderer is not exposed to the synchronous route bootstrap');
if(!premium.includes('<video class="hero-video"')) failures.push('Homepage hero video markup missing');
if(!css.includes('#efefef')) failures.push('Product image background #efefef missing');
if(!css.includes('white-space:nowrap')) failures.push('One-line primary title rule missing');
if(!premium.includes('brand-logo')) failures.push('Attached logo is not used by premium chrome');
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('Performance/UI regression checks passed.');
