import { useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { suggestions } from '../domain/search';
import type { Suggestion } from '../domain/search';
import type { Specialist } from '../domain/types';
import { tr, useLocale } from '../lib/i18n';
export function SearchBox({query,catalog,onQuery,onSelect}:{query:string;catalog:Specialist[];onQuery:(value:string)=>void;onSelect:(kind:string,value:string)=>void}){
 useLocale();const id=useId(),nav=useNavigate(),[text,setText]=useState(query),[debounced,setDebounced]=useState(query),[open,setOpen]=useState(false),[active,setActive]=useState(-1);const rows=suggestions(debounced,catalog);
 useEffect(()=>setText(query),[query]);
 useEffect(()=>{const timer=setTimeout(()=>{setDebounced(text);if(text!==query)onQuery(text);},250);return()=>clearTimeout(timer);},[text,query,onQuery]);
 function choose(item:Suggestion){setOpen(false);setActive(-1);if(item.kind==='person')nav('/specialists/'+item.value);else{setText('');onSelect(item.kind,item.value);}}
 return <div className="smart-search" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOpen(false);}}><div className="search-input"><Search size={20} aria-hidden="true"/><input role="combobox" aria-autocomplete="list" aria-expanded={open&&rows.length>0} aria-controls={id} aria-activedescendant={active>=0?id+'-'+active:undefined} aria-label={tr('Поиск по имени или специализации')} placeholder={tr('Имя, дефектолог или название центра…')} value={text} onFocus={()=>setOpen(true)} maxLength={100} onChange={e=>{setText(e.target.value);setOpen(true);setActive(-1);}} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);setActive(-1);}if(e.key==='ArrowDown'){e.preventDefault();setOpen(true);setActive(n=>Math.min(rows.length-1,n+1));}if(e.key==='ArrowUp'){e.preventDefault();setActive(n=>Math.max(0,n-1));}if(e.key==='Enter'&&open&&rows[active]){e.preventDefault();choose(rows[active]);}}}/>{text&&<button className="search-clear" aria-label={tr('Очистить поиск')} onClick={()=>{setText('');onQuery('');setOpen(false);}}><X size={17}/></button>}</div>{open&&rows.length>0&&<div className="search-suggestions" id={id} role="listbox" aria-label={tr('Подсказки поиска')}>{rows.map((item,i)=><button type="button" role="option" aria-selected={active===i} id={id+'-'+i} key={item.id} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(item)}>{tr(item.label)}<small>{tr(item.kind==='district'?'Район':item.kind==='person'?'Специалист':'Поисковая категория')}</small></button>)}</div>}</div>;
}
