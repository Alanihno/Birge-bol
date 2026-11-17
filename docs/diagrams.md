# Архитектурные схемы

Telegram и паспорт А3 исключены пользователем. Пунктир не обозначает проверенную внешнюю доставку.

## Приложение

```mermaid
flowchart LR
 Parent[Родитель] --> UI[React / Vite / PWA]
 Specialist[Специалист] --> UI
 Clinic[Клиника] --> UI
 UI --> Auth[Supabase Auth]
 UI --> JWT[JWT + RLS / guarded RPC]
 JWT --> DB[(PostgreSQL)]
 UI --> Edge[Edge Functions]
 Edge --> JWT
 JWT --> Storage[Private Storage / short signed URL]
```

## ER и информационный граф

```mermaid
erDiagram
 AUTH_USERS ||--o{ CHILDREN : parent_id
 AUTH_USERS ||--o{ CONSENT_EVENTS : user_id
 AUTH_USERS ||--o{ PUSH_SUBSCRIPTIONS : user_id
 CHILDREN ||--o{ APPOINTMENTS : child_id
 SPECIALISTS ||--o{ APPOINTMENTS : specialist_id
 SPECIALISTS ||--o{ SCHEDULE_SLOTS : specialist_id
 SCHEDULE_SLOTS ||--o{ APPOINTMENTS : slot_id
 APPOINTMENTS ||--o| REVIEWS : appointment_id
 CHILDREN ||--o{ CHILD_GOALS : child_id
 CHILD_GOALS ||--o{ PROGRESS_ENTRIES : goal_id
 TASK_MATERIALS ||--o{ TASK_ASSIGNMENTS : material_id
 CHILDREN ||--o{ TASK_ASSIGNMENTS : child_id
 TASK_ASSIGNMENTS ||--o{ TASK_COMPLETIONS : assignment_id
 CLINICS ||--o{ CLINIC_MEMBERS : clinic_id
 SPECIALISTS ||--o{ CLINIC_MEMBERS : specialist_id
```

```mermaid
flowchart LR
 User[Запрос пользователя] --> Graph[(app_graph_nodes / keywords / edges)]
 Graph --> Role[Фильтр роли]
 Role --> Screen[Разрешённый маршрут]
 Screen --> FK[Реальные FK и сущности]
 Terms[Учебный словарь] --> Explanation[Готовое объяснение]
```

## Роли

```mermaid
flowchart TD
 Auth[Подтверждённый аккаунт] --> Roles[(user_roles)]
 Roles --> Parent[Только свои дети и записи]
 Roles --> Specialist[Свои слоты / разрешённые пациенты]
 Roles --> Clinic[Собственная организация / безопасный журнал]
 Roles --> Moderator[Публикации по серверной роли]
 Parent --> Consent[Отдельное согласие на данные]
 Consent --> Specialist
```

## QR и отзывы

```mermaid
sequenceDiagram
 participant S as Специалист
 participant P as Родитель
 participant DB as RPC / PostgreSQL
 S->>DB: issue_code(appointment)
 DB->>DB: роль, запись, время, срок, hash
 DB-->>S: одноразовый код / QR
 P->>DB: redeem_code(appointment, code)
 DB->>DB: владелец, hash, срок, попытки, одноразовость
 DB-->>P: посещение подтверждено
 P->>DB: care_submit_review
 DB->>DB: UNIQUE appointment_id / модерация
 DB-->>P: отзыв ожидает проверки
```

```mermaid
flowchart LR
 Answers[Ответы родителя] --> Template[Строгий локальный шаблон]
 Template --> Preview[Предпросмотр / собственный комментарий]
 Preview --> Verified[Серверная проверка посещения]
 Verified --> Moderation[Модерация]
 Moderation --> Rating[Существующая Bayesian формула]
 Rating --> Public[Публичная оценка при наличии своих отзывов]
```

## Домашние задания

```mermaid
flowchart LR
 Provider[Специалист с доступом] --> Approved[Одобренный материал]
 Approved --> Assignment[Назначение конкретному ребёнку]
 Assignment --> Parent[Родитель]
 Parent --> Completion[Выполнение / результат / комментарий]
 Completion --> Diary[Дневник]
 Completion --> Feedback[Обратная связь специалисту]
```

## Оплата

```mermaid
stateDiagram-v2
 [*] --> awaiting_payment: бронь платного слота
 awaiting_payment --> payment_reported: чек + заявление родителя
 payment_reported --> confirmed: сотрудник проверил поступление
 awaiting_payment --> expired: серверный срок истёк
 awaiting_payment --> cancelled: отмена
 payment_reported --> cancelled: отмена по правилам
 note right of confirmed: Независимо от посещения
 note right of cancelled: Возврат не создаётся автоматически
```

## Web Push

```mermaid
flowchart LR
 Gesture[Явное действие пользователя] --> Permission[Notification permission]
 Permission --> Browser[PushSubscription]
 Browser --> Own[(RLS + привязка устройства)]
 Event[События care / server reminders] --> Inbox[(notifications)]
 Cron[Настраиваемый Cron + секрет] -.-> Dispatch[push-dispatch]
 Inbox --> Lease[Идемпотентная очередь / lease]
 Own --> Lease
 Lease --> Dispatch
 Dispatch -.-> Provider[Web Push endpoint]
 Provider -.-> SW[Service Worker]
 SW --> Neutral[Нейтральное сообщение]
 Neutral --> Auth[Вход / центр уведомлений]
```

## ИИ и кэш

```mermaid
flowchart TD
 Request[Авторизованный запрос] --> Allow[Строгий allowlist полей]
 Allow --> Quota[Лимит запросов]
 Quota --> Term{Известный термин?}
 Term -->|Да| Dictionary[Утверждаемый учебный словарь]
 Term -->|Нет| Unavailable[Уточните у специалиста]
 Translation[Запрос перевода по ID] --> RLS[Чтение строки под JWT]
 RLS --> Hash[SHA-256 исходника]
 Hash --> Cache{Готовый перевод совпадает?}
 Cache -->|Да| Result[Перевод из кэша]
 Cache -->|Нет| Blocked[Внешняя передача отключена]
 Dictionary --> Metrics[Техническая статистика без текста]
 Result --> Metrics
 Blocked --> Metrics
```

## Доставка приложения

```mermaid
flowchart LR
 Repo[Исходники + lockfile] --> CI[npm ci / проверки]
 CI --> Build[Vite build]
 Build --> Static[dist / HTTPS / SPA rewrite]
 Static --> Browser[Браузер / установленная PWA]
 Migrations[SQL migrations] --> Supabase[(Auth / DB / Storage)]
 Edge[Edge Functions + server secrets] --> Supabase
 Browser --> Supabase
 Static --> Version[version.json + hashed assets]
 Version --> Safe[Обновление с защитой форм]
```
