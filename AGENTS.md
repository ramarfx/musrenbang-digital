# AGENTS.md

Musrenbang Digital: React 19 + Vite frontend and Supabase backend in a Bun workspace.
Read `README.md` for setup and `ARSITEKTUR.md` for design; keep both in sync with behavior.
Product source of truth is `PRD Musrenbang Digital.md` (the PDF is a duplicate). It defines
features and acceptance criteria. The PRD's stack line says Next.js, but the implemented app is
React + Vite; trust the repo config and code when they conflict with PRD prose.

## Commands

- `bun install` — the only package manager; root `bun.lock` is the lockfile.
- `bun run dev` — Vite at <http://localhost:5173>.
- `bun run check` — format:check + lint + typecheck + test. Run before finishing; there is no CI.
- `bun test packages/shared/src/lib/gap.test.ts` — run one test file. `bun test -t "pattern"` filters by test name.
- `bun run typecheck` — runs shared, web, and root/scripts tsconfigs; use it instead of ad-hoc `tsc`.
- `pwsh scripts/test-backend.ps1` — apply migrations and run SQL assertions locally in one transaction, then roll back. Start the isolated database-only Supabase project first.
- `pwsh scripts/test-integration.ps1 -EnvironmentSuffix mvp` — local Auth, PostgREST, RLS, RPC, concurrency, and fixture-cleanup tests. Never uses a remote fallback.
- `bun run format` — Oxfmt. Do not use Prettier or ESLint; this repo uses Oxfmt/Oxlint.
- `bun run seed` — requires root `.env` and a real Supabase project; destructive (see below).

## Layout and boundaries

- `web/` React app; `packages/shared/` Zod contracts, types, constants, gap logic; `supabase/` SQL and seed; `scripts/seed.ts`.
- `@musrenbang/shared` resolves directly to TypeScript source via Vite/TS aliases; it is not built separately.
- Frontend calls Supabase directly (PostgREST/Auth/RPC) with the anon key. Do not add a custom API/BFF unless explicitly requested.
- Feature queries/mutations live in `features/*/api.ts` and hooks in `features/*/queries.ts`. Components should not call Supabase directly; the auth state listener in `AuthProvider` and shared helpers in `lib/api.ts` are the known exceptions.
- Add pages under `web/src/routes/` and register a lazy route in `web/src/app/router.tsx`.
- Add query keys in `web/src/lib/query-keys.ts`; invalidate related keys after mutations.
- Parse Supabase responses with Zod (`parseWith` in `web/src/lib/api.ts`) before storing. `bigint` may arrive as a string; shared read schemas use `z.coerce`.

## Supabase and data

- Root `supabase/config.toml` is the CLI migration context (PostgreSQL 17, seed disabled); `supabase/integration/config.toml` configures the isolated HTTP integration stack. Project link metadata is local and must be checked before any remote CLI operation.
- Migration order is `init` → `rls` → `views` → `rpc` → `foundation_security` → `security_advisor_hardening` → `mvp_public_stats_status_audit`. The first six are deployed to the authorized development project; migration seven is a local candidate until separately approved. Do not infer that remote has migration seven.
- Never edit a migration already applied to a project; add a new numbered migration.
- RLS is the source of truth for authorization. Do not replace it with UI checks or a service-role client.
- Domain statuses: `Diajukan`, `Diverifikasi`, `Masuk APBD`, `Dikerjakan`, `Selesai`. Roles: `warga`, `admin`.
- `proposals.kategori` and `allocations.kategori` reference `categories.nama` (text), not `categories.id`.
- Change proposal status only via RPC `change_proposal_status`; a trigger rejects non-admin direct status updates.
- Save allocations only via RPC `save_allocations`; it enforces the virtual budget and replaces the user's rows atomically.
- `profiles` is auto-created by an `auth.users` trigger. Admin role is granted manually via SQL; there is no self-service role UI.
- The four foundation views use `security_invoker = true`; safe author names, vote totals, and cross-user aggregates are supplied through narrowly granted helpers in `private`. Never expose `private` through the Data API.
- In local migration seven, `v_gap` filters APBD by configured city/year and includes only `verified_program` rows with a source URL. It continues to use the ratio of summed nominal allocations; PRD wording about per-user average remains unresolved. Migration seven is not on remote.
- `packages/shared/src/types/database.ts` is manual, not generated. Update it alongside migrations.

## Environment and seed hazards

- Root `.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `KOTA`, `TAHUN_ANGGARAN`, `VIRTUAL_BUDGET_PER_WARGA` — seed only.
- `web/.env`: only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never expose the service-role key to Vite.
- Vite env is read at build time; `web/src/lib/env.ts` throws on missing or invalid values.
- `bun run seed` deletes all `apbd_items`, then deletes only proposals with `pengusul_id IS NULL` and reloads 20 samples. It preserves real user proposals. Never run it against data you cannot reset.

## Conventions

- Keep Indonesian domain names and UI copy (`usulan`, `alokasi`, `peran`, etc.); tests and messages are Indonesian.
- Oxfmt: 2 spaces, 100 columns, single quotes, trailing commas.
- Bun unit tests are colocated (`*.test.ts`). SQL assertions live in `supabase/tests/foundation_security.sql`; isolated local integration tests use Auth, PostgREST, Mailpit, and HTTP requests for allocation concurrency. A green unit suite alone does not prove database authorization.
- `bun run build` outputs to `web/dist` (ignored). Tailwind 4 is configured through `@tailwindcss/vite`, not a `tailwind.config` file.
