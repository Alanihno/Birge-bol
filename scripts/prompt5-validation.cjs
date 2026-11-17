const fs=require('node:fs');
const p='tests/family-clinic.spec.ts';fs.writeFileSync(p,fs.readFileSync(p,'utf8').replaceAll('Тест Амина · демо','Тест Амина').replaceAll('Тест Данияр · демо','Тест Данияр'));
const pkg='scripts/package-vercel-demo.cjs';fs.writeFileSync(pkg,fs.readFileSync(pkg,'utf8').replace("object-src 'none';","frame-src https://www.youtube-nocookie.com; object-src 'none';"));
const file='src/lib/backend.ts';let text=fs.readFileSync(file,'utf8');text=text.replace("const url=import.meta.env.VITE_SUPABASE_URL;", "const url=import.meta.env.VITE_SUPABASE_URL;");fs.writeFileSync(file,text);
console.log('Legacy fixture assertions aligned with the existing public labels.');
