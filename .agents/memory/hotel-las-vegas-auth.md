---
name: Hotel Las Vegas auth model
description: Two-role auth design (admin/employee) with phone+password login for the hotel-admin app
---

The employee role model is intentionally simple: only `admin` and `employee` (no supervisor/receptionist/manager tiers).

**Why:** User explicitly rejected the original 3-role scheme (manager/supervisor/receptionist) and asked for exactly two roles, where admin can create new employee accounts and everyone logs in with phone + password.

**How to apply:**
- Login is phone number + password (not OTP, not just phone). Password is hashed server-side with Node's built-in `crypto.scryptSync` (no external bcrypt dependency added).
- Auth token is a simple base64url-encoded `employee:<id>:<timestamp>` string (not JWT) — acceptable because this is an internal, low-security hotel admin tool, not public-facing.
- Only employees with `role === 'admin'` can create/update/delete other employees. This is enforced server-side in `artifacts/api-server/src/routes/employees.ts` via a `requireAdmin` check that decodes the bearer token and looks up the caller's role — never trust the frontend-only role check.
- Frontend attaches the token globally via `setAuthTokenGetter` from `@workspace/api-client-react` (reads from localStorage), configured once in `App.tsx`. Individual mutation calls should NOT also pass an explicit `Authorization` header — doing so overrides the getter and can send an empty/stale token.
- If future work reintroduces more granular roles, update: `lib/db/src/schema/employees.ts` (role column + default), `lib/api-spec/openapi.yaml` (role enum on `Employee`/`EmployeeInput`/`EmployeeUpdate`), `roleLabels` in `layout.tsx`, and role labels/colors in `employees.tsx`.
