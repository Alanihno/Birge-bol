const fs=require('fs');
function edit(file,fn){fs.writeFileSync(file,fn(fs.readFileSync(file,'utf8')));}
edit('src/pages/home.tsx',s=>s.replace('30 СЕК','13 СЕК'));
edit('src/domain/data.ts',s=>s.replace('price:8000+(i%7)*2000','price:i%5===0?0:8000+(i%7)*2000'));
edit('src/lib/journey.ts',s=>s.replace("fullName:s.name.replace(/\.$/,'')+' · учебный профиль'","fullName:['Сарсенова Айгерим Маратовна','Алимова Дана Сериковна','Касымова Мадина Аскаровна','Тлеубаева Алия Ерлановна','Бекова Аружан Данияровна','Муратова Жанар Сериковна'][i%6]+' · вымышленный пример'"));
edit('src/lib/repository.ts',s=>s.replace('export function resetDemo(){','export function resetDemo(){localStorage.removeItem(\'bb-journey-v2\');'));
edit('src/pages/feedback.tsx',s=>s.replace('<select value={specialist}', '<select disabled={!!booking} value={specialist}'));
edit('src/pages/specialist.tsx',s=>s.replace('const docs=journey.documents.filter(d=>d.childId===activeChild.id);',"const docs=[...journey.documents.filter(d=>d.childId===activeChild.id),...journey.bookings.filter(b=>b.childId===activeChild.id&&b.status==='completed').map(b=>({id:b.id,childId:b.childId,kind:'История приёма',name:`Приём ${b.name} · ${new Date(b.startsAt).toLocaleDateString('ru')} · демо`}))];"));
edit('src/pages/other.tsx',s=>s.replace('профили, цели, вопросы и избранное этого деморежима','профили, записи, документы, вопросы и ответы этого деморежима'));
edit('vite.config.ts',s=>s.replace("'audio/*.wav'","'audio/*.wav','portraits/*.svg','video/*.webm','video/*.vtt'").replace("start_url:'/find'","start_url:'/'").replace("Найти. Понять. Видеть прогресс.","Специалисты, приёмы и поддержка рядом.").replace('svg,png,woff2,wav','svg,png,woff2,wav,webm,vtt'));
edit('vercel.json',s=>s.replace('assets/|icons/|audio/|','assets/|icons/|audio/|portraits/|video/|'));
console.log('Demo content and PWA updated');
