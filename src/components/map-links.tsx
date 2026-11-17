import type { Specialist } from '../domain/types';
import { twoGisLinks } from '../lib/map-links';
import { tr, useLocale } from '../lib/i18n';
export function MapLinks({specialist}:{specialist:Specialist}){useLocale();const links=twoGisLinks(specialist);return <div className="stack"><div className="cookie-actions"><a className="btn secondary" href={links.place} target="_blank" rel="noopener noreferrer">{tr('Открыть в 2ГИС')}</a><a className="btn secondary" href={links.route||links.place} target="_blank" rel="noopener noreferrer">{tr('Построить маршрут')}</a></div>{specialist.is_demo&&<small>{tr('Демонстрационное местоположение — не адрес приёма.')}</small>}</div>;}
