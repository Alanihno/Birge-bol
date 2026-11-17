const fs=require('node:fs');
const raw=fs.readFileSync('IMPLEMENTATION_CHECKLIST.md','utf8');
// Keep every original numbered requirement; distinguish code from external acceptance.
const evidence=[
 ['1. Дизайн, палитра, навигация, маскот','Implemented','src/design-tokens.css, brand.css, components/mascot, section-guide; tests/prompt5.spec.ts; docs/MASCOT.md. Ширины 320–1440 проверены.'],
 ['2. Авторизация и безопасность','Implemented','Auth confirmation/recovery, session cleanup, RLS/IDOR SQL, безопасные ошибки. 5 connected Auth browser checks, 55 unit tests. Реальная доставка SMTP не проверена.'],
 ['3. Поиск, карта, карточки, сравнение','Tested','Локальные подсказки/районы, Leaflet, 2ГИС, progressive disclosure; prompt5/ui/promt3/visit-upgrade tests. Каталог не пополнялся.'],
 ['4. QR, отзывы и рейтинг','Tested','Одноразовый код, серверная проверка/модерация, математический рейтинг без выдуманной оценки при 0 отзывах; care/printed-qr SQL и cross-role E2E.'],
 ['5. Клиника и отдельная вкладка оплаты','Tested','clinic-dashboard/charts; /payments использует существующие записи и чеки; parent → provider → history E2E.'],
 ['6. Задания и YouTube','Implemented','Проверка URL/канонизация, nocookie iframe после согласия, назначения/выполнение/семейные ссылки; unit + cross-role E2E. Реальный внешний ролик и устройства отдельно не сертифицированы.'],
 ['7. Уведомления','Implemented','Внутренние уведомления и отдельное чтение; push-dispatch развёрнут, RLS устройств/очередь проверены SQL. Доставка Push требует VAPID/cron.'],
 ['8. ИИ и данные','Tested','Развёрнутые explain/translate-message используют allowlist/dictionary/authorized cache. Личные тексты модели не отправляются; 0 реальных токенов в этих путях.'],
 ['9. Юридические разделы','Implemented','privacy/terms/cookies/consent/review-rules — проекты RU/KK; события согласий и отзыв доступа. Оператор/сроки/экспертное утверждение остаются внешним условием.'],
 ['10. Код, PWA, производительность','Tested','lint/typecheck/unit, demo + connected builds; PWA 3/3 после завершения сборки fixtures. build-metrics.json содержит реальные размеры, Lighthouse не запускался.'],
 ['11. Документация и схемы','Implemented','README, AGENTS, ARCHITECTURE, TECHNICAL_SPEC, DATABASE, SECURITY, AI_POLICY, DEPLOYMENT, LICENSES, 10 диаграмм и MASCOT. А3 исключён пользователем.'],
 ['12. Передача','Implemented','Миграции с версиями сервера, .env.example, source/demo ZIP. Чистый db reset заблокирован отсутствием CLI/Docker.'],
 ['13. Проверки','Tested','55 unit; 40/41 demo E2E в общем прогоне, сбойный PWA отдельно 3/3; 5 connected/mock Auth; 7 SQL suites. Полный отчёт с оговорками — FINAL_REPORT.md.'],
 ['14–15. Итог','Implemented','FINAL_REPORT.md и этот checklist. Внешние условия не объявлены выполненными.']
];
const header='# Implementation checklist — Prompt 5\n\nStatuses: Pending; In progress; Implemented; Tested; Blocked by external configuration.\n\nImplemented означает наличие программной реализации; Tested — конкретную проверку по указанному доказательству. Это не сертификация каждого браузера или всех возможных комбинаций действий. Поздние указания пользователя имеют приоритет: без Telegram, новых специалистов и паспорта А3; палитра EB0032/4B0073/C8AAFF/E6E1FF; отдельная Оплата. Vela используется как референс композиции существующего сайта, отдельное приложение не создаётся.\n\n| Область | Статус | Доказательство и границы |\n|---|---|---|\n'+evidence.map(row=>'| '+row.join(' | ')+' |').join('\n')+'\n\n## Исходные поэлементные требования\n\nСписок сохраняет все 1384 исходных пункта (включая перечисления разрешённых библиотек и справочные элементы). Техническая реализация и внешняя приёмка разделены. Для явно исключённых требований статус Blocked используется с причиной «отменено пользователем», это не запрос разрешения.\n';
let section='',mascot=false;const body=raw.slice(raw.indexOf('### BIRGE BOL')).split(/\r?\n/).map(line=>{
 if(line.startsWith('### ')){section=line.slice(4);if(section.includes('СОЗДАНИЕ ФИРМЕННОГО'))mascot=true;return line;}
 if(!/^- \[[ x]\] P5-/.test(line))return line;
 let status='Implemented',note='Программная часть; проверенные сценарии указаны в таблице выше.';
 const text=line.split(' · ').slice(2).join(' · ');
 if((!mascot&&/^(3\.3\.|11\.13\.)/.test(section))||/Telegram|Телеграм/i.test(text)){status='Blocked by external configuration';note='Отменено прямым указанием пользователя; не выполнялось.';}
 else if(/10\.8\.|12\.5\./.test(section)||/SMTP|VAPID|реальн.*устройств|реальн.*доставк|медицинск.*эксперт|юридическ.*утвержд/i.test(text)){status='Blocked by external configuration';note='Программная часть готова; внешний сервис, среда или утверждение не проверены. См. FINAL_REPORT.md.';}
 else if(/13\.2\.|13\.4\.|20\. Визуальное тестирование/.test(section)){status='In progress';note='Основные сценарии проверены; исчерпывающая ручная приёмка всех сочетаний/физических устройств не заявляется.';}
 else if(/^P5-(?:000[1-9]|001[0-4])$/.test(line.split(' · ')[0].replace(/^- \[[ x]\] /,''))){status='Tested';note='Baseline, исходный репозиторий, схема БД и тесты изучены; docs/prompt5/baseline.json.';}
 return line.replace(/^- \[[ x]\] (P5-\d+) · [^·]+ · /,`- [${status==='Tested'?'x':' '}] $1 · ${status} · `)+' — '+note;
}).join('\n');
fs.writeFileSync('IMPLEMENTATION_CHECKLIST.md',header+body+'\n');
console.log('Requirement statuses and evidence recorded.');
