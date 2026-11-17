# Birge Bol — instructions for maintainers
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
