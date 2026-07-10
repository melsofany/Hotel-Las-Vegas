---
name: Hotel Las Vegas seed admin
description: Fresh DB has no login account — first admin must be bootstrapped manually
---

A fresh database for this app has zero employees, so the login page has no account to authenticate with, and there is intentionally no signup/bootstrap route (employee creation is admin-gated by design).

**Why:** the auth model only supports admin-created accounts; there's no self-serve signup for an internal admin tool.

**How to apply:** on a fresh DB, seed exactly one admin account directly in the database, hashing the password with the same scheme the app's password module uses. Never write real/active credentials into `replit.md` or other repo-committed docs — treat seeded credentials as user-facing chat output only, and encourage rotating them after first login.
