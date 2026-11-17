# База данных

Исправление загрузки из старого кэша (17.11.2026): схема, RLS и пользовательские записи не изменялись; восстановление работает с локальными статическими файлами браузера.

Снимок из подключённого PostgreSQL, 17.11.2026. Полный машиночитаемый снимок: docs/prompt5/database-schema.json. Источник изменений — supabase/migrations в хронологическом порядке. Снимок не включает auth.users и секреты Vault.

## public.consent_events

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- user_id: uuid NOT NULL
- kind: text NOT NULL
- document_version: text NOT NULL
- granted: boolean NOT NULL
- recipient_id: uuid
- created_at: timestamp with time zone NOT NULL DEFAULT clock_timestamp()

Ограничения:

- CHECK (((length(document_version) >= 1) AND (length(document_version) <= 80)))
- CHECK ((kind = ANY (ARRAY['platform'::text, 'child_authority'::text, 'data_share'::text])))
- PRIMARY KEY (id)
- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

Индексы:

- CREATE UNIQUE INDEX consent_events_pkey ON public.consent_events USING btree (id)
- CREATE INDEX consent_user_time ON public.consent_events USING btree (user_id, created_at DESC)

RLS:

- consent_insert: INSERT; роли authenticated; USING —; CHECK ((user_id = ( SELECT auth.uid() AS uid)) AND (document_version = '2026-11-17.draft.1'::text))
- consent_read: SELECT; роли authenticated; USING (user_id = ( SELECT auth.uid() AS uid)); CHECK —

## public.push_subscriptions

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- user_id: uuid NOT NULL
- endpoint: text NOT NULL
- p256dh: text NOT NULL
- auth: text NOT NULL
- updated_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- CHECK (((length(auth) >= 20) AND (length(auth) <= 30)))
- CHECK ((length(endpoint) < 2048))
- UNIQUE (endpoint)
- CHECK (((length(p256dh) >= 80) AND (length(p256dh) <= 100)))
- PRIMARY KEY (id)
- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

Индексы:

- CREATE UNIQUE INDEX push_subscriptions_pkey ON public.push_subscriptions USING btree (id)
- CREATE UNIQUE INDEX push_subscriptions_endpoint_key ON public.push_subscriptions USING btree (endpoint)
- CREATE INDEX push_owner ON public.push_subscriptions USING btree (user_id)

RLS:

- push_own_delete: DELETE; роли authenticated; USING (user_id = ( SELECT auth.uid() AS uid)); CHECK —
- push_own_read: SELECT; роли authenticated; USING (user_id = ( SELECT auth.uid() AS uid)); CHECK —

## public.user_roles

- user_id: uuid NOT NULL
- role: text NOT NULL
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- PRIMARY KEY (user_id)
- CHECK ((role = ANY (ARRAY['parent'::text, 'specialist'::text, 'clinic'::text, 'mentor'::text, 'moderator'::text, 'admin'::text])))
- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

Индексы:

- CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (user_id)

RLS:

- own_role: SELECT; роли authenticated; USING (user_id = ( SELECT auth.uid() AS uid)); CHECK —

## public.notification_preferences

- user_id: uuid NOT NULL
- appointments: boolean NOT NULL DEFAULT true
- assignments: boolean NOT NULL DEFAULT true
- messages: boolean NOT NULL DEFAULT true
- payments: boolean NOT NULL DEFAULT true

Ограничения:

- PRIMARY KEY (user_id)
- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

Индексы:

- CREATE UNIQUE INDEX notification_preferences_pkey ON public.notification_preferences USING btree (user_id)

RLS:

- preferences_own: ALL; роли authenticated; USING (user_id = ( SELECT auth.uid() AS uid)); CHECK (user_id = ( SELECT auth.uid() AS uid))

## public.children

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- parent_id: uuid NOT NULL
- label: text NOT NULL DEFAULT 'Профиль · демо'::text
- age: text NOT NULL
- city: text NOT NULL DEFAULT 'Алматы'::text
- district: text NOT NULL
- concerns: ARRAY NOT NULL DEFAULT '{}'::text[]
- experience: text NOT NULL
- budget: integer NOT NULL
- format: text NOT NULL
- created_at: timestamp with time zone NOT NULL DEFAULT now()
- updated_at: timestamp with time zone NOT NULL DEFAULT now()
- diagnosis: text NOT NULL DEFAULT ''::text
- case_group: text NOT NULL DEFAULT 'unknown'::text

Ограничения:

- CHECK ((age = ANY (ARRAY['2–3'::text, '4–5'::text, '6–8'::text, '9–12'::text])))
- CHECK (((budget >= 0) AND (budget <= 1000000)))
- CHECK ((case_group = ANY (ARRAY['unknown'::text, 'speech'::text, 'autism'::text, 'learning'::text, 'attention'::text, 'other'::text])))
- CHECK ((length(city) <= 60))
- CHECK ((concerns <@ ARRAY['speech'::text, 'communication'::text, 'behavior'::text, 'learning'::text, 'attention'::text, 'writing'::text, 'other'::text]))
- CHECK ((length(district) <= 60))
- CHECK ((experience = ANY (ARRAY['first'::text, 'visited'::text, 'conclusion'::text])))
- CHECK ((format = ANY (ARRAY['any'::text, 'online'::text, 'offline'::text])))
- UNIQUE (id, parent_id)
- CHECK ((length(label) <= 80))
- FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE
- PRIMARY KEY (id)

Индексы:

- CREATE UNIQUE INDEX children_pkey ON public.children USING btree (id)
- CREATE UNIQUE INDEX children_id_parent_id_key ON public.children USING btree (id, parent_id)
- CREATE INDEX children_parent_id_idx ON public.children USING btree (parent_id)

RLS:

- owner_delete: DELETE; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —
- owner_insert: INSERT; роли authenticated; USING —; CHECK (parent_id = ( SELECT auth.uid() AS uid))
- owner_select: SELECT; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —
- owner_update: UPDATE; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK (parent_id = ( SELECT auth.uid() AS uid))

## public.consent_records

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- parent_id: uuid NOT NULL
- purpose: text NOT NULL
- version: text NOT NULL DEFAULT 'mvp-1'::text
- granted: boolean NOT NULL DEFAULT true
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE
- PRIMARY KEY (id)
- CHECK ((purpose = ANY (ARRAY['synthetic_profile'::text, 'question'::text, 'review'::text, 'telegram'::text])))

Индексы:

- CREATE UNIQUE INDEX consent_records_pkey ON public.consent_records USING btree (id)
- CREATE INDEX consent_records_parent_id_idx ON public.consent_records USING btree (parent_id)

RLS:

- owner_delete: DELETE; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —
- owner_insert: INSERT; роли authenticated; USING —; CHECK (parent_id = ( SELECT auth.uid() AS uid))
- owner_select: SELECT; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —

## public.child_goals

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- parent_id: uuid NOT NULL
- child_id: uuid NOT NULL
- title: text NOT NULL
- metric: text NOT NULL
- target: integer NOT NULL
- due_at: date NOT NULL
- status: text NOT NULL DEFAULT 'active'::text
- created_at: timestamp with time zone NOT NULL DEFAULT now()
- specialist_id: uuid
- stage: integer NOT NULL DEFAULT 1

Ограничения:

- FOREIGN KEY (child_id, parent_id) REFERENCES children(id, parent_id) ON DELETE CASCADE
- UNIQUE (id, parent_id)
- CHECK ((length(metric) <= 100))
- FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE
- PRIMARY KEY (id)
- FOREIGN KEY (specialist_id) REFERENCES specialists(id)
- CHECK (((stage >= 1) AND (stage <= 4)))
- CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'paused'::text])))
- CHECK (((target >= 1) AND (target <= 1000)))
- CHECK (((length(title) >= 5) AND (length(title) <= 180)))

Индексы:

- CREATE UNIQUE INDEX child_goals_pkey ON public.child_goals USING btree (id)
- CREATE UNIQUE INDEX child_goals_id_parent_id_key ON public.child_goals USING btree (id, parent_id)
- CREATE INDEX child_goals_parent_id_idx ON public.child_goals USING btree (parent_id)
- CREATE INDEX goals_child ON public.child_goals USING btree (child_id)

RLS:

- goal_update: UPDATE; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK (parent_id = ( SELECT auth.uid() AS uid))
- owner_delete: DELETE; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —
- owner_insert: INSERT; роли authenticated; USING —; CHECK (parent_id = ( SELECT auth.uid() AS uid))
- owner_select: SELECT; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —
- specialist_goals: SELECT; роли authenticated; USING private.has_patient(child_id); CHECK —

## public.support_tickets

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- user_id: uuid NOT NULL
- category: text NOT NULL
- subject: text NOT NULL
- body: text NOT NULL
- status: text NOT NULL DEFAULT 'open'::text
- reply: text NOT NULL DEFAULT ''::text
- created_at: timestamp with time zone NOT NULL DEFAULT now()
- updated_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- CHECK (((length(btrim(body)) >= 10) AND (length(btrim(body)) <= 2000)))
- CHECK ((category = ANY (ARRAY['booking'::text, 'payment'::text, 'privacy'::text, 'account'::text, 'other'::text])))
- PRIMARY KEY (id)
- CHECK ((length(reply) <= 4000))
- CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'answered'::text, 'closed'::text])))
- CHECK (((length(btrim(subject)) >= 5) AND (length(btrim(subject)) <= 120)))
- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

