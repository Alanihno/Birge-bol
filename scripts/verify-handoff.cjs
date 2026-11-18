const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');
const code=`import zipfile,sys,json,re
rows=[]
for archive in sys.argv[1:]:
 with zipfile.ZipFile(archive) as z:
  names=z.namelist()
  forbidden=[n for n in names if re.search(r'(^|/)(?:\\.env\\.local|\\.git|node_modules)(?:/|$)',n) or re.search(r'(?:promt\\d+|prompt\\d+|Birge_Bol_Codex_Master_Prompt)\\.txt$',n,re.I)]
  bad=z.testzip()
  rows.append({'archive':archive,'entries':len(names),'forbidden':forbidden,'integrityError':bad})
print(json.dumps(rows))
sys.exit(1 if any(r['forbidden'] or r['integrityError'] for r in rows) else 0)`;
const archives=['handoff/Birge-Bol-source.zip','handoff/Birge-Bol-demo.zip','деплой версель.zip'];const r=cp.spawnSync('python',['-c',code,...archives],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr||r.stdout);const report=JSON.parse(r.stdout);fs.writeFileSync('docs/qa/handoff-check.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.map(r=>({archive:path.basename(r.archive),entries:r.entries,forbidden:r.forbidden.length,integrityError:r.integrityError}))));
