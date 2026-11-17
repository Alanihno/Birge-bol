const fs=require('node:fs');
let p='src/lib/i18n.ts',s=fs.readFileSync(p,'utf8');s=s.replace('...kk,...contestKk,...contentKk,','...kk,...contestKk,...contentKk,...communityKk,');fs.writeFileSync(p,s);
p='src/pages/team.tsx';s=fs.readFileSync(p,'utf8').replace('{tr(g.stage)}','{tr(g.stage||1)}');fs.writeFileSync(p,s);