Индексы:

- CREATE UNIQUE INDEX support_tickets_pkey ON public.support_tickets USING btree (id)
- CREATE INDEX support_owner_recent ON public.support_tickets USING btree (user_id, created_at DESC)

RLS:

- support_create: INSERT; роли authenticated; USING —; CHECK ((user_id = ( SELECT auth.uid() AS uid)) AND (status = 'open'::text) AND (reply = ''::text))
- support_read: SELECT; роли authenticated; USING ((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_staff() AS is_staff)); CHECK —
- support_staff_reply: UPDATE; роли authenticated; USING ( SELECT private.is_staff() AS is_staff); CHECK ( SELECT private.is_staff() AS is_staff)

## public.profiles

- id: uuid NOT NULL
- language: text NOT NULL DEFAULT 'ru'::text
- created_at: timestamp with time zone NOT NULL DEFAULT now()
- updated_at: timestamp with time zone NOT NULL DEFAULT now()
- contact: text NOT NULL DEFAULT ''::text

Ограничения:

- FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
- CHECK ((language = ANY (ARRAY['ru'::text, 'kk'::text])))
- PRIMARY KEY (id)

Индексы:

- CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)

RLS:

- own_profile: ALL; роли authenticated; USING (id = ( SELECT auth.uid() AS uid)); CHECK (id = ( SELECT auth.uid() AS uid))

## public.cities

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- name: text NOT NULL

Ограничения:

- UNIQUE (name)
- PRIMARY KEY (id)

Индексы:

- CREATE UNIQUE INDEX cities_pkey ON public.cities USING btree (id)
- CREATE UNIQUE INDEX cities_name_key ON public.cities USING btree (name)

RLS:

- public_read: SELECT; роли anon, authenticated; USING true; CHECK —

## public.districts

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- city_id: uuid NOT NULL
- name: text NOT NULL

Ограничения:

- FOREIGN KEY (city_id) REFERENCES cities(id)
- UNIQUE (city_id, name)
- PRIMARY KEY (id)

Индексы:

- CREATE UNIQUE INDEX districts_pkey ON public.districts USING btree (id)
- CREATE UNIQUE INDEX districts_city_id_name_key ON public.districts USING btree (city_id, name)

RLS:

- public_read: SELECT; роли anon, authenticated; USING true; CHECK —

## public.specializations

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- name: text NOT NULL

Ограничения:

- UNIQUE (name)
- PRIMARY KEY (id)

Индексы:

- CREATE UNIQUE INDEX specializations_pkey ON public.specializations USING btree (id)
- CREATE UNIQUE INDEX specializations_name_key ON public.specializations USING btree (name)

RLS:

- public_read: SELECT; роли anon, authenticated; USING true; CHECK —

## public.mentors

- id: uuid NOT NULL
- alias: text NOT NULL
- opted_in: boolean NOT NULL DEFAULT false
- approved: boolean NOT NULL DEFAULT false

Ограничения:

- FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
- PRIMARY KEY (id)

Индексы:

- CREATE UNIQUE INDEX mentors_pkey ON public.mentors USING btree (id)

RLS:

- staff_mentors: ALL; роли authenticated; USING ( SELECT private.is_staff() AS is_staff); CHECK ( SELECT private.is_staff() AS is_staff)

## public.audit_logs

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- actor_id: uuid
- entity: text NOT NULL
- entity_id: text
- action: text NOT NULL
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL
- PRIMARY KEY (id)

Индексы:

- CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id)

RLS:

- own_care_history: SELECT; роли authenticated; USING ((actor_id = ( SELECT auth.uid() AS uid)) AND (entity = 'care'::text)); CHECK —
- staff_audit: SELECT; роли authenticated; USING ( SELECT private.is_staff() AS is_staff); CHECK —

## public.waitlist

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- parent_id: uuid NOT NULL
- specialist_id: uuid NOT NULL
- consent: boolean NOT NULL
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- CHECK (consent)
- FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE
- UNIQUE (parent_id, specialist_id)
- PRIMARY KEY (id)
- FOREIGN KEY (specialist_id) REFERENCES specialists(id)

Индексы:

- CREATE UNIQUE INDEX waitlist_pkey ON public.waitlist USING btree (id)
- CREATE UNIQUE INDEX waitlist_parent_id_specialist_id_key ON public.waitlist USING btree (parent_id, specialist_id)
- CREATE INDEX waitlist_parent_id_idx ON public.waitlist USING btree (parent_id)

RLS:

- owner_delete: DELETE; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —
- owner_insert: INSERT; роли authenticated; USING —; CHECK (parent_id = ( SELECT auth.uid() AS uid))
- owner_select: SELECT; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —

## public.review_reports

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- parent_id: uuid NOT NULL
- review_id: uuid NOT NULL
- reason: text NOT NULL
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE
- UNIQUE (parent_id, review_id)
- PRIMARY KEY (id)
- CHECK (((length(reason) >= 5) AND (length(reason) <= 500)))
- FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE

Индексы:

- CREATE UNIQUE INDEX review_reports_pkey ON public.review_reports USING btree (id)
- CREATE UNIQUE INDEX review_reports_parent_id_review_id_key ON public.review_reports USING btree (parent_id, review_id)
- CREATE INDEX review_reports_parent_id_idx ON public.review_reports USING btree (parent_id)

RLS:

- owner_delete: DELETE; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —
- owner_insert: INSERT; роли authenticated; USING —; CHECK (parent_id = ( SELECT auth.uid() AS uid))
- owner_select: SELECT; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —
- staff_reports: SELECT; роли authenticated; USING ( SELECT private.is_staff() AS is_staff); CHECK —

## public.progress_entries

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- parent_id: uuid NOT NULL
- goal_id: uuid NOT NULL
- value: integer NOT NULL
- note: text NOT NULL DEFAULT ''::text
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- FOREIGN KEY (goal_id, parent_id) REFERENCES child_goals(id, parent_id) ON DELETE CASCADE
- CHECK ((length(note) <= 500))
- FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE
- PRIMARY KEY (id)
- CHECK (((value >= 0) AND (value <= 1000)))

Индексы:

- CREATE UNIQUE INDEX progress_entries_pkey ON public.progress_entries USING btree (id)
- CREATE INDEX progress_entries_parent_id_idx ON public.progress_entries USING btree (parent_id)
- CREATE INDEX entries_goal ON public.progress_entries USING btree (goal_id, created_at)

RLS:

- owner_delete: DELETE; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —
- owner_insert: INSERT; роли authenticated; USING —; CHECK (parent_id = ( SELECT auth.uid() AS uid))
- owner_select: SELECT; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —
- specialist_progress: SELECT; роли authenticated; USING (EXISTS ( SELECT 1
   FROM child_goals g
  WHERE ((g.id = progress_entries.goal_id) AND private.has_patient(g.child_id)))); CHECK —

## public.favorites

- parent_id: uuid NOT NULL
- specialist_id: uuid NOT NULL
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE
- PRIMARY KEY (parent_id, specialist_id)
- FOREIGN KEY (specialist_id) REFERENCES specialists(id) ON DELETE CASCADE

Индексы:

- CREATE UNIQUE INDEX favorites_pkey ON public.favorites USING btree (parent_id, specialist_id)
- CREATE INDEX favorites_parent_id_idx ON public.favorites USING btree (parent_id)

RLS:

- favorite_update: UPDATE; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK (parent_id = ( SELECT auth.uid() AS uid))
- owner_delete: DELETE; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —
- owner_insert: INSERT; роли authenticated; USING —; CHECK (parent_id = ( SELECT auth.uid() AS uid))
- owner_select: SELECT; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —

## public.app_graph_nodes

- id: text NOT NULL
- label: text NOT NULL
- kind: text NOT NULL
- routes: jsonb NOT NULL
- roles: ARRAY NOT NULL
- tables: ARRAY NOT NULL
- description: text NOT NULL
- x: numeric NOT NULL
- y: numeric NOT NULL

Ограничения:

- PRIMARY KEY (id)

Индексы:

- CREATE UNIQUE INDEX app_graph_nodes_pkey ON public.app_graph_nodes USING btree (id)

RLS:

- role_nodes: SELECT; роли authenticated; USING ((private.care_role() = ANY (roles)) OR private.is_staff()); CHECK —

## public.app_graph_edges

- source: text NOT NULL
- target: text NOT NULL
- relation: text NOT NULL
- key: text

Ограничения:

- PRIMARY KEY (source, target, relation)
- FOREIGN KEY (source) REFERENCES app_graph_nodes(id) ON DELETE CASCADE
- FOREIGN KEY (target) REFERENCES app_graph_nodes(id) ON DELETE CASCADE

Индексы:

- CREATE UNIQUE INDEX app_graph_edges_pkey ON public.app_graph_edges USING btree (source, target, relation)

RLS:

