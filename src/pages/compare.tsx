import { useRatings } from '../lib/ratings';
import { RatingInfo } from '../components/rating-info';
import { SpecialistPhoto } from '../components/specialist-photo';
/* localized-copy */
import { tr, useLocale } from '../lib/i18n';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../lib/app-context';
import { useCare } from '../lib/care-api';
import { compareSpecialists, criteriaLabels, strengthsFor } from '../domain/care';
import type { Criterion } from '../domain/care';
import { money } from '../domain/logic';
import { Button, Empty, Loading, ErrorState, Notice, PageHeading } from '../components/ui';
export default function Compare() {
    useLocale();
    const ratings=useRatings();const care = useCare(), { activeChild } = useApp(), [p] = useSearchParams(), [criteria, setCriteria] = useState<Criterion[]>(['price', 'slots', 'match']), [distances, setDistances] = useState<Record<string, number>>({}), [geoError, setGeoError] = useState('');
    if (care.isPending)
        return <Loading />;
    if (care.isError || !care.data)
        return <ErrorState retry={() => void care.refetch()}/>;
    const state = care.data, ids = (p.get('ids') || '').split(',').slice(0, 3), list = state.specialists.filter(s => ids.includes(s.id));
    if (list.length < 2)
        return <Empty title={tr("Выберите двух или трёх специалистов")} description={tr("Нажмите «Сравнить» на карточках в каталоге.")} to="/find"/>;
    const rated=list.map(s=>({...s,contact_rating:ratings.data?.find(r=>r.specialist_id===s.id)?.similar??s.contact_rating}));
    const result = compareSpecialists(rated, activeChild, criteria, state.slots, state.reviews, distances);
    function locate() { if (!navigator.geolocation) {
        setGeoError('Геолокация недоступна');
        return;
    } navigator.geolocation.getCurrentPosition(({ coords }) => { const next: Record<string, number> = {}; for (const s of list)
        if (s.latitude !== null && s.longitude !== null) {
            const r = Math.PI / 180, a = Math.sin((s.latitude - coords.latitude) * r / 2) ** 2 + Math.cos(coords.latitude * r) * Math.cos(s.latitude * r) * Math.sin((s.longitude - coords.longitude) * r / 2) ** 2;
            next[s.id] = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        } setDistances(next); if (!Object.keys(next).length)
        setGeoError('У выбранных профилей нет проверенных координат. Расстояния не выдумываются.'); }, () => setGeoError('Не удалось получить геолокацию. Остальные критерии доступны.'), { enableHighAccuracy: false, timeout: 10000 }); }
    const rows = [['Специализация', (i: number) => list[i].specialty], ['Стаж', (i: number) => list[i].experience + ' лет'], ['Похожие запросы', (i: number) => list[i].concerns.filter(c => activeChild.concerns.includes(c)).length + ' совпадений направлений (самоописание)'], ['Возраст детей', (i: number) => list[i].ages.join(', ')], ['Стоимость', (i: number) => money(list[i].price)], ['Район', (i: number) => list[i].district], ['Расстояние', (i: number) => distances[list[i].id] === undefined ? 'Нет данных' : distances[list[i].id].toFixed(1) + ' км'], ['Свободные окна', (i: number) => state.slots.filter(s => s.specialist_id === list[i].id && s.available && Date.parse(s.starts_at) > Date.now()).length], ['Общий рейтинг', (i: number) => ratings.data?.find(r=>r.specialist_id===list[i].id)?.overall ?? list[i].contact_rating ?? 'Недостаточно данных'], ['Рейтинг похожих случаев', (i: number) => {const r=ratings.data?.find(r=>r.specialist_id===list[i].id);return r?.similar==null?'Недостаточно данных':r.similar.toFixed(2)+(r.similar_count?' · '+r.similar_count+' отзывов':' · похожих отзывов нет, общий рейтинг');}], ['Подтверждённые отзывы', (i: number) => list[i].verified_count], ['Сильные стороны по отзывам', (i: number) => strengthsFor(state.reviews, list[i].id).map(s => s.label + ': ' + s.count).join('; ') || 'Недостаточно подтверждённых данных'], ['Формат', (i: number) => list[i].online ? 'Очно и онлайн' : 'Очно'], ['Языки', (i: number) => String(list[i].profile?.languages || 'Уточните у специалиста')], ['Контакты', (i: number) => String(list[i].profile?.contacts || 'Через приложение')]] as const;
    return <><PageHeading eyebrow={tr("ВЫБОР В ВАШЕМ ТЕМПЕ")} title={tr("Сравнение специалистов")} description={tr("Выберите, что важно вашей семье. Данные о популярности не оценивают клиническую эффективность.")}/><div className="panel"><h3>{tr("Что для вас важнее?")}</h3><div className="filter-chips">{tr((Object.keys(criteriaLabels) as Criterion[]).map(c => <button key={c} className={`chip ${criteria.includes(c) ? 'selected' : ''}`} aria-pressed={criteria.includes(c)} onClick={() => setCriteria(criteria.includes(c) ? criteria.filter(x => x !== c) : [...criteria, c])}>{tr(criteriaLabels[c])}</button>))}</div><Button variant="secondary" onClick={locate}>{tr("Уточнить расстояние с геолокацией")}</Button>{tr(geoError && <p className="muted">{tr(geoError)}</p>)}</div><RatingInfo/><p className="muted">{tr("Для критерия «Контакт» используем рейтинг похожих случаев; если таких отзывов нет — общий рейтинг.")}</p><div className="compare-scroll"><table className="compare-table"><thead><tr><th>{tr("Критерий")}</th>{tr(list.map(s => <th key={s.id}><SpecialistPhoto specialist={s}/><Link to={'/specialists/' + s.id}>{tr(s.name)}</Link>{tr(s.is_demo && <small>{tr("Тестовый профиль")}</small>)}</th>))}</tr></thead><tbody>{tr(rows.map(([label, value]) => <tr key={label}><th>{tr(label)}</th>{tr(list.map((s, i) => <td key={s.id} className={result.totals.find(t => t.id === s.id)?.reasons.includes(label === 'Стоимость' ? 'Цена' : label === 'Свободные окна' ? 'Свободные места' : label) ? 'criterion-highlight' : ''}>{tr(value(i))}</td>))}</tr>))}<tr><th>{tr("Запись")}</th>{tr(list.map(s => <td key={s.id}><Link className="btn primary" to={'/specialists/' + s.id + '#booking'}>{tr("Записаться")}</Link></td>))}</tr></tbody></table></div><section className="panel compare-analysis"><span className="eyebrow">{tr("ИИ-АНАЛИЗ СРАВНЕНИЯ")}</span><h2>{tr("Что говорят выбранные критерии")}</h2><p>{tr(result.explanation)}</p>{tr(list.map(s => <p key={s.id}><strong>{tr(s.name)}:</strong> {tr(result.totals.find(t => t.id === s.id)?.reasons.join(', ') || 'Условия близки к другим выбранным профилям')}.</p>))}<Notice>{tr("Объяснение сформировано локально по объективному алгоритму и шаблонам. Внешний ИИ не получает профиль ребёнка. Опыт по запросам указан специалистами, проверяйте его при знакомстве.")}</Notice></section></>;
}
