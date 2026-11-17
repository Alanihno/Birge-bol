const fs=require('node:fs');
const missing=JSON.parse(fs.readFileSync('.preview/translation-missing.json','utf8'));
const rows=JSON.parse(fs.readFileSync('src/domain/expanded-community.json','utf8'));
const phrases=rows.flatMap(r=>[r.title,r.body,...r.answers]);
const existing={...JSON.parse(fs.readFileSync('src/locales/kk.json')),...JSON.parse(fs.readFileSync('src/locales/kk-contest.json')),...JSON.parse(fs.readFileSync('src/locales/kk-content.json'))};
const all=[...new Set([...missing,...phrases,'Новая ветка','Рекомендации команды','Общий план'])].filter(s=>!existing[s]&&!/^\/|@|^https?:/.test(s));
fs.writeFileSync('.preview/community-translations.json',JSON.stringify(all));console.log(all.length);
