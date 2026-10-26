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

- Migration order is `init` → `rls` → `views` → `rpc`. There is no `supabase/config.toml`; setup is via SQL Editor. Do not assume a local database.
- Never edit a migration already applied to a project; add a new numbered migration.
- RLS is the source of truth for authorization. Do not replace it with UI checks or a service-role client.
- Domain statuses: `Diajukan`, `Diverifikasi`, `Masuk APBD`, `Dikerjakan`, `Selesai`. Roles: `warga`, `admin`.
- `proposals.kategori` and `allocations.kategori` reference `categories.nama` (text), not `categories.id`.
- Change proposal status only via RPC `change_proposal_status`; a trigger rejects non-admin direct status updates.
- Save allocations only via RPC `save_allocations`; it enforces the virtual budget and replaces the user's rows atomically.
- `profiles` is auto-created by an `auth.users` trigger. Admin role is granted manually via SQL; there is no self-service role UI.
- Views `v_*` use `security_invoker = false` intentionally to expose safe aggregates and author names. Do not “fix” this without replacing the read model; base tables stay under RLS.
- `v_gap` aggregates all `apbd_items` without year/city filtering; it assumes one seeded city/year. Revisit if multi-year data is added.
- `packages/shared/src/types/database.ts` is manual, not generated. Update it alongside migrations.

## Environment and seed hazards

- Root `.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `KOTA`, `TAHUN_ANGGARAN`, `VIRTUAL_BUDGET_PER_WARGA` — seed only.
- `web/.env`: only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never expose the service-role key to Vite.
- Vite env is read at build time; `web/src/lib/env.ts` throws on missing or invalid values.
- `bun run seed` deletes all `apbd_items`, then deletes only proposals with `pengusul_id IS NULL` and reloads 20 samples. It preserves real user proposals. Never run it against data you cannot reset.

## Conventions

- Keep Indonesian domain names and UI copy (`usulan`, `alokasi`, `peran`, etc.); tests and messages are Indonesian.
- Oxfmt: 2 spaces, 100 columns, single quotes, trailing commas.
- Tests are colocated (`*.test.ts`) and currently cover shared schemas and gap logic only; there is no database integration test setup.
- `bun run build` outputs to `web/dist` (ignored). Tailwind 4 is configured through `@tailwindcss/vite`, not a `tailwind.config` file.
