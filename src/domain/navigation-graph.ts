export type GraphNode={id:string;label:string;kind:'root'|'screen'|'data';route?:string|null;routes?:Record<string,string>;roles:string[];keywords:string[];tables:string[];description:string;x:number;y:number};
export type GraphEdge={source:string;target:string;relation:string;key?:string};
export type NavigationGraph={nodes:GraphNode[];edges:GraphEdge[]};
const all=['parent','specialist','clinic'];
export const navigationNodes:GraphNode[]=[
 {id:'team',label:'Команда ребёнка',kind:'screen',roles:['parent','specialist'],routes:{parent:'/child/team',specialist:'/pro/kids'},keywords:['команда','общий план','несколько специалистов','совместно'],tables:['care_team_access','team_recommendations'],description:'Общий план и рекомендации специалистов по разрешению родителя',x:450,y:120},
 {id:'support',label:'Безопасность и поддержка',kind:'screen',route:'/support',roles:all,keywords:['поддержка','безопасность','ошибка','проблема','жалоба','пароль','помощь'],tables:['support_tickets'],description:'Настройки доступа, помощь и личные обращения',x:105,y:440},
 {id:'birge',label:'Birge Bol',kind:'root',roles:all,keywords:['платформа','главная','помощь'],tables:[],routes:{parent:'/app',specialist:'/pro',clinic:'/clinic'},description:'Связи разделов и данных платформы',x:600,y:440},
 {id:'family',label:'Дети и семья',kind:'screen',roles:['parent','specialist'],keywords:['дети','ребёнок','ребенок','семья','профиль','цель'],tables:['children','child_goals'],routes:{parent:'/child',specialist:'/pro/kids'},description:'Профили детей, цели и разрешённые данные',x:600,y:200},
 {id:'providers',label:'Специалисты',kind:'screen',roles:all,keywords:['специалист','логопед','поиск','найти','свободно','время','окна'],tables:['specialists','schedule_slots'],routes:{parent:'/find',specialist:'/pro/profile',clinic:'/clinic'},description:'Карточки специалистов и свободное время',x:900,y:310},
 {id:'booking',label:'Записи и календарь',kind:'screen',roles:all,keywords:['запись','записаться','приём','прием','бронь','календарь','гугл','google','перенести','отменить'],tables:['appointments','schedule_slots'],routes:{parent:'/diary',specialist:'/pro/requests',clinic:'/clinic'},description:'Единая запись связывает семью, специалиста, время и оплату',x:900,y:590},
 {id:'payments',label:'Оплата и чеки',kind:'screen',roles:all,keywords:['оплата','оплатила','чек','деньги','таймер','продлить','истекло','бронь','корзина'],tables:['private.booking_payments','storage.objects'],routes:{parent:'/payments',specialist:'/pro/requests',clinic:'/clinic'},description:'Корзина, срок оплаты, закрытый чек и подтверждение поступления денег',x:600,y:710},
 {id:'clinics',label:'Клиники и команда',kind:'screen',roles:all,keywords:['клиника','центр','команда','филиал','ватсап','whatsapp','telegram','написать','связаться'],tables:['clinics','clinic_members','clinic_branches'],routes:{parent:'/clinics',specialist:'/clinics',clinic:'/clinic'},description:'Клиника связана со специалистами через состав команды',x:300,y:590},
 {id:'reviews',label:'Посещение и отзывы',kind:'screen',roles:all,keywords:['qr','куар','сканировать','посещение','отзыв','рейтинг','оценка','подтвердить'],tables:['private.specialist_qr_codes','private.visit_confirmations','reviews'],routes:{parent:'/check-in',specialist:'/pro',clinic:'/clinic'},description:'Серверная отметка посещения открывает один отзыв за приём',x:300,y:310},
 {id:'children_data',label:'Профили детей',kind:'data',roles:['parent','specialist'],keywords:['children','parent_id','ребёнок','согласие'],tables:['children'],description:'parent_id связывает ребёнка с аккаунтом родителя; доступ ограничен ролью и согласием',x:600,y:75},
 {id:'slots_data',label:'Свободные окна',kind:'data',roles:all,keywords:['schedule_slots','specialist_id','свободно','слот','расписание'],tables:['schedule_slots'],description:'specialist_id → specialists.id; доступность меняется при брони и освобождении',x:1080,y:180},
 {id:'appointments_data',label:'Единая запись',kind:'data',roles:all,keywords:['appointments','child_id','slot_id','specialist_id','статус'],tables:['appointments'],description:'child_id → children.id; specialist_id → specialists.id; slot_id → schedule_slots.id',x:1080,y:730},
 {id:'receipt_data',label:'Закрытый чек',kind:'data',roles:['parent','specialist'],keywords:['receipt','чек','оплата','storage','приватно'],tables:['private.booking_payments','storage.objects'],description:'appointment_id → appointments.id; файл доступен только родителю и назначенному специалисту',x:600,y:855},
 {id:'team_data',label:'Состав клиники',kind:'data',roles:all,keywords:['clinic_members','clinic_id','specialist_id','команда'],tables:['clinic_members'],description:'clinic_id → clinics.id; specialist_id → specialists.id',x:120,y:730},
 {id:'rating_data',label:'Проверенный отзыв',kind:'data',roles:all,keywords:['reviews','appointment_id','формула','похожие','рейтинг'],tables:['reviews','private.review_case_features'],description:'UNIQUE appointment_id: один отзыв на посещение; для похожих случаев нужно отдельное согласие',x:120,y:180},
 {id:'tasks',label:'Цели и задания',kind:'screen',roles:['parent','specialist'],keywords:['задания','дома','цель','дневник','материал','видео'],tables:['child_goals','task_assignments','task_completions'],routes:{parent:'/diary?tab=home',specialist:'/pro/tasks'},description:'Назначение связывает ребёнка, специалиста и материал; выполнение попадает в дневник',x:600,y:320},
 {id:'community',label:'Сообщество',kind:'screen',roles:['parent'],keywords:['мамы','сообщество','вопрос','поддержка','аналар'],tables:['questions','answers'],routes:{parent:'/moms'},description:'Вопросы и опыт родителей',x:370,y:440},
 {id:'profile',label:'Личный профиль',kind:'screen',roles:all,keywords:['профиль','контакт','почта','имя','аккаунт','профиль семьи'],tables:['profiles','user_roles'],routes:{parent:'/profile',specialist:'/pro/profile',clinic:'/clinic'},description:'Роль, собственный контакт и настройки своего кабинета',x:850,y:75},
 {id:'settings',label:'Настройки',kind:'screen',roles:all,keywords:['настройки','язык','установка','приложение','баптау'],tables:['profiles'],routes:{parent:'/settings',specialist:'/settings',clinic:'/settings'},description:'Язык, установка приложения и параметры аккаунта',x:350,y:75},
 {id:'explain',label:'Простым языком',kind:'screen',roles:all,keywords:['объяснить','термин','заключение','словарь','простыми словами'],tables:[],routes:{parent:'/explain',specialist:'/explain',clinic:'/explain'},description:'Общие объяснения терминов без передачи данных ребёнка внешнему ИИ',x:120,y:440},
 {id:'compare',label:'Сравнение',kind:'screen',roles:['parent'],keywords:['сравнить','сравнение','выбрать','рейтинг','похожие случаи'],tables:['specialists','reviews','private.review_case_features'],routes:{parent:'/compare'},description:'Сравнение двух-трёх специалистов по условиям и рейтингам',x:1080,y:75},
 {id:'notifications',label:'Уведомления',kind:'screen',roles:all,keywords:['уведомления','напоминания','новости','подтверждение','хабарлама'],tables:['notifications'],routes:{parent:'/notifications',specialist:'/notifications',clinic:'/notifications'},description:'Сообщения о записях, сроках оплаты и действиях специалиста',x:850,y:855},
 {id:'moderation',label:'Модерация',kind:'screen',roles:['admin','moderator'],keywords:['модерация','проверка','жалоба','отзывы'],tables:['reviews','review_reports','specialists'],routes:{admin:'/admin',moderator:'/admin'},description:'Проверка публикаций уполномоченными сотрудниками',x:350,y:855}
];
export const navigationEdges:GraphEdge[]=[
 ...['family','providers','booking','payments','clinics','reviews','support'].map(target=>({source:'birge',target,relation:'раздел'})),
 {source:'family',target:'team',relation:'общий план',key:'child_id'},
 {source:'family',target:'children_data',relation:'данные',key:'parent_id'},
 {source:'providers',target:'slots_data',relation:'расписание',key:'specialist_id'},
 {source:'booking',target:'appointments_data',relation:'единая запись',key:'id'},
 {source:'payments',target:'receipt_data',relation:'подтверждает оплату',key:'appointment_id'},
 {source:'clinics',target:'team_data',relation:'команда',key:'clinic_id + specialist_id'},
 {source:'reviews',target:'rating_data',relation:'проверенное посещение',key:'appointment_id'},
 {source:'children_data',target:'appointments_data',relation:'ребёнок в записи',key:'child_id → children.id'},
 {source:'slots_data',target:'appointments_data',relation:'окно записи',key:'slot_id → schedule_slots.id'},
 {source:'receipt_data',target:'appointments_data',relation:'оплата занятия',key:'appointment_id → appointments.id'},
 {source:'rating_data',target:'appointments_data',relation:'отзыв за приём',key:'appointment_id → appointments.id'},
 {source:'team_data',target:'providers',relation:'специалист клиники',key:'specialist_id → specialists.id'},
 {source:'family',target:'tasks',relation:'цель ребёнка',key:'child_id'},
 {source:'providers',target:'tasks',relation:'назначение',key:'specialist_id'},
 {source:'tasks',target:'booking',relation:'работа после приёма',key:'child_id + specialist_id'},
 {source:'community',target:'family',relation:'опыт семьи',key:'parent_id'},
 {source:'payments',target:'booking',relation:'закрепляет слот',key:'appointment_id'},
 {source:'reviews',target:'providers',relation:'рейтинг специалиста',key:'specialist_id'},
 {source:'profile',target:'family',relation:'свой профиль',key:'parent_id'},
 {source:'profile',target:'settings',relation:'настройки аккаунта',key:'user_id'},
 {source:'explain',target:'family',relation:'общая справка без персональных данных'},
 {source:'compare',target:'providers',relation:'сравниваемые карточки',key:'specialist_id'},
 {source:'compare',target:'rating_data',relation:'оценки и похожие случаи',key:'specialist_id'},
 {source:'notifications',target:'booking',relation:'изменение записи',key:'parent_id → auth.users.id'},
 {source:'notifications',target:'payments',relation:'сроки и подтверждение оплаты',key:'parent_id → auth.users.id'},
 {source:'moderation',target:'reviews',relation:'проверка публикации',key:'review_id'}
];
export function roleGraph(role:string):NavigationGraph {const nodes=navigationNodes.filter(node=>node.roles.includes(role)).map(node=>({...node,route:node.routes?.[role]||null}));const ids=new Set(nodes.map(node=>node.id));return{nodes,edges:navigationEdges.filter(edge=>ids.has(edge.source)&&ids.has(edge.target))};}
export function searchGraph(graph:NavigationGraph,query:string){const normalize=(value:string)=>value.toLowerCase().replace(/ё/g,'е');const words=normalize(query).split(/[^\p{L}\p{N}_]+/u).filter(word=>word.length>1&&!['как','где','куда','мне','хочу','мой','моя','это','сделать'].includes(word));return graph.nodes.filter(node=>node.kind==='screen').map(node=>{const text=normalize(node.label+' '+node.keywords.join(' '));return{node,score:words.reduce((score,word)=>score+(text.includes(word)?3:word.length>=5&&text.includes(word.slice(0,4))?1:0),0)};}).filter(row=>!words.length||row.score>0).sort((a,b)=>b.score-a.score).slice(0,8).map(row=>row.node);}
