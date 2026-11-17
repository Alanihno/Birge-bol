const fs=require('node:fs');const edit=(p,fn)=>fs.writeFileSync(p,fn(fs.readFileSync(p,'utf8')));
edit('src/main.tsx',s=>s+"\nimport './update.css';\n");
edit('src/components/specialist-card.tsx',s=>{
 s="import {DemoSpecialistBadge} from './demo-specialist-badge';\nimport {formatExperience,formatReviews,formatRating} from '../lib/display-numbers';\n"+s;
 s=s.replace('const reliability=','const reviewCount=rating?.review_count??care.data?.specialists.find(item=>item.id===s.id)?.verified_count??s.verified_count;const reliability=');
 s=s.replace('{tr("Стаж: ")}{tr(s.experience)}{tr("лет")}','{formatExperience(s.experience,language)}');
 s=s.replace('<div className="muted tiny"><Clock','<DemoSpecialistBadge show={s.is_demo}/><div className="muted tiny"><Clock');
 s=s.replace("{tr(rating?.overall ?? s.contact_rating ?? '—')}",'{formatRating(rating?.overall??s.contact_rating,language)}');
 s=s.replace("{tr(`${s.verified_count} подтверждённых отзывов${s.is_demo?\"\":''}`)}",'{formatReviews(reviewCount,language)}');
 s=s.replace('rating.similar?.toFixed(2)','formatRating(rating.similar,language)');return s;
});
edit('src/pages/specialist.tsx',s=>{
 s="import {DemoSpecialistBadge} from '../components/demo-specialist-badge';\nimport {MessageTranslation} from '../components/message-translation';\nimport {formatExperience,formatReviews,formatRating} from '../lib/display-numbers';\n"+s;
 s=s.replace('    useLocale();','    const language=useLocale();');
 s=s.replace('<h1>{tr(s.name)}</h1>','<h1>{tr(s.name)}</h1><DemoSpecialistBadge show={s.is_demo}/>');
 s=s.replace('{tr("Стаж ")}{tr(s.experience)}{tr("лет · ")}{tr(s.district)}','{formatExperience(s.experience,language)} · {tr(s.district)}');
 s=s.replace("{tr(rating?.overall ?? s.contact_rating ?? 'Пока нет опубликованных отзывов')} · {tr(s.verified_count)}{tr(\"подтверждённых отзывов\")}",'{formatRating(rating?.overall??s.contact_rating,language)} · {formatReviews(rating?.review_count??s.verified_count,language)}');
 s=s.replaceAll('rating.overall?.toFixed(2)','formatRating(rating.overall,language)').replaceAll('rating.similar?.toFixed(2)','formatRating(rating.similar,language)');
 s=s.replace('<p>{tr(r.body)}</p>','{r.case_summary&&<p className="case-context">{tr(r.case_summary)}</p>}<MessageTranslation message={r} kind="review"/>');return s;
});
edit('src/pages/clinics.tsx',s=>"import {DemoSpecialistBadge} from '../components/demo-specialist-badge';\n"+s.replace('<strong>{tr(s.name)}</strong>','<strong>{tr(s.name)}</strong><DemoSpecialistBadge show={s.is_demo}/>'));
edit('src/domain/care.ts',s=>s.replace('export type CareReview = {','export type CareReview = {case_summary?:string|null;'));
edit('src/components/message-translation.tsx',s=>s.replace("'question'|'answer'","'question'|'answer'|'review'"));
edit('src/pages/landing.tsx',s=>{
 s="import {useQuery} from '@tanstack/react-query';\nimport {repository} from '../lib/repository';\n"+s;
 s=s.replace('    const start =',"    const catalog=useQuery({queryKey:['catalog'],queryFn:()=>repository.catalog(),staleTime:30000});\n    const showcase=catalog.data?.find(s=>s.id===demoSpecialists[0].id);\n    const start =");
 s=s.replace('specialist={demoSpecialists[0]}','specialist={showcase||demoSpecialists[0]}');
 s=s.replace('Данные из материалов проекта. Первоисточники пока не подтверждены; цифры не описывают пользователей Birge Bol.','Данные Минпросвещения РК, октябрь 2026');
 s=s.replace('{tr("Данные Минпросвещения РК, октябрь 2026")}', '{tr("Данные Минпросвещения РК, октябрь 2026")} · <a href="https://www.gov.kz/org/edu/press/news/details/1320014?lang=ru" target="_blank" rel="noopener noreferrer">{tr("Источник")}</a>');return s;
});
edit('src/pages/find.tsx',s=>s.replace('specialties.map(s =>','[...new Set([...specialties,...catalog.map(s=>s.specialty)])].sort().map(s =>').replace('districts.map(d =>','[...new Set([...districts,...catalog.map(s=>s.district)])].sort().map(d =>'));
edit('src/lib/presentation-copy.ts',s=>s.replace(' return text'," if(text==='Вымышленный специалист · демо'||text==='Ойдан шығарылған маман · демо')return text;\n return text"));
edit('src/lib/pwa-context.tsx',s=>s.replace("reg.addEventListener('updatefound',found);if(reg.waiting)","reg.addEventListener('updatefound',found);if(reg.installing)found();if(reg.waiting)"));
let p='vercel.json',config=JSON.parse(fs.readFileSync(p));config.headers[0].headers.push({key:'Cache-Control',value:'no-cache, must-revalidate'});fs.writeFileSync(p,JSON.stringify(config,null,2)+'\n');
console.log('Prompt4 display fixes integrated');
