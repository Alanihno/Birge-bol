const fs=require('node:fs'),ts=require('typescript');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);}
for(const file of walk('src').filter(f=>f.endsWith('.tsx')&&!f.endsWith('message-translation.tsx'))){
 let source=fs.readFileSync(file,'utf8'),sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[],used=false;
 function visit(n){
  if(ts.isJsxText(n)&&/[А-Яа-яЁё]/.test(n.text)){edits.push({start:n.getStart(sf),end:n.end,text:'{tr('+JSON.stringify(n.text.replace(/\s+/g,' ').trim())+')}'});used=true;return;}
  if(ts.isJsxExpression(n)&&n.expression&&!ts.isJsxAttribute(n.parent)&&!ts.isJsxSpreadAttribute(n.parent)){
   const e=n.expression;if(!(ts.isCallExpression(e)&&e.expression.getText(sf)==='tr')){edits.push({start:e.getStart(sf),end:e.getStart(sf),text:'tr('},{start:e.end,end:e.end,text:')'});used=true;}
  }
  if(ts.isJsxAttribute(n)&&['title','aria-label','placeholder','alt','label','description','eyebrow'].includes(n.name.getText(sf))&&n.initializer&&ts.isStringLiteral(n.initializer)&&/[А-Яа-яЁё]/.test(n.initializer.text)){edits.push({start:n.initializer.getStart(sf),end:n.initializer.end,text:'{tr('+JSON.stringify(n.initializer.text)+')}'});used=true;}
  ts.forEachChild(n,visit);
 }visit(sf);
 edits.sort((a,b)=>b.start-a.start||b.end-a.end).forEach(e=>source=source.slice(0,e.start)+e.text+source.slice(e.end));
 if(used&&!/import\s*\{[^}]*\btr\b[^}]*\}\s*from\s*['"][^'"]*i18n['"]/.test(source))source="import { tr } from '"+(file.split('/').length===2?'./lib/i18n':'../lib/i18n')+"';\n"+source;
 fs.writeFileSync(file,source);
}
const dictionary={...JSON.parse(fs.readFileSync('src/locales/kk.json','utf8')),...JSON.parse(fs.readFileSync('src/locales/kk-contest.json','utf8')),...JSON.parse(fs.readFileSync('src/locales/kk-content.json','utf8'))},missing=new Set();
for(const file of walk('src').filter(f=>/\.(tsx?|json)$/.test(f)&&!f.includes('/locales/')&&!f.includes('database.types'))){const source=fs.readFileSync(file,'utf8');if(file.endsWith('.json'))continue;const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);function visit(n){if(ts.isStringLiteral(n)&&/[А-Яа-яЁё]/.test(n.text)&&!dictionary[n.text.trim()]&&!/[ӘәҒғҚқҢңӨөҰұҮүҺһІі]/.test(n.text)&&n.text.length<5000)missing.add(n.text.trim());ts.forEachChild(n,visit);}visit(sf);}
fs.mkdirSync('.preview',{recursive:true});fs.writeFileSync('.preview/translation-missing.json',JSON.stringify([...missing].sort(),null,2));console.log('Missing dictionary strings:',missing.size);
