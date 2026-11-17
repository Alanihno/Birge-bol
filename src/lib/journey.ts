import { useSyncExternalStore } from 'react';
import type { Specialist } from '../domain/types';
export type DemoDocument={id:string;childId:string;name:string;kind:string};
export type Booking={id:string;childId:string;specialistId:string;name:string;startsAt:string;price:number;address:string;format:string;status:'booked'|'confirmed'|'completed'|'cancelled';documents:DemoDocument[];reviewed?:boolean};
type Reply={id:string;threadId:string;parentId?:string;body:string};
type Journey={bookings:Booking[];documents:DemoDocument[];waitlist:string[];replies:Reply[];votes:Record<string,number>;parentName:string};
const key='bb-journey-v2';
const empty:Journey={bookings:[],documents:[],waitlist:[],replies:[],votes:{},parentName:'Аружан · демо'};
let raw:string|null=null;let cached:Journey=empty;
function snapshot(){const next=localStorage.getItem(key);if(next!==raw){raw=next;try{cached={...empty,...JSON.parse(next||'{}')};}catch{cached=empty;}}return cached;}
const listeners=new Set<()=>void>();
function subscribe(fn:()=>void){listeners.add(fn);const onStorage=(e:StorageEvent)=>{if(e.key===key||e.key===null)fn();};window.addEventListener('storage',onStorage);return()=>{listeners.delete(fn);window.removeEventListener('storage',onStorage);};}
export function useJourney(){return useSyncExternalStore(subscribe,snapshot);}
export function changeJourney(change:(value:Journey)=>void){const value=structuredClone(snapshot());change(value);localStorage.setItem(key,JSON.stringify(value));listeners.forEach(fn=>fn());}
export function dateKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function demoMeta(s:Specialist){const legacy=s.id.startsWith('00000000-0000-4000-8000-'),numeric=Number(s.id.slice(-3)),i=Number.isFinite(numeric)?Math.max(0,numeric-1):parseInt(s.id.replaceAll('-','').slice(-6),16)%24;return {rating:s.contact_rating??Number((4.5+(i%5)/10).toFixed(1)),reviews:s.verified_count,free:s.price===0,latitude:s.latitude??(legacy?43.238+(i%6-2)*0.009:null),longitude:s.longitude??(legacy?76.89+(Math.floor(i/6)-1)*0.019:null),clinic:typeof s.profile?.center==='string'?s.profile.center:`Центр «Birge ${i%4+1}»`,address:s.address||s.city,fullName:legacy?['Сарсенова Айгерим Маратовна','Алимова Дана Сериковна','Касымова Мадина Аскаровна','Тлеубаева Алия Ерлановна','Бекова Аружан Данияровна','Муратова Жанар Сериковна'][i%6]:s.name,education:typeof s.profile?.education==='string'?s.profile.education:'Профильное педагогическое образование'};}
export function distanceKm(s:Specialist){const m=s.is_demo?demoMeta(s):s;if(m.latitude===null||m.longitude===null)return null;const r=Math.PI/180;const a=Math.sin((m.latitude-43.238)*r/2)**2+Math.cos(43.238*r)*Math.cos(m.latitude*r)*Math.sin((m.longitude-76.89)*r/2)**2;return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
export function availableTimes(s:Specialist,date:string){if(!s.is_demo||Number(s.id.slice(-3))%6===0||new Date(date+'T12:00').getDay()===0)return [];return ['09:00','11:00','14:30','16:00'].filter(time=>new Date(date+'T'+time).getTime()>Date.now()&&!snapshot().bookings.some(b=>b.specialistId===s.id&&b.startsAt===date+'T'+time&&b.status!=='cancelled'));}
export function book(item:Omit<Booking,'id'|'status'>){if(snapshot().bookings.some(b=>b.status!=='cancelled'&&b.startsAt===item.startsAt&&(b.specialistId===item.specialistId||b.childId===item.childId)))throw Error('Это время уже занято. Выберите другое окно.');changeJourney(d=>{d.bookings.push({...item,id:crypto.randomUUID(),status:'booked'});});}
