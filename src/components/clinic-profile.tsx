import {useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {ChevronDown,MapPin,Star} from 'lucide-react';
import type {CareState,Clinic} from '../domain/care';
import {useLocale,tr} from '../lib/i18n';
import {money} from '../domain/logic';
import {ClinicContact} from './clinic-contact';
import {SpecialistPhoto} from './specialist-photo';
import {DemoSpecialistBadge} from './demo-specialist-badge';
import {useRatings} from '../lib/ratings';
import {formatRating} from '../lib/display-numbers';
import {Empty} from './ui';
export function ClinicProfile({clinic,state}:{clinic:Clinic;state:CareState}){
 const language=useLocale(),ratings=useRatings(),[tab,setTab]=useState('about'),[query,setQuery]=useState(''),[open,setOpen]=useState('');
 const score=(id:string)=>formatRating(ratings.data?.find(r=>r.specialist_id===id)?.overall??null,language);
 const members=useMemo(()=>{const ids=new Set(state.members.filter(m=>m.clinic_id===clinic.id&&m.status==='active').map(m=>m.specialist_id));return state.specialists.filter(s=>ids.has(s.id));},[clinic.id,state.members,state.specialists]);
 const slots=useMemo(()=>{const ids=new Set(members.map(s=>s.id));return state.slots.filter(s=>ids.has(s.specialist_id)&&s.available&&Date.parse(s.starts_at)>Date.now());},[members,state.slots]);
 const offers=Array.from(new Map(slots.slice().sort((a,b)=>b.price-a.price).map(s=>[s.service,s])).values());
 const tabs=[['about',tr("О клинике")],['specialists',tr("Специалисты")],...(clinic.services||offers.length?[['services',tr("Услуги")]]:[]),['contacts',tr("Контакты")]];
 return <div className="clinic-profile stack"><Link className="back" to="/clinics">← {tr("Клиники")}</Link><header className="clinic-profile-head panel"><div className="eyebrow">{tr("КЛИНИКА")}</div><h1>{clinic.name}</h1><p><MapPin size={16}/>{clinic.address||clinic.district}</p><ClinicContact clinic={clinic}/></header><div className="clinic-profile-tabs" role="tablist" aria-label={tr("Разделы клиники")}>{tabs.map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} aria-controls="clinic-profile-panel" onClick={()=>setTab(id)}>{label}{id==='specialists'&&<span>{members.length}</span>}</button>)}</div><section id="clinic-profile-panel" role="tabpanel" className="panel stack">
 {tab==='about'&&<><h2>{tr("О клинике")}</h2><p className="prewrap">{clinic.description||tr('Описание пока не добавлено')}</p>{clinic.services&&<p>{clinic.services}</p>}<div className="card-tags">{Array.from(new Set(members.flatMap(s=>s.ages))).map(age=><span key={age}>{age} {tr("лет")}</span>)}</div></>}
 {tab==='specialists'&&<><h2>{tr("Специалисты клиники")} · {members.length}</h2><label>{tr("Найти специалиста в клинике")}<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="clinic-members">{members.filter(s=>(s.name+' '+tr(s.specialty)).toLowerCase().includes(query.toLowerCase())).map(s=><article className="clinic-member" key={s.id}><button className="clinic-member-toggle" aria-expanded={open===s.id} aria-controls={'member-'+s.id} onClick={()=>setOpen(open===s.id?'':s.id)}><SpecialistPhoto specialist={s}/><span><strong>{s.name}</strong><small>{tr(s.specialty)} · {s.experience} {tr("лет опыта")}</small><small className="rating-line"><Star size={14}/>{score(s.id)}</small><DemoSpecialistBadge show={s.is_demo}/></span><ChevronDown size={20}/></button>{open===s.id&&<div id={'member-'+s.id} className="clinic-member-body"><p>{s.ages.join(', ')} {tr("лет")} · {tr(s.online?'Очно и онлайн':'Очно')}</p><p>{s.description.slice(0,220)}</p><div className="form-actions"><Link className="btn secondary" to={'/specialists/'+s.id}>{tr('Подробнее')}</Link><Link className="btn coral" to={'/specialists/'+s.id+'#booking'}>{tr('Записаться')}</Link></div></div>}</article>)}</div>{!members.length&&<Empty title={tr("Специалисты пока не добавлены")} description={tr("Уточните доступные услуги у клиники.")}/>}</>}
 {tab==='services'&&<><h2>{tr("Услуги")}</h2>{offers.length?offers.map(s=><article className="clinic-service" key={s.service}><div><h3>{s.service}</h3><p>{money(s.price)} · {Math.round((Date.parse(s.ends_at)-Date.parse(s.starts_at))/60000)} {tr("минут")}</p></div><Link className="btn secondary" to={'/specialists/'+s.specialist_id+'#booking'}>{tr('Записаться')}</Link></article>):<><p>{clinic.services}</p><p className="muted">{tr("Стоимость и свободное время уточните у клиники.")}</p><ClinicContact clinic={clinic}/></>}</>}
 {tab==='contacts'&&<><h2>{tr("Контакты")}</h2><p>{clinic.address||clinic.district}</p><p className="muted">{tr("Время работы уточните у клиники.")}</p>{clinic.address&&<a className="btn secondary" href={'https://2gis.kz/'+(clinic.address.startsWith('Астана')?'astana':'almaty')+'/search/'+encodeURIComponent(clinic.address)} target="_blank" rel="noopener noreferrer">{tr("Открыть в 2ГИС")}</a>}<ClinicContact clinic={clinic}/></>}
 </section></div>;
}