- role_edges: SELECT; роли authenticated; USING ((EXISTS ( SELECT 1
   FROM app_graph_nodes n
  WHERE (n.id = app_graph_edges.source))) AND (EXISTS ( SELECT 1
   FROM app_graph_nodes n
  WHERE (n.id = app_graph_edges.target)))); CHECK —

## public.app_graph_keywords

- node_id: text NOT NULL
- keyword: text NOT NULL

Ограничения:

- FOREIGN KEY (node_id) REFERENCES app_graph_nodes(id) ON DELETE CASCADE
- PRIMARY KEY (node_id, keyword)

Индексы:

- CREATE UNIQUE INDEX app_graph_keywords_pkey ON public.app_graph_keywords USING btree (node_id, keyword)
- CREATE INDEX app_graph_keyword_search ON public.app_graph_keywords USING btree (keyword)

RLS:

- role_keywords: SELECT; роли authenticated; USING (EXISTS ( SELECT 1
   FROM app_graph_nodes n
  WHERE (n.id = app_graph_keywords.node_id))); CHECK —

## public.clinics

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- owner_id: uuid
- name: text NOT NULL
- district: text NOT NULL
- address: text NOT NULL DEFAULT ''::text
- description: text NOT NULL DEFAULT ''::text
- services: text NOT NULL DEFAULT ''::text
- contacts: text NOT NULL DEFAULT ''::text
- status: text NOT NULL DEFAULT 'pending'::text
- is_demo: boolean NOT NULL DEFAULT false

Ограничения:

- FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL
- PRIMARY KEY (id)
- CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))

Индексы:

- CREATE UNIQUE INDEX clinics_pkey ON public.clinics USING btree (id)

RLS:

- clinic_read: SELECT; роли authenticated; USING ((status = 'approved'::text) OR (owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_staff() AS is_staff)); CHECK —

## public.clinic_members

- clinic_id: uuid NOT NULL
- specialist_id: uuid NOT NULL
- status: text NOT NULL DEFAULT 'active'::text

Ограничения:

- FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
- PRIMARY KEY (clinic_id, specialist_id)
- FOREIGN KEY (specialist_id) REFERENCES specialists(id) ON DELETE CASCADE
- CHECK ((status = ANY (ARRAY['active'::text, 'removed'::text])))

Индексы:

- CREATE UNIQUE INDEX clinic_members_pkey ON public.clinic_members USING btree (clinic_id, specialist_id)
- CREATE INDEX members_specialist ON public.clinic_members USING btree (specialist_id)

RLS:

- member_read: SELECT; роли authenticated; USING ((status = 'active'::text) OR private.clinic_owns(clinic_id) OR private.owns_specialist(specialist_id)); CHECK —

## public.clinic_branches

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- clinic_id: uuid NOT NULL
- name: text NOT NULL
- district: text NOT NULL
- address: text NOT NULL

Ограничения:

- FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
- PRIMARY KEY (id)

Индексы:

- CREATE UNIQUE INDEX clinic_branches_pkey ON public.clinic_branches USING btree (id)

RLS:

- branch_read: SELECT; роли authenticated; USING (EXISTS ( SELECT 1
   FROM clinics c
  WHERE (c.id = clinic_branches.clinic_id))); CHECK —

## public.clinic_invitations

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- clinic_id: uuid NOT NULL
- email: text NOT NULL
- status: text NOT NULL DEFAULT 'pending'::text

Ограничения:

- UNIQUE (clinic_id, email)
- FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
- PRIMARY KEY (id)
- CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])))

Индексы:

- CREATE UNIQUE INDEX clinic_invitations_pkey ON public.clinic_invitations USING btree (id)
- CREATE UNIQUE INDEX clinic_invitations_clinic_id_email_key ON public.clinic_invitations USING btree (clinic_id, email)

RLS:

- invitation_read: SELECT; роли authenticated; USING (private.clinic_owns(clinic_id) OR (lower(email) = lower(( SELECT (auth.jwt() ->> 'email'::text))))); CHECK —

## public.schedule_slots

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- specialist_id: uuid NOT NULL
- starts_at: timestamp with time zone NOT NULL
- ends_at: timestamp with time zone NOT NULL
- service: text NOT NULL DEFAULT 'Консультация'::text
- price: integer NOT NULL
- available: boolean NOT NULL DEFAULT true

Ограничения:

- CHECK (((ends_at > starts_at) AND (ends_at <= (starts_at + '08:00:00'::interval))))
- PRIMARY KEY (id)
- CHECK ((price >= 0))
- FOREIGN KEY (specialist_id) REFERENCES specialists(id)
- EXCLUDE USING gist (specialist_id WITH =, tstzrange(starts_at, ends_at, '[)'::text) WITH &&)

Индексы:

- CREATE UNIQUE INDEX schedule_slots_pkey ON public.schedule_slots USING btree (id)
- CREATE INDEX schedule_slots_specialist_id_tstzrange_excl ON public.schedule_slots USING gist (specialist_id, tstzrange(starts_at, ends_at, '[)'::text))
- CREATE INDEX slots_specialist_start ON public.schedule_slots USING btree (specialist_id, starts_at)

RLS:

- slot_read: SELECT; роли authenticated; USING ((EXISTS ( SELECT 1
   FROM specialists s
  WHERE ((s.id = schedule_slots.specialist_id) AND (s.published OR (s.owner_id = ( SELECT auth.uid() AS uid)))))) OR private.in_my_clinic(specialist_id)); CHECK —

## public.task_materials

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- author_id: uuid
- title: text NOT NULL
- goal: text NOT NULL
- duration: integer NOT NULL DEFAULT 5
- items: ARRAY NOT NULL DEFAULT '{}'::text[]
- steps: ARRAY NOT NULL DEFAULT '{}'::text[]
- signs: text NOT NULL DEFAULT ''::text
- stop: text NOT NULL DEFAULT ''::text
- video_url: text
- memo_url: text
- captions_ru: text
- captions_kk: text
- status: text NOT NULL DEFAULT 'pending'::text
- rights_confirmed: boolean NOT NULL DEFAULT false
- is_demo: boolean NOT NULL DEFAULT false

Ограничения:

- CHECK ((((video_url IS NULL) OR (video_url ~ '^(storage:[0-9a-f-]+/[^[:space:]]+|/video/[^[:space:]]+|https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11})$'::text)) AND ((memo_url IS NULL) OR (memo_url ~ '^(storage:[0-9a-f-]+/[^[:space:]]+|/materials/[^[:space:]]+)$'::text)) AND ((captions_ru IS NULL) OR (captions_ru ~ '^(storage:[0-9a-f-]+/[^[:space:]]+|/video/[^[:space:]]+)$'::text)) AND ((captions_kk IS NULL) OR (captions_kk ~ '^(storage:[0-9a-f-]+/[^[:space:]]+|/video/[^[:space:]]+)$'::text))))
- FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL
- CHECK (((duration >= 1) AND (duration <= 180)))
- PRIMARY KEY (id)
- CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
- CHECK (((length(title) >= 3) AND (length(title) <= 160)))

Индексы:

- CREATE UNIQUE INDEX task_materials_pkey ON public.task_materials USING btree (id)

RLS:

- task_read: SELECT; роли authenticated; USING ((author_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_staff() AS is_staff) OR ((status = 'approved'::text) AND ((NOT is_demo) OR ( SELECT private.demo_actor() AS demo_actor)) AND ((private.care_role() = 'specialist'::text) OR (EXISTS ( SELECT 1
   FROM task_assignments a
  WHERE ((a.material_id = a.id) AND (a.parent_id = ( SELECT auth.uid() AS uid)))))))); CHECK —

## public.message_translations

- message_id: uuid NOT NULL
- target_language: text NOT NULL
- source_hash: text NOT NULL
- translated_text: text NOT NULL
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- FOREIGN KEY (message_id) REFERENCES care_messages(id) ON DELETE CASCADE
- PRIMARY KEY (message_id, target_language)
- CHECK ((target_language = ANY (ARRAY['ru'::text, 'kk'::text])))
- CHECK (((length(translated_text) >= 1) AND (length(translated_text) <= 6000)))

Индексы:

- CREATE UNIQUE INDEX message_translations_pkey ON public.message_translations USING btree (message_id, target_language)

RLS:

- translation_message_read: SELECT; роли authenticated; USING (EXISTS ( SELECT 1
   FROM care_messages m
  WHERE (m.id = message_translations.message_id))); CHECK —

## public.task_assignments

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- parent_id: uuid NOT NULL
- child_id: uuid NOT NULL
- specialist_id: uuid NOT NULL
- material_id: uuid NOT NULL
- goal_id: uuid
- goal_title: text NOT NULL DEFAULT ''::text
- duration: integer NOT NULL
- frequency: text NOT NULL
- due_at: date NOT NULL
- comment: text NOT NULL DEFAULT ''::text
- status: text NOT NULL DEFAULT 'new'::text
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- FOREIGN KEY (child_id, parent_id) REFERENCES children(id, parent_id) ON DELETE CASCADE
- CHECK (((duration >= 1) AND (duration <= 180)))
- FOREIGN KEY (goal_id) REFERENCES child_goals(id) ON DELETE SET NULL
- FOREIGN KEY (material_id) REFERENCES task_materials(id)
- FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE
- PRIMARY KEY (id)
- FOREIGN KEY (specialist_id) REFERENCES specialists(id)
- CHECK ((status = ANY (ARRAY['new'::text, 'active'::text, 'done'::text, 'difficult'::text, 'cancelled'::text])))

