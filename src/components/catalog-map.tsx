/* localized-copy */
import { tr, useLocale } from '../lib/i18n';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { demoMeta } from '../lib/journey';
import 'leaflet/dist/leaflet.css';
import type { Specialist } from '../domain/types';
export default function CatalogMap({ specialists }: {
    specialists: Specialist[];
}) {
 const language=useLocale(),element=useRef<HTMLDivElement>(null),mapRef=useRef<L.Map|null>(null),markers=useRef(new Map<string,L.CircleMarker>()),[selected,setSelected]=useState(''),[failed,setFailed]=useState(false);
 useEffect(()=>{if(!element.current)return;const map=L.map(element.current,{scrollWheelZoom:false}).setView([43.238,76.890],11);mapRef.current=map;
 const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);tiles.on('tileerror',()=>setFailed(true));
 const resize=new ResizeObserver(()=>map.invalidateSize({pan:false}));resize.observe(element.current);
 return()=>{resize.disconnect();map.remove();mapRef.current=null;};},[]);
 useEffect(()=>{const map=mapRef.current;if(!map)return;for(const marker of markers.current.values())marker.remove();markers.current.clear();const bounds=L.latLngBounds([]);
 for(const s of specialists){const point=s.is_demo?demoMeta(s):s;const lat=point.latitude,lon=point.longitude;if(typeof lat!=='number'||typeof lon!=='number'||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue;
  const popup=document.createElement('a');popup.textContent=tr(`${s.name} · ${s.specialty}`);popup.href=`/specialists/${s.id}`;
  const marker=L.circleMarker([lat,lon],{radius:9,color:'#C8AAFF',fillOpacity:.75}).bindPopup(popup).addTo(map);marker.on('click',()=>setSelected(s.id));markers.current.set(s.id,marker);bounds.extend([lat,lon]);
 }
 if(bounds.isValid())map.fitBounds(bounds,{padding:[24,24],maxZoom:13});
 },[specialists,language]);
 useEffect(()=>{for(const [id,marker]of markers.current){marker.setStyle({color:id===selected?'#4B0073':'#C8AAFF',radius:id===selected?13:9});if(id===selected){mapRef.current?.panTo(marker.getLatLng(),{animate:!matchMedia('(prefers-reduced-motion: reduce)').matches});marker.openPopup();}}},[selected]);
 return <div className="map-container"><div className="notice lilac">{tr('Список и карта используют одинаковые фильтры.')}</div>{failed&&<p role="status">{tr('Карта временно недоступна. Выберите специалиста в списке ниже.')}</p>}<div className="map" ref={element} aria-label={tr('Карта Алматы')}/><label>{tr('Показать на карте')}<select value={specialists.some(s=>s.id===selected)?selected:''} onChange={e=>setSelected(e.target.value)}><option value="">{tr('Выберите специалиста')}</option>{specialists.map(s=><option key={s.id} value={s.id}>{s.name} · {tr(s.district)}</option>)}</select></label>{selected&&<a className="btn secondary" href={'/specialists/'+selected}>{tr('Открыть профиль')}</a>}<p className="tiny muted">{tr('Карта требует интернета. Координаты демонстрационных профилей — тестовые. Без загрузки тайлов для офлайна.')}</p></div>;
}
