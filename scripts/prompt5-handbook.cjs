const fs=require('node:fs');const write=(file,text)=>fs.writeFileSync(file,text.trim()+'\n');
const modules=[
 ['identity','Email, roles, account lifecycle',['src/lib/app-context.tsx','src/pages/auth.tsx','src/pages/auth-recovery.tsx','supabase/functions/account-delete/index.ts'],['profiles','user_roles','consent_events'],['register_care_role'],['parent','specialist','clinic','admin','moderator'],'private',['tests/connected-auth.spec.ts','supabase/tests/rls.sql']],
 ['catalog','Catalog, local search, map',['src/pages/find.tsx','src/domain/search.ts','src/components/catalog-map.tsx','src/lib/map-links.ts'],['specialists','schedule_slots'],[],['parent','specialist'],'public',['tests/prompt5.spec.ts','tests/prompt4-display.spec.ts']],
 ['booking','Single appointment, holds, receipts, payment cart',['src/pages/specialist.tsx','src/pages/payments.tsx','src/components/payment-actions.tsx','src/lib/care-api.ts'],['appointments','schedule_slots','private.booking_payments'],['care_book_slot','care_command','care_snapshot'],['parent','specialist','clinic'],'private',['tests/visit-upgrade.spec.ts','supabase/tests/payment-holds.sql']],
 ['attendance','One-use visit codes and printed entry QR',['src/pages/check-in.tsx','src/components/visit-code-dialog.tsx','src/components/printed-qr.tsx'],['appointments','private.attendance_tokens','private.specialist_qr_codes'],['care_confirm_qr','care_specialist_qr','care_command'],['parent','specialist'],'private',['tests/visit-upgrade.spec.ts','supabase/tests/printed-qr-ratings-calendar.sql']],
 ['reviews','Moderated reviews, versioned Bayesian rating',['src/pages/feedback.tsx','src/domain/logic.ts','src/domain/ratings.ts','src/lib/ratings.ts'],['reviews','private.review_case_features'],['care_submit_review','care_ratings'],['parent','moderator'],'public-after-moderation',['src/domain/ratings.test.ts','supabase/tests/printed-qr-ratings-calendar.sql']],
 ['care','Assignments, completions, diary, private material storage',['src/pages/diary.tsx','src/pages/pro.tsx','src/components/care-ui.tsx','src/components/safe-video.tsx','src/lib/youtube.ts'],['task_materials','task_assignments','task_completions','child_goals','progress_entries'],['care_command','family_task'],['parent','specialist'],'medical-private',['tests/family-clinic.spec.ts','supabase/tests/care.sql']],
 ['clinic','Clinic-scoped dashboard and journal',['src/pages/clinic.tsx','src/components/clinic-dashboard.tsx','src/domain/clinic-analytics.ts'],['clinics','clinic_members','appointments','schedule_slots'],['care_snapshot','care_command'],['clinic'],'private',['tests/prompt5.spec.ts','tests/family-clinic.spec.ts']],
 ['notifications','Inbox, per-device Web Push, server queue',['src/components/push-settings.tsx','src/lib/push.ts','src/sw.ts','supabase/functions/push-dispatch/index.ts'],['notifications','push_subscriptions','notification_preferences','private.push_deliveries'],['register_push_device','remove_push_device','claim_push_batch','finish_push_delivery','schedule_notification_reminders'],['parent','specialist','clinic'],'private',['supabase/tests/prompt5.sql','tests/prompt5.spec.ts']],
 ['knowledge','Approved dictionary, allowlist, cache-only translation',['src/pages/explain.tsx','supabase/functions/explain/index.ts','supabase/functions/translate-message/index.ts','supabase/functions/_shared/ai-gateway.ts'],['message_translations','content_translations','private.ai_metrics'],['record_ai_metric','consume_function_quota'],['parent','specialist','clinic'],'public-dictionary-or-authorized-cache',['src/domain/prompt5.test.ts','supabase/tests/gemini-access.sql']],
 ['experience','Brand, mascot, existing navigation assistant, cookies',['src/design-tokens.css','src/brand.css','src/components/mascot/Mascot.tsx','src/components/section-guide.tsx','src/components/cookie-banner.tsx','src/pages/mascot-gallery.tsx'],['app_graph_nodes','app_graph_edges','app_graph_keywords'],['app_navigation_graph'],['parent','specialist','clinic'],'public',['tests/prompt5.spec.ts']],
 ['privacy','Legal drafts and consent event log',['src/pages/legal-documents.tsx','src/lib/consents.ts','src/lib/privacy-preferences.ts'],['consent_events'],[],['parent','specialist','clinic'],'private',['supabase/tests/prompt5.sql']],
 ['delivery','Vite build, PWA update and hosting',['vite.config.ts','vercel.json','src/sw.ts','src/lib/update-safety.ts','src/lib/pwa-context.tsx'],[],[],['all'],'static-shell-only',['tests/prompt4-pwa.spec.ts','tests/install.spec.ts']],
];
const schema=JSON.parse(fs.readFileSync('docs/prompt5/database-schema.json','utf8'));const names=new Set(schema.tables.map(t=>t.schema==='public'?t.name:t.schema+'.'+t.name));
write('ARCHITECTURE.json',JSON.stringify({project:'Birge Bol',version:'2026-11-17',stack:['React 19','TypeScript','Vite','Supabase','PostgreSQL','PWA'],entrypoints:['index.html','src/main.tsx','src/App.tsx','src/sw.ts'],modules:modules.map(([name,purpose,paths,tables,rpcs,roles,sensitivity,tests])=>({name,purpose,paths,entrypoints:[paths[0]],dependencies:['identity','delivery'].filter(d=>d!==name),tables:tables.filter(t=>names.has(t)),api:rpcs,roles,ai:name==='knowledge'?'dictionary/cache only; no external text transmission':false,sensitivity,tests})),relations:[['identity','booking'],['catalog','booking'],['booking','attendance'],['attendance','reviews'],['booking','notifications'],['care','notifications'],['experience','privacy']]},null,2));
write('AGENTS.md',`# Birge Bol — instructions for maintainers
Read this file and ARCHITECTURE.json first, then only the relevant module and tests.
Keep React + TypeScript + Vite + Supabase; no replacement app or parallel backend.
src/pages contains routes, src/components reusable UI, src/domain pure rules, src/lib data access, supabase migrations/functions/tests.
Roles: parent, specialist, clinic, admin/moderator; role grants come from user_roles and guarded RPC, never editable user_metadata.
Never send child profiles, diary, messages, addresses, identity fields or medical details to an external model. Known terms and navigation use zero AI tokens.
Use additive migrations; inspect schema and RLS first. Never remove real records. Tests against hosted DB must use synthetic fixtures in BEGIN/ROLLBACK.
Keep demo and connected modes separate; never replace network failures with synthetic success. No known-password quick login in production unless explicitly enabled for isolated demo.
Mutations go through existing care_command/RPC and invalidate care/personal/catalog caches. Never duplicate appointments for each role.
Secrets belong in server environment, never VITE_ or Git. Never log JWT, push endpoints, medical data or message bodies.
Run npm run typecheck, npm run lint, npm test, npm run build:demo and relevant Playwright/SQL flows. Record actual evidence, do not fabricate Lighthouse, email or push delivery results.
Update README, ARCHITECTURE.json, DATABASE.md, IMPLEMENTATION_CHECKLIST.md and FINAL_REPORT.md for material changes.
Current explicit user constraints: no Telegram work; no additional specialists; no A3 passport. Palette: EB0032/4B0073/C8AAFF/E6E1FF. Parent payments live at /payments.
Do not run one-off prompt5 implementation scripts again: they record the one-time work and are not idempotent migrations.
`);
write('README.md',`# Birge Bol
Платформа поиска поддержки для родителей детей с особенностями развития, специалистов и клиник. Найти. Понять. Видеть прогресс.

React 19 + TypeScript + Vite 7; Supabase PostgreSQL/Auth/Storage/Edge Functions; TanStack Query; Leaflet/OpenStreetMap; локальная PWA. Node.js 22.18+ (проверено с 24.22.2), npm.

## Запуск
\x60\x60\x60sh
npm ci
cp .env.example .env.local
npm run dev
\x60\x60\x60
В PowerShell: Copy-Item .env.example .env.local; используйте npm.cmd, если npm.ps1 заблокирован политикой ОС.
По умолчанию VITE_APP_MODE=demo: синтетические данные только в браузере. Реальная авторизация и отправка писем не имитируются.

Для подключённой версии: VITE_APP_MODE=supabase, URL своего проекта и publishable/anon key. Нужны все миграции, Storage policies, Auth redirect URLs, SMTP и Edge Functions: [DEPLOYMENT.md](DEPLOYMENT.md).

## Возможности
- Поиск по запросу, специализации и району; карта и 2ГИС; алгоритмическое сравнение.
- Запись, независимые статусы посещения и оплаты, отдельная корзина /payments, закрытые чеки, ручное подтверждение денег.
- Одноразовые коды посещения и отзывы после серверной проверки и модерации.
- Кабинеты специалиста и клиники; назначения, дневник, роли и отзыв доступа.
- YouTube по проверенной ссылке с согласием; локальные и защищённые материалы.
- Внутренние уведомления; Web Push подготовлен, требует VAPID и планировщика.
- Один SVG-маскот, локальные подсказки, cookie-настройки, RU/KK, PWA-обновления.

## Команды
\x60\x60\x60sh
npm run typecheck
npm run lint
npm test
npm run build
npm run build:demo
npm run test:e2e
npm run package:demo
node scripts/generate-vapid.cjs
node scripts/prompt5-handbook.cjs
\x60\x60\x60
Последняя команда обновляет документацию из схемы. Генератор VAPID печатает секрет только для ручного переноса в серверное хранилище: не сохраняйте вывод в репозитории.

## Передача
[Техническое описание](TECHNICAL_SPEC.md), [архитектура](ARCHITECTURE.json), [база](DATABASE.md), [безопасность](SECURITY.md), [ИИ](AI_POLICY.md), [схемы](docs/diagrams.md), [маскот](docs/MASCOT.md), [лицензии](LICENSES.md), [итог](FINAL_REPORT.md).

## Ограничения
Юридические документы — проекты. Оператор, сроки хранения, хранение/передача данных Казахстана и медицинские правила требуют утверждения. Текущий облачный Supabase находится в ap-southeast-2. До утверждения используйте только синтетические данные.
Автоматическая банковская интеграция отсутствует. Открытие ссылки банка не означает оплату. Внешний перевод личных текстов отключён; доступны подготовленные переводы. Неизвестный термин не отправляется модели. Не создавались новые специалисты, Telegram не изменялся, паспорт А3 исключён пользователем.
`);
write('TECHNICAL_SPEC.md',`# Техническое описание Birge Bol
Версия 2026-11-17. Существующий MVP расширен без смены стека.

## Роли и сценарии
Родитель: регистрация/подтверждение email → анкета → поиск/сравнение → бронь → ручная оплата с чеком → подтверждение → посещение → отзыв → назначения и дневник.
Специалист: модерация профиля → расписание → заявки → подтверждение денег → посещение и одноразовый код → цели/назначения → обратная связь.
Клиника: собственная команда/филиалы, расписание, журнал, оплата и аналитика. Полные детские дневники клинике не передаются.
Администратор/модератор: публикации и проверка в пределах серверной роли. Пользователь не выдаёт себе роль администратора.

## Инварианты
Одна запись — одна сущность appointments; роли получают разные безопасные представления. Бронь и оплата независимы. Отмена не является возвратом. Один приём даёт один отзыв, публикация требует посещения и модерации. Рейтинг сохраняет существующую Bayesian-формулу, а при отсутствии своих отзывов оценка отсутствует. Это не медицинская валидированная шкала.
Расписания хранятся в timestamptz, отображаются Asia/Almaty. База проверяет конфликты, время, владельца, организацию и согласие. Завершение задания сохраняется отдельно и ограничивается существующим правилом один раз в день, повторяющиеся дни — разные сеансы.
Алгоритмы рекомендаций являются информационными правилами, не диагнозами. Новые медицинские правила требуют экспертного утверждения.

## Интерфейс и интеграции
Единая палитра в src/design-tokens.css, роли цветов в src/brand.css. Красный EB0032 для сердца и основных CTA; индиго 4B0073 для текста; C8AAFF для акцентов; E6E1FF для зон. Карточки раскрывают подробности. Основная навигация включает /payments. Ошибки очищаются от SQL, идентификаторов и внутренних подробностей.
Карта загружается отдельным чанком, использует хранимые/демокоординаты и атрибуцию OSM. Список остаётся доступен при сбое тайлов. YouTube разрешён только с точными доменами и валидным ID, iframe создаётся после действия и согласия.
Маскот — оригинальный SVG, 14 состояний включая hidden, без API и тяжёлой 3D-библиотеки; поддерживает reduced-motion, паузу скрытой вкладки и IntersectionObserver.

## Готовность
Для технической передачи: воспроизводимая сборка, миграции, описание конфигурации, автоматические проверки, открытые ограничения. Для реального запуска дополнительно обязательны утверждённые юридические и медицинские условия, SMTP, проверка восстановления доступа и реальных устройств. Непроверенные внешние доставки не объявляются работающими.
`);
let database='# База данных\n\nСнимок из подключённого PostgreSQL, 17.11.2026. Полный машиночитаемый снимок: docs/prompt5/database-schema.json. Источник изменений — supabase/migrations в хронологическом порядке. Снимок не включает auth.users и секреты Vault.\n\n';
for(const table of schema.tables){database+=`## ${table.schema}.${table.name}\n\n`+table.columns.map(c=>`- ${c.name}: ${c.type}${c.nullable==='NO'?' NOT NULL':''}${c.default?' DEFAULT '+c.default:''}`).join('\n')+'\n\nОграничения:\n\n'+(table.constraints||[]).map(c=>'- '+c).join('\n')+'\n\nИндексы:\n\n'+(table.indexes||[]).map(c=>'- '+c).join('\n')+'\n\nRLS:\n\n'+(table.policies||[]).map(p=>`- ${p.name}: ${p.command}; роли ${p.roles.join(', ')}; USING ${p.using||'—'}; CHECK ${p.check||'—'}`).join('\n')+'\n\n';}
database+='## Связанные функции\n\n'+schema.functions.map(f=>`- ${f.schema}.${f.name}(${f.arguments}) — ${f.security_definer?'SECURITY DEFINER, проверять scope/EXECUTE':'SECURITY INVOKER'}`).join('\n')+'\n\nER и граф информации: [docs/diagrams.md](docs/diagrams.md).\n';write('DATABASE.md',database);
write('SECURITY.md',`# Безопасность
Supabase Auth: подтверждённый email, восстановление по ссылке, серверный getUser для функций. Frontend Gate — только UX; данные защищают RLS и guarded RPC. Роль находится в user_roles; user_metadata не используется как разрешение.
Публичные профили специалистов отделены от личных аккаунтов. Согласия хранятся как append-only события с user_id, типом, версией, фактом и серверным временем. Доступ к данным ребёнка зависит от записи, организации и разрешения; аудио отдельно приватно.
Чеки booking-receipts и материалы care-materials — приватные buckets; ссылки краткосрочные. Не кэшировать приватные API, signed URLs и медицинские данные в Service Worker. При выходе очищаются Query cache, активный ребёнок, черновики текущей сессии и подписка устройства.
QR: одноразовый код связан с записью, срок ограничен, сервер хранит и проверяет токен; постоянный QR входа дополнительно проверяет запись и окно посещения, сам по себе не исключает сговор. Один отзыв на запись; публикация модерируется. Старые токены не считать доказательством новой записи.
Web Push: endpoint allowlist предотвращает SSRF; подписки читаются только владельцем; reassignment устройства атомарный; dispatch и очередь доступны только service_role/cron secret; payload фиксированно нейтральный. Очередь at-least-once, стабильный tag уменьшает дубликаты на устройстве; строгая exactly-once доставка браузером не гарантируется.
AI: внешняя передача личного текста отключена; allowlist разрешает только известный термин; техническая статистика не хранит текст/ID пользователя.
Ошибка пользователю — безопасное сообщение; stack, SQL, ключи и UUID не выводятся. Необязательные медиа не загружаются до согласия. CSP нужно разрешать только используемые origins и YouTube nocookie frame-src.
Telegram и Telegram-2FA исключены пользователем; активность этой защиты не заявляется. Не отключать существующие интеграции без отдельного задания.
Пароли: регистрация и смена пароля проверяют минимум 12 символов и Pwned Passwords через k-anonymity: наружу идут первые 5 символов SHA-1, без пароля, полного хеша, email и referrer. Padding включён. При недоступной/некорректной проверке новый пароль не принимается; вход и запрос восстановления не блокируются. SHA-1 здесь только формат диапазона, а не хранение паролей. Unit и браузерные проверки подтверждают блокировку до signup.
Проект Supabase находится на Free. Встроенная серверная HIBP-защита требует Pro: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . Advisor WARN остаётся. Это предупреждение о настройке, не доказательство утечки. Проверка форм обходится прямым обращением к Auth API и не заменяет серверную защиту; для её включения нужен переход на Pro и настройка владельцем. Платный тариф не подключался.
Открытые условия: SMTP/redirect URLs, VAPID/cron, юридический оператор/хранение, экспертное согласование, реальные мобильные устройства. Проверки RLS/IDOR выполнялись на синтетических транзакционных fixtures с ROLLBACK, не являются полным независимым аудитом безопасности.
`);
write('AI_POLICY.md',`# Политика ИИ
Версия 2026-11-17.allowlist.1. В этой версии новые обращения к внешней модели отсутствуют.

| Источник | Назначение | Поля | Ограничение | Модель/токены |
|---|---|---|---|---|
| pages/explain → Edge explain | Учебный словарь | Только term, точное совпадение термина/названия | term ≤80, body ≤2048 bytes, auth + quota | dictionary, 0 |
| MessageTranslation → translate-message | Готовый перевод доступного сообщения | message_id, kind, target; текст читается под JWT только для проверки хеша | body ≤1024 bytes, ID/тип/язык allowlist | cache или 503, 0 |
| Поиск, сравнение, отзывы, маскот | Локальные правила, математический алгоритм, шаблоны | Нет внешней передачи | В существующих модулях | 0 |

Ранее explain перефразировал готовые объяснения через Gemini, а переводчик отправлял body из авторизованной строки. Доступ к строке не делает её безопасной для передачи третьему лицу. Этот путь удалён из развёрнутых функций. Подготовленные переводы возвращаются лишь при совпадении SHA-256 исходника и разрешении RLS. Клиентский произвольный текст не принимается.
Запрещены профили, ФИО, ИИН, email, телефон, точная дата рождения, адрес, диагноз конкретного человека, дневник, голос, фото, документы, история посещений и секреты. Удаление имени не является достаточной анонимизацией.
Неизвестный термин: безопасное сообщение обратиться к специалисту. Новая генерация знаний не публикуется автоматически. Для будущей модели потребуются отдельная review-политика, allowlist общих категорий, лимиты бюджета, схема ответа и модерация черновика. Не подключать внешнюю модель к БД/административным инструментам.
private.ai_metrics: feature/outcome/input_tokens/output_tokens/time; только service_role может писать, в этой версии dictionary/cache/blocked всегда 0 реальных токенов. Нет текста и ID пользователей. SQL для технической агрегации: select feature,outcome,count(*),sum(input_tokens),sum(output_tokens) from private.ai_metrics group by feature,outcome. Денежная экономия не измерялась, тарифы не подставлялись.
Локальная база terms.json и словарь src/domain/data.ts — учебные тексты, требуют экспертного утверждения перед реальным медицинским продуктом. Архитектурный граф PostgreSQL не является внешней графовой БД. Рабочие запросы и действия не требуют AI_ENABLED.
`);
write('DEPLOYMENT.md',`# Развёртывание и перенос
## Локальная установка
Получите репозиторий у владельца, установите Node 22.18+ / npm. npm ci; скопируйте .env.example в .env.local. Для демо достаточно VITE_APP_MODE=demo. Для сервера организации поддержаны HTTPS URL собственного Supabase и локальный http://127.0.0.1 только в dev. Нужны полноценные Postgres/Auth/Storage/Edge services; одного ключа недостаточно.

## Supabase
Сначала резервная копия и отдельная тестовая среда. Применяйте supabase/migrations по имени версии. CLI команды сверяйте через supabase --help; для актуального CLI v3 явно выбирайте локальную/hosted цель. В этой сессии CLI не установлен и загрузка npm запрещена средой, Docker daemon недоступен; чистый db reset не проверен. Применённые через MCP миграции сохранены с версиями сервера, не придуманными именами.
Исторические миграции содержат синтетические fixtures: не включайте существующие известнопарольные демоаккаунты в доступный рабочий пилот. Новых специалистов в этом обновлении нет. Seed-файлы запускать только на изолированной демонстрации; они не нужны для подключения реальных семей.
Проверьте RLS через supabase/tests/rls.sql, prompt5.sql и подходящие transactional suites. Таблицы и типы — DATABASE.md. Buckets care-materials/booking-receipts остаются private. Не импортируйте пользовательские данные из другой организации.

## Auth и почта
Auth → Site URL: реальный HTTPS origin. Redirect allowlist: /auth/confirm и /auth/recovery на этом origin; отдельно dev URL. Включите email confirmation, настройте SMTP своего оператора и rate limits. Шаблоны supabase/templates — ConfirmationURL от Supabase, не собственные OTP. Не считайте отправку письма проверенной до реального получения. На текущем Free-проекте встроенная HIBP-защита недоступна: требуется Pro и включение в Auth. Бесплатная проверка форм уже реализована, но не закрывает прямой Auth API. CSP connect-src должен разрешать https://api.pwnedpasswords.com. Подробности — SECURITY.md.

## Edge Functions
Разверните explain, translate-message, care-media, account-delete, calendar-feed и push-dispatch. Сохраните JWT flags из config.toml; push-dispatch проверяет отдельный PUSH_CRON_SECRET, care-media — короткий family token/права. ALLOWED_ORIGINS задаётся точным перечнем своего production origin и нужных dev origins. Server URL/service key предоставляются инфраструктурой, не браузером. Telegram не менять: исключено пользователем.

## Web Push
node scripts/generate-vapid.cjs печатает пару P-256. Публичный ключ: VITE_VAPID_PUBLIC_KEY во frontend и VAPID_PUBLIC_KEY в Edge secrets. Закрытый — только VAPID_PRIVATE_KEY в серверном хранилище. VAPID_SUBJECT — утверждённый mailto/HTTPS контакт. PUSH_CRON_SECRET — отдельный случайный длинный секрет. Ключи не созданы/не опубликованы автоматически: в доступном коннекторе нет управления Edge secrets.
Supabase Cron или свой системный планировщик вызывает POST https://<project>/functions/v1/push-dispatch каждые 1–5 минут, с Authorization: Bearer <PUSH_CRON_SECRET>. Секрет передаётся через Vault/планировщик, не SQL исходник/Git. Функция планирует напоминания, атомарно арендует batch, отправляет нейтральный payload и удаляет 404/410 подписки. Следить за 503/429 и очередью после 5 неудач. VAPID/реальная доставка пока требуют настройки и проверки устройства.

## Сборка и хостинг
npm run build → dist; npm run build:demo → dist-demo. Vercel: существующий проект birge-bol, Vite, build npm run build, output dist; переменные задаются до сборки. Домен и HTTPS назначаются в существующем проекте. vercel.json содержит SPA rewrite и безопасное кэширование. robots.txt/sitemap.xml не должны переписываться на index.html. YouTube требует frame-src https://www.youtube-nocookie.com. Проверяйте /auth/recovery, /payments, /version.json, /sw.js и обновление установленной PWA.
Для хостинга организации: отдавайте dist по HTTPS, SPA fallback только для маршрутов, hashed assets immutable, HTML/version/SW no-store; укажите домен в VITE_SITE_URL, обновите redirect/CORS. Не кэшируйте приватные API.

## Перед реальным запуском
Утвердить оператора, контакты/сроки хранения/основания, трансграничную передачу и локализацию, медицинские правила, лицензии материалов, SMTP и восстановление аккаунта, VAPID и физические устройства, чистую установку БД и восстановление backup. Не объявлять демоверсию готовой для реальных данных детей.
`);
write('docs/MASCOT.md',`# Бірге
Единый персонаж: src/components/mascot/Mascot.tsx; имя и состояния в mascot-states.ts, сценарии RU/KK в mascot-messages.ts. Размеры small/medium/large/hero; direction left/right/up/down/center; reducedMotion, interactive, visible и label.
Состояния: idle, greeting, waving, pointing, explaining, thinking, loading, success, celebrating, comforting, error, offline, sleeping, hidden. useMascot контролирует приоритет и возврат одноразовых состояний к idle. Галерея /mascot-gallery требует входа, исключена из индексации.
SVG имеет уникальные useId градиенты, отдельные руки/кисти/ноги/глаза/зрачки/брови/рот/блики/тень. Взгляд ограничен ±4/3 px, pointer listener обновляет CSS через rAF. IntersectionObserver и visibilitychange останавливают невидимую анимацию. prefers-reduced-motion отключает движение и частицы. Читателю экрана доступен основной текст, декоративный SVG скрыт.
Интеграции: hero, how-to, trust лендинга; existing SectionGuide и короткий tour; Welcome; cookie-баннер; Empty, Loading, ErrorState и глобальная ошибка; offline bar; успешная отправка отзыва; корзина оплаты. Убран символ-заглушка Empty, декоративные орбиты hero, случайные символы preview шага, росток Welcome, цветок sidebar. Фото специалистов остаются содержанием профиля.
Cookies: тот же Mascot в состоянии explaining смотрит на текст. Три действия: принять все/только необходимые/настроить. Выбор версии 1 хранится локально; media=false не создаёт iframe YouTube. Аналитика не установлена. Повторное открытие в настройках и /cookies. Отказ не мешает Auth.
Цвета персонажа наследуют утверждённые C8AAFF/E6E1FF/4B0073 через design-tokens.css. Не добавлены внешние картинки, платные сервисы или ИИ-вызовы.
`);
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));let licenses='# Сторонние лицензии\n\nЛицензия на весь Birge Bol не назначается: права определяет владелец. Данные ниже взяты из установленных package.json; проверьте тексты LICENSE при передаче.\n\n| Библиотека | Версия | Лицензия | Источник |\n|---|---|---|---|\n';for(const [name,version]of Object.entries({...pkg.dependencies,...pkg.devDependencies})){const p='node_modules/'+name+'/package.json';const metadata=fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):{};licenses+=`| ${name} | ${version} | ${metadata.license||'Требует проверки'} | https://www.npmjs.com/package/${name} |\n`;}
licenses+='\nInter: @fontsource/inter, SIL OFL-1.1 (см. пакет). Lucide icons: ISC. Leaflet: BSD-2-Clause. OpenStreetMap: ODbL для данных, обязательная атрибуция и отдельная tile usage policy. YouTube не передаёт приложению права на содержимое: специалист подтверждает права, Unlisted не является приватностью. Новый маскот и логотип нарисованы в проекте; окончательные права определяет владелец. Старые фото/материалы и сведения справочника требуют проверки происхождения; не считать их автоматически лицензированными для коммерческого запуска. Референсы Vela и недоступная ссылка Drive не импортированы как чужой контент.\n';write('LICENSES.md',licenses);
console.log('Handoff documents generated; A3 explicitly excluded.');
