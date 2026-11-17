const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
// Explicit allowlist: never copy local credentials, Git, caches or node_modules.
const stage=path.resolve('.preview/source-handoff'),output=path.resolve('handoff');
if(stage!==path.join(process.cwd(),'.preview','source-handoff'))throw Error('Unsafe staging path');
fs.rmSync(stage,{recursive:true,force:true});
fs.mkdirSync(stage,{recursive:true});fs.mkdirSync(output,{recursive:true});
for(const dir of ['src','public','supabase','tests','scripts','docs'])fs.cpSync(dir,path.join(stage,dir),{recursive:true});
for(const entry of fs.readdirSync('.'))if(/\.md$/.test(entry)||['.env.example','.env.demo','.gitignore','package.json','package-lock.json','ARCHITECTURE.json','index.html','eslint.config.js','playwright.config.ts','vite.config.ts','vercel.json','promt5.txt'].includes(entry)||/^tsconfig.*\.json$/.test(entry))fs.copyFileSync(entry,path.join(stage,entry));
// zipfile avoids shell interpolation and includes the exact staged allowlist.
const code="import pathlib,zipfile,sys; root=pathlib.Path(sys.argv[1]); out=pathlib.Path(sys.argv[2]); z=zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED); [z.write(p,p.relative_to(root)) for p in root.rglob('*') if p.is_file()]; z.close()";
for(const [root,name]of [[stage,'Birge-Bol-source.zip'],[path.resolve('деплой версель'),'Birge-Bol-demo.zip']]){if(!fs.existsSync(root))throw Error('Missing package source: '+root);const result=cp.spawnSync('python',['-c',code,root,path.join(output,name)],{encoding:'utf8'});if(result.status!==0)throw Error(result.stderr||'Archive failed');}
fs.writeFileSync(path.join(output,'README.md'),'# Birge Bol — передача\n\nBirge-Bol-source.zip — исходники, миграции, проверки и документация. Локальные секреты исключены.\nBirge-Bol-demo.zip — статическая демонстрация с синтетическими данными в браузере, без подключения к рабочей БД.\nСначала прочитайте FINAL_REPORT.md, DEPLOYMENT.md и SECURITY.md внутри исходников.\n');
console.log('Source and demo archives ready in handoff/.');
