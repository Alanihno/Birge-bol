const fs=require('node:fs'),ts=require('typescript');
const existing=Object.assign({},...['kk','kk-contest','kk-content','kk-community'].map(name=>JSON.parse(fs.readFileSync('src/locales/'+name+'.json','utf8'))));
const list=JSON.parse(fs.readFileSync('.preview/prompt4-copy.json','utf8'));
for(const f of ['src/lib/pwa-context.tsx','src/lib/update-safety.ts']){const sf=ts.createSourceFile(f,fs.readFileSync(f,'utf8'),ts.ScriptTarget.Latest,true,f.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);function visit(n){if(ts.isStringLiteral(n)&&/[А-Яа-я]/.test(n.text))list.push(n.text);ts.forEachChild(n,visit);}visit(sf);}
for(const r of JSON.parse(fs.readFileSync('src/domain/prompt4-volunteers.json')))list.push(r.title,r.body,...r.answers);
for(const r of JSON.parse(fs.readFileSync('src/domain/prompt4-providers.json')))list.push(r.specialty,r.description);
list.push('Данные Минпросвещения РК, октябрь 2026','Источник','Нура','Есильский','Байконурский');
const source=[...new Set(list)].filter(s=>s&&!existing[s]&&!/^https?:/.test(s));fs.writeFileSync('.preview/prompt4-missing.json',JSON.stringify(source));console.log('Additional Kazakh strings: '+source.length);
