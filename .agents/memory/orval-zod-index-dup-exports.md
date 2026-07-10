---
name: Orval-generated zod index duplicate exports
description: lib/api-zod/src/index.ts can accumulate duplicate export lines after codegen, causing TS ambiguity
---

`lib/api-zod/src/index.ts` is hand-maintained (not auto-overwritten by orval), but it has been observed with duplicate `export * from "./generated/api"` / `export * from "./generated/types"` lines more than once across sessions in this project.

**Why:** Unclear root cause (possibly a stale checkpoint restore or manual edit history), but duplicate `export *` lines from files with overlapping type names causes TypeScript export ambiguity errors that block typecheck/build.

**How to apply:** After running `pnpm --filter @workspace/api-spec run codegen`, check `lib/api-zod/src/index.ts` for duplicate export lines and dedupe before typechecking. The file should contain exactly one `export *` line per generated module.
