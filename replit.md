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
- A fresh database has no employees, so the login page has no account to sign in with. There is no signup route by design — seed the first admin manually via a SQL insert into `employees`, hashing the password the same way `artifacts/api-server/src/lib/password.ts` does.
- A seed admin account was created for this environment: phone `0500000000`. **Change/rotate this password after first login** — don't rely on it long-term and don't commit real credentials to this file.

## Gotchas

- عند تغيير schema الـ DB، نفّذ `pnpm --filter @workspace/db run push` ثم أعد تشغيل API server
- بعد أي تغيير في openapi.yaml، نفّذ codegen قبل استخدام الأنواع المحدّثة
- نسبة الإشغال = (occupied + reserved) / totalRooms

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
