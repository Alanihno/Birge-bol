import type { CareAppointment, Slot } from './care';
export const almatyDay=(value:string|number)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Almaty',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export function clinicAnalytics(appointments:CareAppointment[],slots:Slot[],from:string,to:string){
 const rows=appointments.filter(a=>{const day=almatyDay(a.starts_at);return day>=from&&day<=to;});
 const active=rows.filter(a=>!['cancelled','expired','no_show'].includes(a.status));
 const paid=rows.filter(a=>a.payment_state==='confirmed');
 const received=appointments.filter(a=>a.payment_state==='confirmed'&&a.payment_confirmed_at&&almatyDay(a.payment_confirmed_at)>=from&&almatyDay(a.payment_confirmed_at)<=to);
 const available=slots.filter(s=>{const d=almatyDay(s.starts_at);return d>=from&&d<=to;});
 const minutes=(s:{starts_at:string;ends_at:string})=>Math.max(0,(Date.parse(s.ends_at)-Date.parse(s.starts_at))/60000);
 const capacity=available.reduce((n,s)=>n+minutes(s),0),reserved=active.filter(a=>available.some(s=>s.id===a.slot_id)).reduce((n,a)=>n+minutes(a),0);
 const days=Array.from(new Set(rows.map(a=>almatyDay(a.starts_at)))).sort().map(day=>({day,count:rows.filter(a=>almatyDay(a.starts_at)===day).length}));
 return {rows,days,upcoming:active.filter(a=>Date.parse(a.starts_at)>Date.now()).length,completed:rows.filter(a=>['attended','completed'].includes(a.status)).length,cancelled:rows.filter(a=>['cancelled','expired'].includes(a.status)).length,paid:paid.length,unpaid:active.filter(a=>a.payment_state!=='confirmed').length,received:received.reduce((n,a)=>n+(a.payment_amount||0),0),expected:active.filter(a=>a.payment_state!=='confirmed').reduce((n,a)=>n+(a.payment_amount||0),0),occupancy:capacity?Math.min(100,reserved/capacity*100):null};
}
