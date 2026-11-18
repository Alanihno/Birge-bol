import {useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {useCare} from '../lib/care-api';
import {tr,useLocale} from '../lib/i18n';
import {ClinicContact} from '../components/clinic-contact';
import {ClinicProfile} from '../components/clinic-profile';
import {PageHeading,Loading,ErrorState,Empty,Button} from '../components/ui';
export default function Clinics(){
 const kk=useLocale()==='kk',care=useCare(),{id}=useParams(),[city,setCity]=useState(''),[limit,setLimit]=useState(6);
 if(care.isPending)return <Loading/>;if(care.isError||!care.data)return <ErrorState retry={()=>void care.refetch()}/>;
 const state=care.data,clinics=state.clinics.filter(c=>c.status==='approved'&&(!city||c.address.startsWith(city)));
 if(id){const clinic=state.clinics.find(c=>c.id===id&&c.status==='approved');return clinic?<ClinicProfile clinic={clinic} state={state}/>:<Empty title={kk?'Клиника қолжетімсіз':'Клиника недоступна'} description={kk?'Тізімнен басқа клиниканы таңдаңыз.':'Выберите другую клинику в каталоге.'} to="/clinics" label={kk?'Клиникалар':'Клиники'}/>;}
 return <><PageHeading title={tr('Центры и клиники')} description={tr('Адреса, направления, специалисты и доступное время.')}/><div className="filter-chips">{['','Астана','Алматы'].map(value=><button key={value} className={'chip '+(city===value?'selected':'')} onClick={()=>{setCity(value);setLimit(6);}}>{tr(value||'Все города')}</button>)}</div><div className="clinic-directory">{clinics.slice(0,limit).map(clinic=><article className="panel clinic-summary" key={clinic.id}><div className="eyebrow">{tr(clinic.district)}</div><h2><Link to={'/clinics/'+clinic.id}>{clinic.name}</Link></h2><p className="clinic-summary-copy">{clinic.description}</p><p>{clinic.address}</p><div className="form-actions"><Link className="btn primary" to={'/clinics/'+clinic.id}>{tr('Подробнее')}</Link><ClinicContact clinic={clinic}/></div></article>)}</div>{clinics.length>limit&&<Button variant="secondary" onClick={()=>setLimit(limit+6)}>{kk?'Тағы көрсету':'Показать ещё клиники'}</Button>}{!clinics.length&&<Empty title={tr('Центры пока не добавлены')} description={tr('Выберите другой город.')}/>}</>;
}
