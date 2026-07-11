# فندق لاس فيجاس — نظام إدارة الحجوزات

نظام إداري متكامل للشركة الدولية لإدارة الفنادق، مخصص لفندق لاس فيجاس (42 غرفة). يتيح للموظفين إدارة الحجوزات، تتبع حالة الغرف، وتصدير البيانات لـ Google Sheets.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — تشغيل API server (port 8080)
- `pnpm --filter @workspace/hotel-admin run dev` — تشغيل واجهة المستخدم (port 20862)
- `pnpm run typecheck` — فحص TypeScript الكامل
- `pnpm run build` — typecheck + build جميع الحزم
- `pnpm --filter @workspace/api-spec run codegen` — إعادة توليد API hooks و Zod schemas
- `pnpm --filter @workspace/db run push` — تطبيق تغييرات schema على قاعدة البيانات
- Required env: `DATABASE_URL` — PostgreSQL connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + TanStack Query + shadcn/ui + Recharts
- API: Express 5 + Zod validation
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — مصدر الحقيقة لعقود API
- `lib/db/src/schema/` — Drizzle schema: rooms, employees, guests, reservations
- `artifacts/api-server/src/routes/` — routes: rooms, employees, guests, reservations, dashboard
- `artifacts/hotel-admin/src/` — واجهة React الأمامية

## Architecture decisions

- OpenAPI-first: الـ spec هو مصدر الحقيقة، codegen ينتج hooks و Zod schemas تلقائياً
- Database transactions: جميع عمليات lifecycle للحجز (create/check-in/check-out/cancel/delete) تستخدم `db.transaction()` مع SELECT FOR UPDATE لضمان اتساق حالة الغرف
- PATCH /reservations/:id مقيد بحقول metadata فقط — التغييرات في حالة الحجز تمر عبر endpoints مخصصة
- CSV export يتضمن BOM (UTF-8) لدعم Excel والعربية
- واجهة RTL كاملة مع خطوط Cairo وPlayfair Display

## Product

- **لوحة التحكم**: إحصائيات فورية، نسبة إشغال حسب نوع الغرفة، أفضل الموظفين، آخر الحجوزات
- **الحجوزات**: جدول كامل مع فلترة متعددة، check-in/check-out/cancel، رقم إيصال الدفع، اسم الموظف المسؤول
- **الغرف**: شبكة الـ 42 غرفة (standard/deluxe/suite/penthouse) مع حالة كل غرفة
- **الضيوف والموظفين**: دليل مع إمكانية البحث والإضافة والتعديل
- **التصدير**: تصدير CSV جاهز للاستيراد في Google Sheets

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Running the project

- Workflows `artifacts/api-server: API Server` (port 8080) and `artifacts/hotel-admin: web` (port 20862) are configured and running. `pnpm install` and `pnpm --filter @workspace/db run push` were run to set up dependencies and the schema.
- There is no signup route by design. The system admin account is seeded automatically on every API server startup from the `ADMIN_PHONE` / `ADMIN_PASSWORD` secrets (see `artifacts/api-server/src/lib/seed-admin.ts`) — never hardcoded or committed. If the account is missing it's created; if it exists but was demoted/deactivated, its role/active flag is repaired. It never overwrites a password that was already changed from the UI.
- To rotate the admin's login phone/password, update the `ADMIN_PHONE`/`ADMIN_PASSWORD` secrets and restart the API server (updates the account only if that phone doesn't already exist as an employee — otherwise change the password from the "الموظفين" page instead).

## Employee management (admin only)

- Admins can edit an employee's info, change their password, and activate/deactivate accounts from a dropdown menu on each card in "الموظفين". Deactivated employees cannot log in (`/auth/login-by-phone` returns 403).
- Admins cannot deactivate, demote, or delete their own account (prevents accidental lockout) — the API rejects these with 400.
- `employees.isActive` (boolean, default true) was added to the schema; ran `pnpm --filter @workspace/db run push` and regenerated the API client/Zod schemas via `pnpm --filter @workspace/api-spec run codegen` after the change.

## Gotchas

- عند تغيير schema الـ DB، نفّذ `pnpm --filter @workspace/db run push` ثم أعد تشغيل API server
- بعد أي تغيير في openapi.yaml، نفّذ codegen قبل استخدام الأنواع المحدّثة
- نسبة الإشغال = (occupied + reserved) / totalRooms

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