Индексы:

- CREATE UNIQUE INDEX task_assignments_pkey ON public.task_assignments USING btree (id)
- CREATE INDEX assignments_child ON public.task_assignments USING btree (child_id, specialist_id)
- CREATE INDEX assignments_parent ON public.task_assignments USING btree (parent_id)

RLS:

- assignments_read: SELECT; роли authenticated; USING ((parent_id = ( SELECT auth.uid() AS uid)) OR (private.owns_specialist(specialist_id) AND private.has_patient(child_id))); CHECK —
- team_assignment_read: SELECT; роли authenticated; USING private.team_member(child_id); CHECK —

## public.task_completions

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- assignment_id: uuid NOT NULL
- child_id: uuid NOT NULL
- parent_id: uuid NOT NULL
- specialist_id: uuid NOT NULL
- outcome: text NOT NULL
- comment: text NOT NULL DEFAULT ''::text
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- FOREIGN KEY (assignment_id) REFERENCES task_assignments(id) ON DELETE CASCADE
- FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
- CHECK ((length(comment) <= 1000))
- CHECK ((outcome = ANY (ARRAY['good'::text, 'partial'::text, 'difficult'::text])))
- FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE
- PRIMARY KEY (id)
- FOREIGN KEY (specialist_id) REFERENCES specialists(id)

Индексы:

- CREATE UNIQUE INDEX task_completions_pkey ON public.task_completions USING btree (id)
- CREATE UNIQUE INDEX task_once_daily ON public.task_completions USING btree (assignment_id, (((created_at AT TIME ZONE 'Asia/Almaty'::text))::date))
- CREATE INDEX completions_parent ON public.task_completions USING btree (parent_id, created_at)
- CREATE INDEX completions_assignment ON public.task_completions USING btree (assignment_id)

RLS:

- completions_read: SELECT; роли authenticated; USING ((parent_id = ( SELECT auth.uid() AS uid)) OR (private.owns_specialist(specialist_id) AND private.has_patient(child_id))); CHECK —
- team_completion_read: SELECT; роли authenticated; USING private.team_member(child_id); CHECK —

## public.care_messages

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- appointment_id: uuid NOT NULL
- sender_id: uuid NOT NULL
- body: text NOT NULL
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
- CHECK (((length(body) >= 1) AND (length(body) <= 2000)))
- PRIMARY KEY (id)
- FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE

Индексы:

- CREATE UNIQUE INDEX care_messages_pkey ON public.care_messages USING btree (id)
- CREATE INDEX messages_appointment ON public.care_messages USING btree (appointment_id)

RLS:

- message_read: SELECT; роли authenticated; USING (EXISTS ( SELECT 1
   FROM appointments a
  WHERE ((a.id = care_messages.appointment_id) AND ((a.parent_id = ( SELECT auth.uid() AS uid)) OR private.owns_specialist(a.specialist_id))))); CHECK —

## public.family_task_links

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- parent_id: uuid NOT NULL
- assignment_id: uuid NOT NULL
- token_hash: text NOT NULL
- expires_at: timestamp with time zone NOT NULL
- revoked: boolean NOT NULL DEFAULT false

Ограничения:

- FOREIGN KEY (assignment_id) REFERENCES task_assignments(id) ON DELETE CASCADE
- FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE
- PRIMARY KEY (id)
- UNIQUE (token_hash)

Индексы:

- CREATE UNIQUE INDEX family_task_links_pkey ON public.family_task_links USING btree (id)
- CREATE UNIQUE INDEX family_task_links_token_hash_key ON public.family_task_links USING btree (token_hash)

RLS:

- links_read: SELECT; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —

## public.care_reminders

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- user_id: uuid NOT NULL
- title: text NOT NULL
- to: text NOT NULL
- due_at: timestamp with time zone NOT NULL
- delivered: boolean NOT NULL DEFAULT false

Ограничения:

- PRIMARY KEY (id)
- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

Индексы:

- CREATE UNIQUE INDEX care_reminders_pkey ON public.care_reminders USING btree (id)
- CREATE INDEX reminders_due ON public.care_reminders USING btree (user_id, due_at) WHERE (NOT delivered)

RLS:

- reminders_read: SELECT; роли authenticated; USING (user_id = ( SELECT auth.uid() AS uid)); CHECK —

## public.qualification_documents

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- owner_id: uuid NOT NULL
- title: text NOT NULL
- document_url: text NOT NULL
- status: text NOT NULL DEFAULT 'pending'::text

Ограничения:

- FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
- PRIMARY KEY (id)
- CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))

Индексы:

- CREATE UNIQUE INDEX qualification_documents_pkey ON public.qualification_documents USING btree (id)

RLS:

- documents_read: SELECT; роли authenticated; USING ((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_staff() AS is_staff)); CHECK —
- staff_materials: SELECT; роли authenticated; USING ( SELECT private.is_staff() AS is_staff); CHECK —

## public.appointments

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- parent_id: uuid NOT NULL
- child_id: uuid NOT NULL
- specialist_id: uuid NOT NULL
- starts_at: timestamp with time zone NOT NULL
- status: text NOT NULL DEFAULT 'self_reported'::text
- created_at: timestamp with time zone NOT NULL DEFAULT now()
- slot_id: uuid
- ends_at: timestamp with time zone
- service: text NOT NULL DEFAULT 'Консультация'::text
- reason: text NOT NULL DEFAULT ''::text
- contact: text NOT NULL DEFAULT ''::text
- share_diary: boolean NOT NULL DEFAULT false
- diagnosis: text NOT NULL DEFAULT ''::text
- visit_verified: boolean NOT NULL DEFAULT false
- is_demo: boolean NOT NULL DEFAULT false
- clinic_id: uuid
- proposed_slot_id: uuid
- visited_at: timestamp with time zone
- updated_at: timestamp with time zone NOT NULL DEFAULT now()
- visit_format: text NOT NULL DEFAULT 'offline'::text

Ограничения:

