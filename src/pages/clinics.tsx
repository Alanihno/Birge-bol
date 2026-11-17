import {DemoSpecialistBadge} from '../components/demo-specialist-badge';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCare } from '../lib/care-api';
import { tr, useLocale, locale } from '../lib/i18n';
import { ClinicContact } from '../components/clinic-contact';
import { PageHeading, Loading, ErrorState, Empty } from '../components/ui';
import { clinicContacts } from '../domain/clinic-contacts';
export default function Clinics(){
 useLocale();const care=useCare(),[city,setCity]=useState('');
 if(care.isPending)return <Loading/>;if(care.isError||!care.data)return <ErrorState retry={()=>void care.refetch()}/>;
 const state=care.data,clinics=state.clinics.filter(c=>c.status==='approved'&&(!city||c.address.startsWith(city)));
 return <><PageHeading title={tr('Центры и клиники')} description={tr('Адреса, направления, специалисты и доступное время.')}/><div className="filter-chips">{tr(['','Астана','Алматы'].map(value=><button key={value} className={`chip ${city===value?'selected':''}`} onClick={()=>setCity(value)}>{tr(value||'Все города')}</button>))}</div><div className="assignment-grid">{tr(clinics.map(clinic=>{
  const contact=clinicContacts(clinic.contacts),branches=state.branches.filter(b=>b.clinic_id===clinic.id);
  return <section className="panel stack" key={clinic.id}><h2>{tr(clinic.name)}</h2><p>{tr(clinic.description)}</p><p>{tr(clinic.address)}</p><div className="card-tags">{tr(clinic.services.split(' · ').map(s=><span key={s}>{tr(s)}</span>))}</div>{tr(branches.length>1&&<details><summary>{tr('Адреса и филиалы')} · {tr(branches.length)}</summary>{tr(branches.map(b=><p key={b.id}>{tr(b.address)}</p>))}</details>)}<p>{tr(contact.note)}</p>{tr(contact.website&&<a className="text-link" href={contact.website} target="_blank" rel="noopener noreferrer">Instagram →</a>)}<h3>{tr('Специалисты центра')}</h3>{tr(state.members.filter(m=>m.clinic_id===clinic.id&&m.status==='active').map(m=>{const s=state.specialists.find(s=>s.id===m.specialist_id);if(!s)return null;const next=state.slots.filter(t=>t.specialist_id===s.id&&t.available&&Date.parse(t.starts_at)>Date.now()).sort((a,b)=>a.starts_at.localeCompare(b.starts_at))[0];return <div className="document-row" key={m.specialist_id}><div><strong>{tr(s.name)}</strong><DemoSpecialistBadge show={s.is_demo}/><p>{tr(s.specialty)}</p><small>{tr(next?`${tr('Ближайшее время')}: ${new Date(next.starts_at).toLocaleString(locale(),{timeZone:'Asia/Almaty',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}`:tr('Время уточняется'))}</small></div><Link className="btn secondary" to={`/specialists/${s.id}#booking`}>{tr('Записаться')}</Link></div>}))}<ClinicContact clinic={clinic}/></section>;
 }))}</div>{tr(!clinics.length&&<Empty title={tr('Центры пока не добавлены')} description={tr('Выберите другой город.')}/>)}</>;
}
