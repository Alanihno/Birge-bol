# Развёртывание и перенос
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
