---
name: Hotel Las Vegas seed admin
description: The system admin account is seeded from environment secrets on server startup, never hardcoded or SQL-inserted by hand.
---

There is intentionally no signup/bootstrap route (employee creation is admin-gated by design), so a fresh database has no account to log in with.

**Why:** the auth model only supports admin-created accounts, and credentials must never live in code, migrations, or committed docs — the user explicitly asked for the admin identity to come from environment configuration, not the codebase.

**How to apply:** the API server reads `ADMIN_PHONE` / `ADMIN_PASSWORD` secrets on every startup (see the seed-admin bootstrap logic in `artifacts/api-server/src/lib`) and creates the admin if missing, or repairs its role/active flag if it was demoted/deactivated — without ever overwriting a password the admin already changed via the UI. To rotate admin credentials, update those two secrets and restart the API server; if the old phone number still exists as a row, change its password from the employees page instead of expecting the seed to touch it.