- EXCLUDE USING gist (specialist_id WITH =, tstzrange(starts_at, ends_at, '[)'::text) WITH &&) WHERE (((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rescheduled'::text, 'attended'::text, 'completed'::text])) AND (slot_id IS NOT NULL)))
- FOREIGN KEY (child_id, parent_id) REFERENCES children(id, parent_id) ON DELETE CASCADE
- FOREIGN KEY (clinic_id) REFERENCES clinics(id)
- CHECK ((length(contact) <= 250))
- FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE
- PRIMARY KEY (id)
- FOREIGN KEY (proposed_slot_id) REFERENCES schedule_slots(id)
- CHECK ((length(reason) <= 1000))
- FOREIGN KEY (slot_id) REFERENCES schedule_slots(id)
- FOREIGN KEY (specialist_id) REFERENCES specialists(id)
- CHECK ((status = ANY (ARRAY['self_reported'::text, 'pending'::text, 'confirmed'::text, 'rescheduled'::text, 'cancelled'::text, 'attended'::text, 'completed'::text, 'expired'::text])))
- CHECK ((visit_format = ANY (ARRAY['offline'::text, 'online'::text])))
- EXCLUDE USING gist (child_id WITH =, tstzrange(starts_at, ends_at, '[)'::text) WITH &&) WHERE (((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rescheduled'::text, 'attended'::text, 'completed'::text])) AND (slot_id IS NOT NULL)))
- CHECK (((slot_id IS NULL) OR ((length(reason) > 0) AND (length(contact) > 0))))

Индексы:

- CREATE UNIQUE INDEX appointments_pkey ON public.appointments USING btree (id)
- CREATE INDEX appointments_parent_id_idx ON public.appointments USING btree (parent_id)
- CREATE INDEX appointment_no_overlap ON public.appointments USING gist (specialist_id, tstzrange(starts_at, ends_at, '[)'::text)) WHERE ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rescheduled'::text, 'attended'::text, 'completed'::text])) AND (slot_id IS NOT NULL))
- CREATE INDEX child_no_overlap ON public.appointments USING gist (child_id, tstzrange(starts_at, ends_at, '[)'::text)) WHERE ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rescheduled'::text, 'attended'::text, 'completed'::text])) AND (slot_id IS NOT NULL))
- CREATE INDEX appointments_provider ON public.appointments USING btree (specialist_id, status)
- CREATE INDEX appointments_clinic ON public.appointments USING btree (clinic_id, starts_at)

RLS:

- owner_delete: DELETE; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —
- owner_insert: INSERT; роли authenticated; USING —; CHECK (parent_id = ( SELECT auth.uid() AS uid))
- owner_select: SELECT; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —

## public.session_feedback

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- parent_id: uuid NOT NULL
- child_id: uuid NOT NULL
- specialist_id: uuid NOT NULL
- contact: integer NOT NULL
- adaptation: text NOT NULL
- explained: boolean NOT NULL
- goal: boolean NOT NULL
- comfortable: boolean NOT NULL
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- CHECK ((adaptation = ANY (ARRAY['yes'::text, 'partial'::text, 'no'::text])))
- FOREIGN KEY (child_id, parent_id) REFERENCES children(id, parent_id) ON DELETE CASCADE
- CHECK (((contact >= 1) AND (contact <= 5)))
- FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE
- PRIMARY KEY (id)
- FOREIGN KEY (specialist_id) REFERENCES specialists(id)

Индексы:

- CREATE UNIQUE INDEX session_feedback_pkey ON public.session_feedback USING btree (id)
- CREATE INDEX session_feedback_parent_id_idx ON public.session_feedback USING btree (parent_id)
- CREATE INDEX feedback_specialist ON public.session_feedback USING btree (specialist_id)

RLS:

- owner_delete: DELETE; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —
- owner_insert: INSERT; роли authenticated; USING —; CHECK (parent_id = ( SELECT auth.uid() AS uid))
- owner_select: SELECT; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —

## public.reviews

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- parent_id: uuid NOT NULL
- specialist_id: uuid NOT NULL
- feedback_id: uuid
- body: text NOT NULL
- contact: integer NOT NULL
- status: text NOT NULL DEFAULT 'pending'::text
- evidence: text
- is_demo: boolean NOT NULL DEFAULT false
- created_at: timestamp with time zone NOT NULL DEFAULT now()
- appointment_id: uuid
- strengths: ARRAY NOT NULL DEFAULT '{}'::text[]
- visit_verified: boolean NOT NULL DEFAULT false

Ограничения:

- CHECK (((status <> 'verified'::text) OR (visit_verified AND (appointment_id IS NOT NULL) AND (evidence IS NOT NULL))))
- FOREIGN KEY (appointment_id) REFERENCES appointments(id)
- UNIQUE (appointment_id)
- CHECK (((length(body) >= 10) AND (length(body) <= 2000)))
- CHECK (((contact >= 1) AND (contact <= 5)))
- FOREIGN KEY (feedback_id) REFERENCES session_feedback(id) ON DELETE SET NULL
- FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE
- PRIMARY KEY (id)
- FOREIGN KEY (specialist_id) REFERENCES specialists(id)
- CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'verified'::text, 'rejected'::text])))

Индексы:

- CREATE UNIQUE INDEX reviews_pkey ON public.reviews USING btree (id)
- CREATE INDEX reviews_specialist ON public.reviews USING btree (specialist_id, status)
- CREATE INDEX reviews_owner ON public.reviews USING btree (parent_id)
- CREATE UNIQUE INDEX reviews_appointment_id_key ON public.reviews USING btree (appointment_id)

RLS:

- delete_own_review: DELETE; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —
- moderate_review: ALL; роли authenticated; USING ( SELECT private.is_staff() AS is_staff); CHECK ( SELECT private.is_staff() AS is_staff)
- own_reviews: SELECT; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —
- submit_review: INSERT; роли authenticated; USING —; CHECK ((parent_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['draft'::text, 'pending'::text])) AND (evidence IS NULL) AND ((feedback_id IS NULL) OR (EXISTS ( SELECT 1
   FROM session_feedback f
  WHERE ((f.id = reviews.feedback_id) AND (f.parent_id = ( SELECT auth.uid() AS uid)) AND (f.specialist_id = reviews.specialist_id))))))

## public.specialists

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- name: text NOT NULL
- specialty: text NOT NULL
- city: text NOT NULL
- district: text NOT NULL
- price: integer NOT NULL
- experience: integer NOT NULL
- online: boolean NOT NULL DEFAULT false
- concerns: ARRAY NOT NULL DEFAULT '{}'::text[]
- ages: ARRAY NOT NULL DEFAULT '{}'::text[]
- description: text NOT NULL
- color: text NOT NULL DEFAULT 'lilac'::text
- published: boolean NOT NULL DEFAULT false
- is_demo: boolean NOT NULL DEFAULT true
- contact_url: text
- contact_consent: boolean NOT NULL DEFAULT false
- latitude: double precision
- longitude: double precision
- address: text
- verified_count: integer NOT NULL DEFAULT 0
- contact_rating: numeric
- created_at: timestamp with time zone NOT NULL DEFAULT now()
- updated_at: timestamp with time zone NOT NULL DEFAULT now()
- owner_id: uuid
- verification_status: text NOT NULL DEFAULT 'pending'::text
- profile: jsonb NOT NULL DEFAULT '{}'::jsonb

Ограничения:

- CHECK ((COALESCE(jsonb_array_length((profile -> 'self_strengths'::text)), 0) <= 3))
- CHECK (((contact_url IS NULL) OR contact_consent))
- CHECK (((latitude IS NULL) = (longitude IS NULL)))
- CHECK ((color = ANY (ARRAY['lilac'::text, 'peach'::text, 'sage'::text, 'butter'::text])))
- CHECK (((contact_rating >= (1)::numeric) AND (contact_rating <= (5)::numeric)))
- CHECK (((contact_url IS NULL) OR (contact_url ~ '^https://[^/@[:space:]]+'::text)))
- CHECK ((length(description) <= 3000))
- CHECK (((experience >= 0) AND (experience <= 70)))
- CHECK (((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision)))
- CHECK (((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision)))
- CHECK (((length(name) >= 2) AND (length(name) <= 100)))
- FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL
- UNIQUE (owner_id)
- PRIMARY KEY (id)
- CHECK ((price >= 0))
- CHECK ((verification_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
- CHECK ((verified_count >= 0))

Индексы:

- CREATE UNIQUE INDEX specialists_pkey ON public.specialists USING btree (id)
- CREATE INDEX specialists_filter ON public.specialists USING btree (city, district, specialty, price) WHERE published
- CREATE INDEX specialists_concerns ON public.specialists USING gin (concerns)
- CREATE UNIQUE INDEX specialists_owner_id_key ON public.specialists USING btree (owner_id)

RLS:

- own_specialist: SELECT; роли authenticated; USING (owner_id = ( SELECT auth.uid() AS uid)); CHECK —
- published_specialists: SELECT; роли anon, authenticated; USING published; CHECK —
- staff_specialists: ALL; роли authenticated; USING ( SELECT private.is_staff() AS is_staff); CHECK ( SELECT private.is_staff() AS is_staff)

## public.specialist_services

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- specialist_id: uuid NOT NULL
- title: text NOT NULL
- price: integer NOT NULL
- age_ranges: ARRAY NOT NULL DEFAULT '{}'::text[]
- stages: ARRAY NOT NULL DEFAULT '{}'::text[]

Ограничения:

- PRIMARY KEY (id)
- CHECK ((price >= 0))
- FOREIGN KEY (specialist_id) REFERENCES specialists(id) ON DELETE CASCADE

Индексы:

- CREATE UNIQUE INDEX specialist_services_pkey ON public.specialist_services USING btree (id)
- CREATE INDEX service_specialist ON public.specialist_services USING btree (specialist_id)

RLS:

- published_services: SELECT; роли anon, authenticated; USING (EXISTS ( SELECT 1
   FROM specialists s
  WHERE ((s.id = specialist_services.specialist_id) AND s.published))); CHECK —

## public.questions

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- parent_id: uuid
- title: text NOT NULL
- body: text NOT NULL
- topic: text NOT NULL
- city: text NOT NULL DEFAULT 'Алматы'::text
- status: text NOT NULL DEFAULT 'pending_moderation'::text
- is_demo: boolean NOT NULL DEFAULT false
- created_at: timestamp with time zone NOT NULL DEFAULT now()
- updated_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- CHECK (((length(body) >= 20) AND (length(body) <= 1200)))
- FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE
- PRIMARY KEY (id)
- CHECK ((status = ANY (ARRAY['draft'::text, 'pending_moderation'::text, 'open'::text, 'answered'::text, 'closed'::text])))
- CHECK (((length(title) >= 8) AND (length(title) <= 120)))
- CHECK ((topic = ANY (ARRAY['Новости'::text, 'Мероприятия'::text, 'Поведение'::text, 'Обучение'::text, 'Сон и быт'::text, 'Семья'::text, 'Речь'::text, 'Занятия'::text, 'ПМПК'::text, 'Поддержка'::text, 'Волонтёры'::text])))

Индексы:

- CREATE UNIQUE INDEX questions_pkey ON public.questions USING btree (id)
- CREATE INDEX questions_status ON public.questions USING btree (status, created_at DESC)
- CREATE INDEX questions_owner ON public.questions USING btree (parent_id)

RLS:

- own_questions: SELECT; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —
- public_questions: SELECT; роли anon, authenticated; USING (status = ANY (ARRAY['open'::text, 'answered'::text])); CHECK —
- remove_own_question: DELETE; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —
- staff_questions: ALL; роли authenticated; USING ( SELECT private.is_staff() AS is_staff); CHECK ( SELECT private.is_staff() AS is_staff)
- submit_questions: INSERT; роли authenticated; USING —; CHECK ((parent_id = ( SELECT auth.uid() AS uid)) AND (((status = ANY (ARRAY['draft'::text, 'pending_moderation'::text])) AND (NOT is_demo)) OR (private.demo_actor() AND is_demo AND (status = 'open'::text))))

## public.answers

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- question_id: uuid NOT NULL
- mentor_id: uuid
- body: text NOT NULL
- approved: boolean NOT NULL DEFAULT false
- is_demo: boolean NOT NULL DEFAULT false
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- CHECK (((length(body) >= 10) AND (length(body) <= 2000)))
- FOREIGN KEY (mentor_id) REFERENCES mentors(id)
- PRIMARY KEY (id)
- FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE

Индексы:

- CREATE UNIQUE INDEX answers_pkey ON public.answers USING btree (id)
- CREATE INDEX answers_question ON public.answers USING btree (question_id)

RLS:

- readable_answers: SELECT; роли anon, authenticated; USING (approved AND (EXISTS ( SELECT 1
   FROM questions q
  WHERE ((q.id = answers.question_id) AND (q.status = ANY (ARRAY['open'::text, 'answered'::text])))))); CHECK —
- staff_answers: ALL; роли authenticated; USING ( SELECT private.is_staff() AS is_staff); CHECK ( SELECT private.is_staff() AS is_staff)

## public.medical_terms

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- term: text NOT NULL
- title: text NOT NULL
- meaning: text NOT NULL
- questions: ARRAY NOT NULL DEFAULT '{}'::text[]
- approved: boolean NOT NULL DEFAULT false
- is_demo: boolean NOT NULL DEFAULT true
- version: integer NOT NULL DEFAULT 1
- updated_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- CHECK ((length(meaning) <= 3000))
- PRIMARY KEY (id)
- UNIQUE (term)

Индексы:

- CREATE UNIQUE INDEX medical_terms_pkey ON public.medical_terms USING btree (id)
- CREATE UNIQUE INDEX medical_terms_term_key ON public.medical_terms USING btree (term)

RLS:

- readable_terms: SELECT; роли anon, authenticated; USING (approved OR is_demo); CHECK —
- staff_terms: ALL; роли authenticated; USING ( SELECT private.is_staff() AS is_staff); CHECK ( SELECT private.is_staff() AS is_staff)

## public.recommendation_rules

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- version: text NOT NULL
- title: text NOT NULL
- conditions: jsonb NOT NULL DEFAULT '{}'::jsonb
- explanation: text NOT NULL
- approved: boolean NOT NULL DEFAULT false
- enabled: boolean NOT NULL DEFAULT false
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- PRIMARY KEY (id)

Индексы:

- CREATE UNIQUE INDEX recommendation_rules_pkey ON public.recommendation_rules USING btree (id)

RLS:

- readable_rules: SELECT; роли anon, authenticated; USING (approved AND enabled); CHECK —
- staff_rules: ALL; роли authenticated; USING ( SELECT private.is_staff() AS is_staff); CHECK ( SELECT private.is_staff() AS is_staff)

## public.notifications

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- parent_id: uuid NOT NULL
- title: text NOT NULL
- read: boolean NOT NULL DEFAULT false
- to: text NOT NULL
- created_at: timestamp with time zone NOT NULL DEFAULT now()
- source_key: text

Ограничения:

- FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE
- PRIMARY KEY (id)
- CHECK ((length(title) <= 240))
- CHECK (("to" ~ '^/[^/]'::text))

Индексы:

- CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id)
- CREATE INDEX notification_owner ON public.notifications USING btree (parent_id, read)
- CREATE UNIQUE INDEX notification_dedup ON public.notifications USING btree (parent_id, source_key) WHERE (source_key IS NOT NULL)

RLS:

- own_notifications: SELECT; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK —
- read_notifications: UPDATE; роли authenticated; USING (parent_id = ( SELECT auth.uid() AS uid)); CHECK (parent_id = ( SELECT auth.uid() AS uid))

## public.care_team_access

- child_id: uuid NOT NULL
- parent_id: uuid NOT NULL
- specialist_id: uuid NOT NULL
- active: boolean NOT NULL DEFAULT true
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- FOREIGN KEY (child_id, parent_id) REFERENCES children(id, parent_id) ON DELETE CASCADE
- PRIMARY KEY (child_id, specialist_id)
- FOREIGN KEY (specialist_id) REFERENCES specialists(id)

Индексы:

- CREATE UNIQUE INDEX care_team_access_pkey ON public.care_team_access USING btree (child_id, specialist_id)

RLS:

- team_access_read: SELECT; роли authenticated; USING ((parent_id = ( SELECT auth.uid() AS uid)) OR (active AND private.team_member(child_id))); CHECK —

## public.team_recommendations

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- child_id: uuid NOT NULL
- parent_id: uuid NOT NULL
- specialist_id: uuid NOT NULL
- body: text NOT NULL
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- CHECK (((length(btrim(body)) >= 10) AND (length(btrim(body)) <= 2000)))
- FOREIGN KEY (child_id, parent_id) REFERENCES children(id, parent_id) ON DELETE CASCADE
- PRIMARY KEY (id)
- FOREIGN KEY (specialist_id) REFERENCES specialists(id)

Индексы:

- CREATE UNIQUE INDEX team_recommendations_pkey ON public.team_recommendations USING btree (id)
- CREATE INDEX team_notes_child ON public.team_recommendations USING btree (child_id, created_at DESC)

RLS:

- team_notes_read: SELECT; роли authenticated; USING ((parent_id = ( SELECT auth.uid() AS uid)) OR private.team_member(child_id)); CHECK —
- team_notes_write: INSERT; роли authenticated; USING —; CHECK (private.owns_specialist(specialist_id) AND private.team_member(child_id))

## public.community_preferences

- user_id: uuid NOT NULL
- topics: ARRAY NOT NULL DEFAULT '{}'::text[]
- notify_new: boolean NOT NULL DEFAULT true

Ограничения:

- PRIMARY KEY (user_id)
- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
- CHECK ((topics <@ ARRAY['Новости'::text, 'Мероприятия'::text, 'Поведение'::text, 'Обучение'::text, 'Сон и быт'::text, 'Семья'::text, 'Речь'::text, 'Занятия'::text, 'ПМПК'::text, 'Поддержка'::text, 'Волонтёры'::text]))

Индексы:

- CREATE UNIQUE INDEX community_preferences_pkey ON public.community_preferences USING btree (user_id)

RLS:

- community_preferences_own: ALL; роли authenticated; USING (user_id = ( SELECT auth.uid() AS uid)); CHECK (user_id = ( SELECT auth.uid() AS uid))

## public.community_replies

- id: uuid NOT NULL DEFAULT gen_random_uuid()
- question_id: uuid NOT NULL
- parent_id: uuid NOT NULL
- parent_reply_id: uuid
- parent_answer_id: uuid
- body: text NOT NULL
- status: text NOT NULL DEFAULT 'pending'::text
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- CHECK (((length(btrim(body)) >= 3) AND (length(btrim(body)) <= 1200)))
- CHECK (((parent_reply_id IS NULL) OR (parent_answer_id IS NULL)))
- UNIQUE (id, question_id)
- FOREIGN KEY (parent_answer_id) REFERENCES answers(id) ON DELETE CASCADE
- FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE
- FOREIGN KEY (parent_reply_id, question_id) REFERENCES community_replies(id, question_id) ON DELETE CASCADE
- PRIMARY KEY (id)
- FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
- CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))

