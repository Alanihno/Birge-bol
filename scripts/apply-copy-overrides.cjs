const fs=require('node:fs'),ts=require('typescript'),pairs=JSON.parse(fs.readFileSync('src/locales/copy-overrides.json','utf8'));
function walk(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]);}
for(const p of walk('src').filter(p=>p.endsWith('.tsx'))){let s=fs.readFileSync(p,'utf8');const sf=ts.createSourceFile(p,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[];function visit(n){if(ts.isStringLiteral(n)&&pairs[n.text.trim()])edits.push({start:n.getStart(sf),end:n.end,text:JSON.stringify(pairs[n.text.trim()].ru)});ts.forEachChild(n,visit);}visit(sf);edits.sort((a,b)=>b.start-a.start).forEach(e=>s=s.slice(0,e.start)+e.text+s.slice(e.end));fs.writeFileSync(p,s);}
const p='src/locales/kk-community.json',dict=JSON.parse(fs.readFileSync(p));for(const value of Object.values(pairs))dict[value.ru]=value.kk;fs.writeFileSync(p,JSON.stringify(dict,null,2)+'\n');
console.log('Remaining interface prototype labels replaced');
