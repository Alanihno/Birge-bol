import {useLocale} from '../lib/i18n';
export function DemoSpecialistBadge({show}:{show:boolean}){const lang=useLocale();return show?<span className="demo-specialist">{lang==='kk'?'Ойдан шығарылған маман · демо':'Вымышленный специалист · демо'}</span>:null;}