Индексы:

- CREATE UNIQUE INDEX community_replies_pkey ON public.community_replies USING btree (id)
- CREATE UNIQUE INDEX community_replies_id_question_id_key ON public.community_replies USING btree (id, question_id)
- CREATE INDEX community_replies_thread ON public.community_replies USING btree (question_id, created_at)

RLS:

- community_reply_create: INSERT; роли authenticated; USING —; CHECK ((parent_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM questions q
  WHERE ((q.id = community_replies.question_id) AND (q.status = ANY (ARRAY['open'::text, 'answered'::text]))))))
- community_reply_moderate: UPDATE; роли authenticated; USING private.is_staff(); CHECK private.is_staff()
- community_reply_read: SELECT; роли authenticated; USING (((status = 'approved'::text) OR (parent_id = ( SELECT auth.uid() AS uid)) OR private.is_staff()) AND (EXISTS ( SELECT 1
   FROM questions q
  WHERE (q.id = community_replies.question_id)))); CHECK —

## public.content_translations

- source_kind: text NOT NULL
- source_id: uuid NOT NULL
- target_language: text NOT NULL
- source_hash: text NOT NULL
- translated_text: text NOT NULL
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- PRIMARY KEY (source_kind, source_id, target_language)
- CHECK ((source_kind = ANY (ARRAY['message'::text, 'reply'::text, 'team'::text, 'question'::text, 'answer'::text, 'review'::text])))
- CHECK ((target_language = ANY (ARRAY['ru'::text, 'kk'::text])))
- CHECK (((length(translated_text) >= 1) AND (length(translated_text) <= 6000)))

Индексы:

- CREATE UNIQUE INDEX content_translations_pkey ON public.content_translations USING btree (source_kind, source_id, target_language)

