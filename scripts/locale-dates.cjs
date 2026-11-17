const fs=require('node:fs');
for(const p of ['src/components/specialist-card.tsx','src/pages/support.tsx']){let s=fs.readFileSync(p,'utf8');s=s.replace("import { tr, useLocale }","import { tr, useLocale, locale }").replaceAll("toLocaleDateString('ru-RU'","toLocaleDateString(locale()").replaceAll("toLocaleString('ru-RU'","toLocaleString(locale()");fs.writeFileSync(p,s);}
const p='src/components/specialist-card.tsx';fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace('ПМПК · бесплатно','Бесплатно'));
