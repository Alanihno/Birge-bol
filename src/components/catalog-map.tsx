/* localized-copy */
import { tr, useLocale } from '../lib/i18n';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { demoMeta } from '../lib/journey';
import 'leaflet/dist/leaflet.css';
import type { Specialist } from '../domain/types';
export default function CatalogMap({ specialists }: {
    specialists: Specialist[];
}) { const language=useLocale(); const element = useRef<HTMLDivElement>(null); useEffect(() => { if (!element.current)
    return; const map = L.map(element.current, { scrollWheelZoom: false }).setView([43.238, 76.890], 11); L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map); const points = specialists.map(s => s.is_demo ? { ...s, latitude: demoMeta(s).latitude, longitude: demoMeta(s).longitude } : s).filter(s => s.latitude !== null && s.longitude !== null); for (const s of points) {
    const popup = document.createElement('a');
    popup.textContent = tr(`${s.name} · ${s.specialty}${s.is_demo ? ` · ${demoMeta(s).clinic}` : ``}`);
    popup.href = `/specialists/${s.id}`;
    L.circleMarker([s.latitude!, s.longitude!], { radius: 9, color: s.specialty === 'Логопед' ? '#c06c59' : s.specialty === 'Дефектолог' ? '#538574' : '#7760a9' }).bindPopup(popup).addTo(map);
} return () => { map.remove(); }; }, [specialists,language]); return <div className="map-container"><div className="notice lilac">{tr("отметки специалистов и центров. Фильтры направления применяются и к карте.")}</div><div className="map" ref={element} aria-label={tr("Карта Алматы")}/><p className="tiny muted">{tr("Карта требует интернета. Без офлайн-загрузки тайлов. Координаты не определяются автоматически.")}</p></div>; }
