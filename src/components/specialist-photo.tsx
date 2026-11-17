import { useState } from 'react';
import type { Specialist } from '../domain/types';
import { safeUrl } from '../domain/logic';
export function SpecialistPhoto({specialist:s,className='specialist-photo'}:{specialist:Specialist;className?:string}){const [failed,setFailed]=useState('');const photo=typeof s.profile?.photo==='string'?safeUrl(s.profile.photo):null;const fallback=s.is_demo?`/portraits/specialist-${Number(s.id.slice(-3))%6||0}.svg`:'/icon.svg';return <img className={className} src={photo&&photo!==failed?photo:fallback} alt={s.is_demo?"портрет":`Портрет специалиста ${s.name}`} width={72} height={72} loading="lazy" onError={()=>{if(photo)setFailed(photo);}}/>;}
