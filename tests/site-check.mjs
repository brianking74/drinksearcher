import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=process.cwd();
const required=['index.html','drinks.html','product.html','suppliers.html','supplier-template.html','bars-restaurants.html','venue-template.html','events.html','pricing.html','list-your-business.html','signin.html','signup.html','account.html','dashboard.html'];
let failures=[];
for(const file of required){
 const full=path.join(root,file);
 if(!fs.existsSync(full)){failures.push(`Missing route: ${file}`);continue}
 const html=fs.readFileSync(full,'utf8');
 for(const asset of ['assets/css/styles.css','assets/css/premium.css','assets/js/app.js','assets/js/premium.js']){
  if(!html.includes(asset)) failures.push(`${file} missing ${asset}`);
 }
 for(const href of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)){
  const value=href[1];
  if(/^(https?:|#|mailto:|tel:)/.test(value))continue;
  const clean=value.split(/[?#]/)[0];
  if(clean&&!fs.existsSync(path.join(root,clean)))failures.push(`${file} broken local reference: ${value}`);
 }
}
for(const file of ['assets/js/data.js','assets/js/app.js','assets/js/premium.js']){
 try{new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file})}catch(e){failures.push(`${file} syntax: ${e.message}`)}
}
const premium=fs.readFileSync(path.join(root,'assets/js/premium.js'),'utf8');
for(const phrase of ['Compare drinks in stock across Hong Kong','Verified HK stock','Choose your level of visibility','Price & restock alerts','Business dashboard']) if(!premium.includes(phrase)) failures.push(`Missing required experience copy: ${phrase}`);
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log(`Site check passed: ${required.length} routes, local references, scripts and key marketplace experiences verified.`);
