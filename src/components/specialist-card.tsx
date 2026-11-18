import {DemoSpecialistBadge} from './demo-specialist-badge';
import {formatExperience,formatRating} from '../lib/display-numbers';
import {useRatings} from '../lib/ratings';
import {SpecialistPhoto} from './specialist-photo';
import {CompareButton} from '../lib/comparison';
import {tr,useLocale} from '../lib/i18n';
import {Link} from 'react-router-dom';
import {ArrowUpRight,MapPin,Star,Video} from 'lucide-react';
import type {Specialist} from '../domain/types';
export function SpecialistCard({specialist:s}:{specialist:Specialist}){
 const language=useLocale(),ratings=useRatings(),rating=ratings.data?.find(r=>r.specialist_id===s.id);
 return <article className="specialist-card compact-specialist"><div className="card-top"><SpecialistPhoto specialist={s}/><div className="card-person"><Link to={'/specialists/'+s.id} className="person-name">{s.name}</Link><span className="specialty-label">{tr(s.specialty)}</span><DemoSpecialistBadge show={s.is_demo}/></div></div><div className="rating-line"><Star size={16} fill="currentColor"/><strong>{rating?.overall!=null?formatRating(rating.overall,language):ratings.isPending?'—':tr(ratings.isError?'Оценка недоступна':'Пока нет отзывов')}</strong>{rating&&rating.review_count>0&&<small>({rating.review_count})</small>}</div><div className="specialist-meta"><span><MapPin size={15}/>{tr(s.district)}</span><span><Video size={15}/>{tr(s.online?'Очно и онлайн':'Очно')}</span></div><p className="compact-experience">{s.ages.join(', ')} {language==='kk'?'жас':'лет'} · {formatExperience(s.experience,language)}</p><div className="compact-card-actions"><Link className="btn primary" to={'/specialists/'+s.id}>{tr('Подробнее')}<ArrowUpRight size={16}/></Link><CompareButton id={s.id}/></div></article>;
}
