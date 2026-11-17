const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),zlib=require('node:zlib');
fs.mkdirSync('docs/prompt5',{recursive:true});
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files=['package.json','package-lock.json',...walk('src'),...walk('supabase'),...walk('tests')];
const assets=fs.existsSync('dist-demo')?walk('dist-demo').filter(f=>/\.(js|css)$/.test(f)).map(f=>({file:f,bytes:fs.statSync(f).size,gzip:zlib.gzipSync(fs.readFileSync(f)).length})):[];
const baseline={date:new Date().toISOString(),head:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:cp.execFileSync('git',['status','--short'],{encoding:'utf8'}),files:files.map(f=>({file:f,sha256:crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')})),assets};
if(!fs.existsSync('docs/prompt5/baseline.json'))fs.writeFileSync('docs/prompt5/baseline.json',JSON.stringify(baseline,null,2));
const source=fs.readFileSync('promt5.txt','utf8');let section='',index=0;
const rows=[];
for(const line of source.split(/\r?\n/)){if(/^#{1,4} /.test(line)){section=line.replace(/^#+ /,'');rows.push('\n### '+section+'\n');}else if(/^\s*(?:- |\d+\. )/.test(line)){rows.push(`- [ ] P5-${String(++index).padStart(4,'0')} · Pending · ${line.trim().replace(/^(?:- |\d+\. )/,'')}`);}}
fs.writeFileSync('IMPLEMENTATION_CHECKLIST.md','# Implementation checklist — Prompt 5\n\nStatuses: Pending; In progress; Implemented; Tested; Blocked by external configuration.\n\nTelegram исключён прямым указанием пользователя. Итоговые статусы разделов и доказательства — FINAL_REPORT.md; нижний список сохраняет все исходные требования для поэлементного аудита. Ни один неподтверждённый пункт не помечается Tested.\n'+rows.join('\n')+'\n');
console.log('Baseline and '+index+' requirement entries recorded.');
