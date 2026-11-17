const fs=require('fs'),path=require('path');
function walk(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,d.name);if(d.isDirectory())walk(f);else if(f.endsWith('.tsx')){let s=fs.readFileSync(f,'utf8');s=s.replace(/\\u([0-9a-f]{4})/gi,(m,h)=>{const n=parseInt(h,16);return n>=0x400&&n<=0x4ff?String.fromCharCode(n):m;});fs.writeFileSync(f,s);}}}walk('src');
const edit=(f,fn)=>fs.writeFileSync(f,fn(fs.readFileSync(f,'utf8')));
edit('src/pages/find.tsx',s=>s.replace('${s.name} ${s.specialty} ${s.description}', '${s.name} ${s.specialty} ${tr(s.specialty)} ${s.description} ${tr(s.description)}'));
edit('src/pages/explain.tsx',s=>s.replace("normalize(t.term + ' ' + t.title)","normalize(t.term + ' ' + t.title + ' ' + tr(t.term) + ' ' + tr(t.title))"));
const file='src/locales/kk.json',d=JSON.parse(fs.readFileSync(file,'utf8'));Object.assign(d,{'из':'/','Цена: от 0 до':'Ең жоғары баға:','Бюджет за занятие: до':'Бір сабақтың ең жоғары бағасы:','Ср':'Ср','Указанные данные':'Көрсетілген деректер'});fs.writeFileSync(file,JSON.stringify(d,null,2)+'\n');
edit('src/components/layout.tsx',s=>s.replace('12.11.3','12.11.4'));
console.log('Copy and bilingual search finalized');