RLS:

- authorized_content_translation: SELECT; роли authenticated; USING (((source_kind = 'reply'::text) AND (EXISTS ( SELECT 1
   FROM community_replies r
  WHERE (r.id = content_translations.source_id)))) OR ((source_kind = 'team'::text) AND (EXISTS ( SELECT 1
   FROM team_recommendations r
  WHERE (r.id = content_translations.source_id)))) OR ((source_kind = 'question'::text) AND (EXISTS ( SELECT 1
   FROM questions q
  WHERE (q.id = content_translations.source_id)))) OR ((source_kind = 'answer'::text) AND (EXISTS ( SELECT 1
   FROM answers a
  WHERE (a.id = content_translations.source_id)))) OR ((source_kind = 'review'::text) AND (EXISTS ( SELECT 1
   FROM reviews r
  WHERE (r.id = content_translations.source_id))))); CHECK —

## private.checkin_attempts

- user_id: uuid NOT NULL
- window_at: timestamp with time zone NOT NULL
- hits: integer NOT NULL

Ограничения:

- PRIMARY KEY (user_id)
- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

Индексы:

- CREATE UNIQUE INDEX checkin_attempts_pkey ON private.checkin_attempts USING btree (user_id)

RLS:

- deny_direct_client_access: ALL; роли authenticated; USING false; CHECK false

## private.calendar_links

- user_id: uuid NOT NULL
- token_hash: text NOT NULL
- expires_at: timestamp with time zone NOT NULL
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- PRIMARY KEY (user_id)
- UNIQUE (token_hash)
- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

Индексы:

- CREATE UNIQUE INDEX calendar_links_pkey ON private.calendar_links USING btree (user_id)
- CREATE UNIQUE INDEX calendar_links_token_hash_key ON private.calendar_links USING btree (token_hash)

RLS:

- deny_direct_client_access: ALL; роли authenticated; USING false; CHECK false

## private.specialist_qr_codes

- specialist_id: uuid NOT NULL
- code: uuid NOT NULL DEFAULT gen_random_uuid()
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- UNIQUE (code)
- PRIMARY KEY (specialist_id)
- FOREIGN KEY (specialist_id) REFERENCES specialists(id) ON DELETE CASCADE

Индексы:

- CREATE UNIQUE INDEX specialist_qr_codes_pkey ON private.specialist_qr_codes USING btree (specialist_id)
- CREATE UNIQUE INDEX specialist_qr_codes_code_key ON private.specialist_qr_codes USING btree (code)

RLS:

- deny_direct_client_access: ALL; роли authenticated; USING false; CHECK false

## private.visit_confirmations

- appointment_id: uuid NOT NULL
- parent_id: uuid NOT NULL
- specialist_id: uuid NOT NULL
- confirmed_at: timestamp with time zone NOT NULL DEFAULT now()
- method: text NOT NULL DEFAULT 'printed_qr'::text

Ограничения:

- FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
- FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE
- PRIMARY KEY (appointment_id)
- FOREIGN KEY (specialist_id) REFERENCES specialists(id) ON DELETE CASCADE

Индексы:

- CREATE UNIQUE INDEX visit_confirmations_pkey ON private.visit_confirmations USING btree (appointment_id)

RLS:

- deny_direct_client_access: ALL; роли authenticated; USING false; CHECK false

## private.review_case_features

- review_id: uuid NOT NULL
- age: numeric NOT NULL
- case_group: text NOT NULL
- visit_format: text NOT NULL
- consented_at: timestamp with time zone NOT NULL DEFAULT now()
- public_summary: text

Ограничения:

- PRIMARY KEY (review_id)
- CHECK (((public_summary IS NULL) OR (length(public_summary) <= 220)))
- FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE

Индексы:

- CREATE UNIQUE INDEX review_case_features_pkey ON private.review_case_features USING btree (review_id)

RLS:

- deny_direct_client_access: ALL; роли authenticated; USING false; CHECK false

## private.rate_limits

- user_id: uuid NOT NULL
- bucket: text NOT NULL
- window_start: timestamp with time zone NOT NULL
- hits: integer NOT NULL DEFAULT 1

Ограничения:

- PRIMARY KEY (user_id, bucket, window_start)
- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

Индексы:

- CREATE UNIQUE INDEX rate_limits_pkey ON private.rate_limits USING btree (user_id, bucket, window_start)

RLS:

- deny_direct_quota: ALL; роли authenticated; USING false; CHECK false

## private.telegram_events

- update_id: bigint NOT NULL
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- PRIMARY KEY (update_id)

Индексы:

- CREATE UNIQUE INDEX telegram_events_pkey ON private.telegram_events USING btree (update_id)

RLS:

- deny_direct_events: ALL; роли authenticated; USING false; CHECK false

## private.push_deliveries

- notification_id: uuid NOT NULL
- subscription_id: uuid NOT NULL
- attempts: integer NOT NULL DEFAULT 0
- lease_until: timestamp with time zone
- sent_at: timestamp with time zone
- last_code: integer

Ограничения:

- FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
- PRIMARY KEY (notification_id, subscription_id)
- FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE CASCADE

Индексы:

- CREATE UNIQUE INDEX push_deliveries_pkey ON private.push_deliveries USING btree (notification_id, subscription_id)

RLS:

- deny_client_push_delivery: ALL; роли authenticated; USING false; CHECK false

## private.ai_metrics

- id: bigint NOT NULL
- created_at: timestamp with time zone NOT NULL DEFAULT now()
- feature: text NOT NULL
- outcome: text NOT NULL
- input_tokens: integer NOT NULL DEFAULT 0
- output_tokens: integer NOT NULL DEFAULT 0

Ограничения:

- CHECK ((feature = ANY (ARRAY['explain'::text, 'translation'::text])))
- CHECK ((input_tokens >= 0))
- CHECK ((outcome = ANY (ARRAY['dictionary'::text, 'cache'::text, 'blocked'::text, 'error'::text, 'model'::text])))
- CHECK ((output_tokens >= 0))
- PRIMARY KEY (id)

Индексы:

- CREATE UNIQUE INDEX ai_metrics_pkey ON private.ai_metrics USING btree (id)

RLS:

- deny_client_ai_metrics: ALL; роли authenticated; USING false; CHECK false

## private.ai_settings

- singleton: boolean NOT NULL DEFAULT true
- enabled: boolean NOT NULL DEFAULT false
- model: text NOT NULL DEFAULT 'gemini-2.5-flash'::text
- daily_limit: integer NOT NULL DEFAULT 20

Ограничения:

- CHECK (((daily_limit >= 1) AND (daily_limit <= 100)))
- CHECK ((model ~ '^[a-zA-Z0-9.-]+$'::text))
- PRIMARY KEY (singleton)
- CHECK (singleton)

Индексы:

- CREATE UNIQUE INDEX ai_settings_pkey ON private.ai_settings USING btree (singleton)

RLS:

- no_client_settings: ALL; роли anon, authenticated; USING false; CHECK false

## private.ai_daily_usage

- day: date NOT NULL
- hits: integer NOT NULL DEFAULT 0

Ограничения:

- CHECK ((hits >= 0))
- PRIMARY KEY (day)

Индексы:

- CREATE UNIQUE INDEX ai_daily_usage_pkey ON private.ai_daily_usage USING btree (day)

RLS:

- no_client_usage: ALL; роли anon, authenticated; USING false; CHECK false

## private.booking_payments

- appointment_id: uuid NOT NULL
- parent_id: uuid NOT NULL
- specialist_id: uuid NOT NULL
- state: text NOT NULL
- amount: integer NOT NULL
- deadline: timestamp with time zone NOT NULL
- receipt_path: text
- created_at: timestamp with time zone NOT NULL DEFAULT now()
- claimed_at: timestamp with time zone
- confirmed_at: timestamp with time zone
- reminded_at: timestamp with time zone
- provider_reminded_at: timestamp with time zone
- overdue_at: timestamp with time zone
- extended_at: timestamp with time zone

Ограничения:

- CHECK ((amount >= 0))
- FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
- FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE
- PRIMARY KEY (appointment_id)
- FOREIGN KEY (specialist_id) REFERENCES specialists(id) ON DELETE CASCADE
- CHECK ((state = ANY (ARRAY['awaiting_payment'::text, 'payment_reported'::text, 'confirmed'::text, 'expired'::text, 'cancelled'::text])))

Индексы:

- CREATE UNIQUE INDEX booking_payments_pkey ON private.booking_payments USING btree (appointment_id)
- CREATE UNIQUE INDEX one_receipt_one_appointment ON private.booking_payments USING btree (receipt_path) WHERE (receipt_path IS NOT NULL)
- CREATE INDEX payment_deadline_queue ON private.booking_payments USING btree (deadline) WHERE (state = 'awaiting_payment'::text)
- CREATE INDEX payment_parent_holds ON private.booking_payments USING btree (parent_id, state)

RLS:

- deny_direct_client_access: ALL; роли authenticated; USING false; CHECK false

## private.attendance_tokens

