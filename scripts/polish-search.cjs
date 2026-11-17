const fs=require('fs');const f='src/pages/find.tsx';let s=fs.readFileSync(f,'utf8');
s=s.replace("import { useSearchParams }", "import { Search, X, SlidersHorizontal, List, MapPin } from 'lucide-react';\nimport { useSearchParams }");
s=s.replace("const [view,setView]=useState('list');", "const view=p.get('view')==='map'?'map':'list';");
s=s.replace('const fields=<div',`const applied=[specialty&&['specialty',specialty],district&&['district',district],age&&['age',age+' лет'],concern&&['concern',concernLabels[concern as keyof typeof concernLabels]],format&&['format',format==='online'?'Онлайн':'Офлайн'],free&&['free','Бесплатно через ПМПК'],budget<100000&&['budget','До '+money(budget)],radius<10&&['radius',radius+' км']].filter(Boolean) as string[][];
const fields=<div`);
s=s.replace('<div className="search-row"><div className="search-input"><input','<div className="search-row"><div className="search-input"><Search size={20} aria-hidden="true"/><input');
s=s.replace("onChange={e=>update('q',e.target.value)}/></div>","onChange={e=>update('q',e.target.value)}/>{q&&<button className=\"search-clear\" aria-label=\"Очистить поиск\" onClick={()=>update('q','')}><X size={17}/></button>}</div>");
s=s.replace('<Button variant="secondary" onClick={()=>setFilters(true)}>Фильтры</Button>','<Button variant="secondary" onClick={()=>setFilters(true)}><SlidersHorizontal size={18}/>Фильтры{applied.length>0&&<span className="filter-count">{applied.length}</span>}</Button>');
s=s.replace('<div className="market-layout">','{applied.length>0&&<div className="applied-filters" aria-label="Применённые фильтры">{applied.map(([key,label])=><button key={key} onClick={()=>update(key,\'\')} aria-label={\'Убрать фильтр: \'+label}>{label}<X size={13}/></button>)}<button className="reset-filters" onClick={()=>setP(view===\'map\'?{view:\'map\'}:{})}>Сбросить</button></div>}<div className="market-layout">');
s=s.replace('<h2>Фильтры</h2>','<h2><SlidersHorizontal size={18}/>Фильтры</h2>').replace('<span>Найдено: {filtered.length}</span>','<span role="status" aria-live="polite">Найдено: <strong>{filtered.length}</strong></span>');
s=s.replace("onClick={()=>setView('list')}>Список", "aria-pressed={view==='list'} onClick={()=>update('view','')}><List size={16}/>Список");
s=s.replace("onClick={()=>setView('map')}>Карта", "aria-pressed={view==='map'} onClick={()=>update('view','map')}><MapPin size={16}/>Карта");
s=s.replace('description="Измените запрос или сбросьте фильтры."/>','description="Измените запрос или сбросьте фильтры."/><Button variant="secondary" onClick={()=>setP({})}>Начать поиск заново</Button>');
// Keep the empty state and reset action inside a single React element.
s=s.replace(':!filtered.length?<Empty',':!filtered.length?<div className="search-empty"><Empty').replace('Начать поиск заново</Button>:view', 'Начать поиск заново</Button></div>:view');
fs.writeFileSync(f,s);console.log('Search filters, reset and map links updated');
