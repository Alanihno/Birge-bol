import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
vi.mock('./backend',()=>({mode:'demo',supabase:null}));
import {demoCommand,demoSnapshot,demoFamily} from './care-demo';
import {demoAccounts} from '../domain/care';
import {demoChild} from '../domain/data';
const parent=demoAccounts[0],pro=demoAccounts[1],clinic=demoAccounts[2];
function actor(a:typeof parent){sessionStorage.setItem('bb-demo-identity',JSON.stringify({id:a.id,role:a.role,email:a.email}));}
describe('shared synthetic care flow',()=>{
 beforeEach(()=>{const values=new Map<string,string>(),session=new Map<string,string>();const storage=(m:Map<string,string>)=>({getItem:(k:string)=>m.get(k)||null,setItem:(k:string,v:string)=>m.set(k,v),removeItem:(k:string)=>m.delete(k)});vi.stubGlobal('localStorage',storage(values));vi.stubGlobal('sessionStorage',storage(session));vi.stubGlobal('window',{dispatchEvent:vi.fn()});actor(parent);});
 afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
 it('connects booking, attendance, review, assignment, diary, privacy and revocable family links',async()=>{
  let state=await demoSnapshot(parent.id);expect(state.materials).toHaveLength(0);const slot=state.slots.find(s=>s.specialist_id==='00000000-0000-4000-8000-000000000001')!;
  const r=await demoCommand(parent.id,'book',{slot_id:slot.id,child_id:demoChild.id,reason:'Тест',contact:parent.email,share_diary:true});const id=r.id as string;
  await expect(demoCommand(parent.id,'book',{slot_id:slot.id,child_id:demoChild.id})).rejects.toThrow();
  await expect(demoCommand(parent.id,'confirm',{appointment_id:id})).rejects.toThrow();
  await expect(demoCommand(parent.id,'review',{appointment_id:id,contact:5,body:'Без посещения'})).rejects.toThrow();
  actor(pro);expect((await demoSnapshot(pro.id)).patients).toHaveLength(0);await demoCommand(pro.id,'payment_confirm',{appointment_id:id,received:true});expect((await demoSnapshot(pro.id)).patients).toHaveLength(1);const code=await demoCommand(pro.id,'issue_code',{appointment_id:id});
  actor(parent);await expect(demoCommand(parent.id,'redeem_code',{appointment_id:id,code:'bad'})).rejects.toThrow();await demoCommand(parent.id,'redeem_code',{appointment_id:id,code:code.code});await expect(demoCommand(parent.id,'redeem_code',{appointment_id:id,code:code.code})).rejects.toThrow();await demoCommand(parent.id,'review',{appointment_id:id,contact:5,body:'Только мои реальные ответы',strengths:[]});await expect(demoCommand(parent.id,'review',{appointment_id:id})).rejects.toThrow();
  actor(clinic);state=await demoSnapshot(clinic.id);expect(state.appointments).toHaveLength(1);expect(state.appointments[0]).not.toHaveProperty('child_id');expect(state.appointments[0]).not.toHaveProperty('diagnosis');expect(state.patients).toHaveLength(0);
  actor(pro);await demoCommand(pro.id,'assign',{child_id:demoChild.id,material_id:'40000000-0000-4000-8000-000000000001',duration:3,frequency:'раз в день',due_at:'2027-01-01',goal_title:'Тестовая цель'});
  actor(parent);state=await demoSnapshot(parent.id);const assignment=state.assignments[0];expect(state.materials).toHaveLength(1);expect(assignment.goal_id).toBeTruthy();await demoCommand(parent.id,'complete',{assignment_id:assignment.id,outcome:'partial',comment:'Тест'});expect((await demoSnapshot(parent.id)).completions[0].comment).toBe('Тест');const share=await demoCommand(parent.id,'share',{assignment_id:assignment.id});expect(demoFamily(share.token as string)).not.toHaveProperty('child_id');await demoCommand(parent.id,'revoke_share',{assignment_id:assignment.id});expect(demoFamily(share.token as string)).toBeNull();await demoCommand(parent.id,'consent',{appointment_id:id,enabled:false});actor(pro);expect((await demoSnapshot(pro.id)).patients).toHaveLength(0);expect((await demoSnapshot(pro.id)).assignments).toHaveLength(0);
 });
 it('expires attendance codes after thirty minutes',async()=>{const state=await demoSnapshot(parent.id),slot=state.slots[0];const {id}=await demoCommand(parent.id,'book',{slot_id:slot.id,child_id:demoChild.id,share_diary:true});actor(pro);await demoCommand(pro.id,'payment_confirm',{appointment_id:id,received:true});const {code}=await demoCommand(pro.id,'issue_code',{appointment_id:id});vi.useFakeTimers();vi.setSystemTime(Date.now()+31*60000);actor(parent);await expect(demoCommand(parent.id,'redeem_code',{appointment_id:id,code})).rejects.toThrow();});
});