- appointment_id: uuid NOT NULL
- code_hash: text NOT NULL
- expires_at: timestamp with time zone NOT NULL
- used_at: timestamp with time zone
- attempts: integer NOT NULL DEFAULT 0

Ограничения:

- FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
- PRIMARY KEY (appointment_id)

Индексы:

- CREATE UNIQUE INDEX attendance_tokens_pkey ON private.attendance_tokens USING btree (appointment_id)

RLS:

- deny_direct_attendance_tokens: ALL; роли authenticated; USING false; CHECK false

## private.provider_reliability_events

- appointment_id: uuid NOT NULL
- specialist_id: uuid NOT NULL
- created_at: timestamp with time zone NOT NULL DEFAULT now()

Ограничения:

- FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
- PRIMARY KEY (appointment_id)
- FOREIGN KEY (specialist_id) REFERENCES specialists(id) ON DELETE CASCADE

Индексы:

- CREATE UNIQUE INDEX provider_reliability_events_pkey ON private.provider_reliability_events USING btree (appointment_id)

RLS:

- deny_direct_client_access: ALL; роли authenticated; USING false; CHECK false

## private.translation_quotas

- user_id: uuid NOT NULL
- hour_at: timestamp with time zone NOT NULL
- hits: integer NOT NULL

Ограничения:

- PRIMARY KEY (user_id, hour_at)
- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

Индексы:

- CREATE UNIQUE INDEX translation_quotas_pkey ON private.translation_quotas USING btree (user_id, hour_at)

RLS:

- no_translation_quota_client: ALL; роли anon, authenticated; USING false; CHECK false

## Связанные функции

- private.offboard_provider() — SECURITY DEFINER, проверять scope/EXECUTE
- private.team_member(cid uuid) — SECURITY DEFINER, проверять scope/EXECUTE
- private.set_team_access(p_child_id uuid, p_specialist_id uuid, p_granted boolean) — SECURITY DEFINER, проверять scope/EXECUTE
- public.care_set_team_access(p_child_id uuid, p_specialist_id uuid, p_granted boolean) — SECURITY INVOKER
- private.care_snapshot_core() — SECURITY INVOKER
- private.appointment_modified() — SECURITY INVOKER
- private.specialist_qr(p_rotate boolean) — SECURITY DEFINER, проверять scope/EXECUTE
- public.care_specialist_qr(p_rotate boolean) — SECURITY INVOKER
- public.care_confirm_qr(p_code text, p_appointment_id uuid) — SECURITY INVOKER
- private.confirm_qr(p_code text, p_appointment_id uuid) — SECURITY DEFINER, проверять scope/EXECUTE
- private.calendar_link(p_revoke boolean) — SECURITY DEFINER, проверять scope/EXECUTE
- public.care_calendar_link(p_revoke boolean) — SECURITY INVOKER
- public.care_calendar_feed(p_token text) — SECURITY INVOKER
- public.care_snapshot() — SECURITY INVOKER
- private.rating_age(p_age text) — SECURITY INVOKER
- private.calendar_feed(p_token text) — SECURITY DEFINER, проверять scope/EXECUTE
- public.app_navigation_graph() — SECURITY INVOKER
- private.ratings(p_child_id uuid, p_format text) — SECURITY DEFINER, проверять scope/EXECUTE
- public.care_ratings(p_child_id uuid, p_format text) — SECURITY INVOKER
- private.book_slot(p jsonb) — SECURITY DEFINER, проверять scope/EXECUTE
- private.submit_care_review(p jsonb) — SECURITY DEFINER, проверять scope/EXECUTE
- public.care_book_slot(p jsonb) — SECURITY INVOKER
- public.care_submit_review(p jsonb) — SECURITY INVOKER
- private.guard_verified_visit_time() — SECURITY INVOKER
- private.guard_team_note() — SECURITY DEFINER, проверять scope/EXECUTE
- private.community_publish() — SECURITY DEFINER, проверять scope/EXECUTE
- public.claim_telegram_event(p_update_id bigint) — SECURITY INVOKER
- private.community_reply_guard() — SECURITY DEFINER, проверять scope/EXECUTE
- private.notify_new_thread() — SECURITY DEFINER, проверять scope/EXECUTE
- private.guard_support_ticket() — SECURITY DEFINER, проверять scope/EXECUTE
- private.notify_support_reply() — SECURITY DEFINER, проверять scope/EXECUTE
- private.translation_quota(p_user_id uuid) — SECURITY DEFINER, проверять scope/EXECUTE
- private.is_staff() — SECURITY DEFINER, проверять scope/EXECUTE
- private.touch_and_protect_owner() — SECURITY INVOKER
- private.limit_submissions() — SECURITY INVOKER
- private.audit_change() — SECURITY DEFINER, проверять scope/EXECUTE
- private.consume_function_quota(p_bucket text) — SECURITY DEFINER, проверять scope/EXECUTE
- public.consume_function_quota(p_bucket text) — SECURITY INVOKER
- private.notify_on_answer() — SECURITY DEFINER, проверять scope/EXECUTE
- public.care_translation_quota(p_user_id uuid) — SECURITY INVOKER
- private.audit_appointment_consent() — SECURITY DEFINER, проверять scope/EXECUTE
- public.save_synthetic_child(p_child jsonb) — SECURITY INVOKER
- private.valid_payment_receipt(p_path text, p_user uuid) — SECURITY DEFINER, проверять scope/EXECUTE
- private.can_read_payment_receipt(p_path text) — SECURITY DEFINER, проверять scope/EXECUTE
- private.gemini_runtime_config() — SECURITY DEFINER, проверять scope/EXECUTE
- private.reserve_gemini_budget() — SECURITY DEFINER, проверять scope/EXECUTE
- public.gemini_runtime_config() — SECURITY INVOKER
- public.reserve_gemini_budget() — SECURITY INVOKER
- public.submit_feedback(p_child_id uuid, p_specialist_id uuid, p_answers jsonb, p_review text) — SECURITY INVOKER
- private.process_booking_deadlines() — SECURITY DEFINER, проверять scope/EXECUTE
- private.care_role() — SECURITY DEFINER, проверять scope/EXECUTE
- private.demo_actor() — SECURITY DEFINER, проверять scope/EXECUTE
- private.owns_specialist(sid uuid) — SECURITY DEFINER, проверять scope/EXECUTE
- private.clinic_owns(cid uuid) — SECURITY DEFINER, проверять scope/EXECUTE
- private.in_my_clinic(sid uuid) — SECURITY DEFINER, проверять scope/EXECUTE
- private.has_patient(cid uuid) — SECURITY DEFINER, проверять scope/EXECUTE
- private.payment_policy() — SECURITY DEFINER, проверять scope/EXECUTE
- private.register_care_role(p_role text) — SECURITY DEFINER, проверять scope/EXECUTE
- public.register_care_role(p_role text) — SECURITY INVOKER
- private.care_notice(uid uuid, title text, path text) — SECURITY INVOKER
- private.care_command_core(p_action text, p jsonb) — SECURITY DEFINER, проверять scope/EXECUTE
- private.care_command(p_action text, p jsonb) — SECURITY DEFINER, проверять scope/EXECUTE
- private.clinic_schedule() — SECURITY DEFINER, проверять scope/EXECUTE
- private.provider_schedule() — SECURITY DEFINER, проверять scope/EXECUTE
- private.shared_patients() — SECURITY DEFINER, проверять scope/EXECUTE
- public.care_command(p_action text, p jsonb) — SECURITY INVOKER
- private.review_summaries() — SECURITY DEFINER, проверять scope/EXECUTE
- public.deliver_care_reminders() — SECURITY INVOKER
- private.payment_snapshot() — SECURITY DEFINER, проверять scope/EXECUTE
- private.reliability_snapshot() — SECURITY DEFINER, проверять scope/EXECUTE
- private.protect_professional_goal() — SECURITY INVOKER
- private.deliver_care_reminders() — SECURITY DEFINER, проверять scope/EXECUTE
- private.family_task(p_token text) — SECURITY DEFINER, проверять scope/EXECUTE
- public.family_task(p_token text) — SECURITY INVOKER
- private.refresh_contact_rating() — SECURITY DEFINER, проверять scope/EXECUTE
- private.register_push_device(p_endpoint text, p_p256dh text, p_auth text) — SECURITY DEFINER, проверять scope/EXECUTE
- public.remove_push_device(p_endpoint text) — SECURITY INVOKER
- public.claim_push_batch() — SECURITY DEFINER, проверять scope/EXECUTE
- public.finish_push_delivery(p_notification uuid, p_subscription uuid, p_code integer) — SECURITY DEFINER, проверять scope/EXECUTE
- public.register_push_device(p_endpoint text, p_p256dh text, p_auth text) — SECURITY INVOKER
- public.schedule_notification_reminders() — SECURITY DEFINER, проверять scope/EXECUTE
- public.record_ai_metric(p_feature text, p_outcome text, p_input integer, p_output integer) — SECURITY DEFINER, проверять scope/EXECUTE
- private.rating_values(p_age numeric, p_group text, p_format text) — SECURITY DEFINER, проверять scope/EXECUTE

ER и граф информации: [docs/diagrams.md](docs/diagrams.md).
