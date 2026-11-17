import {describe,it,expect} from 'vitest';
import {recommendThreads} from './community-feed';
import {demoChild} from './data';
import type {Question} from './types';
const post=(id:string,topic:string):Question=>({id,topic,title:id,body:id,city:'Алматы',status:'open',is_demo:true,created_at:'2026-11-14T09:00:00Z',answers:[]});
describe('community recommendations',()=>{
 it('prioritizes followed topics and then the family request',()=>{const q=[post('news','Новости'),post('speech','Речь'),post('events','Мероприятия')];expect(recommendThreads(q,demoChild,['Мероприятия'],Date.parse('2026-11-14T12:00:00Z')).map(q=>q.id)).toEqual(['events','speech','news']);expect(q[0].id).toBe('news');});
 it('keeps a new feed deterministic when no topics match',()=>{const q=[post('b','Новости'),post('a','Мероприятия')];expect(recommendThreads(q,{...demoChild,concerns:[]},[],Date.parse('2026-11-14')).map(q=>q.id)).toEqual(['a','b']);});
});
