# AGENTS.md

Musrenbang Digital: React 19 + Vite frontend and Supabase backend in a Bun workspace.
Read `README.md` for setup and `ARSITEKTUR.md` for design; keep both in sync with behavior.
Product source of truth is `PRD Musrenbang Digital.md` (the PDF is a duplicate). It defines
features and acceptance criteria. The PRD's stack line says Next.js, but the implemented app is
React + Vite; trust the repo config and code when they conflict with PRD prose.

## Commands

- `bun install` — the only package manager; root `bun.lock` is the lockfile.
- `bun run dev` — Vite at <http://localhost:5173>.
- `bun run check` — format:check + lint + typecheck + test. Run before finishing. GitHub Actions (`.github/workflows/deploy.yml`, workflow "CI Check") runs only `bun test` and `bun run typecheck`, plus `deno check` for all three Edge Functions and a Deno loopback test for `musrenai-chat`. It deploys nothing and skips format and lint. On Windows with `core.autocrlf=true`, `format:check` can report hundreds of files that differ only by CRLF line endings; check line endings before treating that as a real failure.
- `bun test packages/shared/src/lib/gap.test.ts` — run one test file. `bun test -t "pattern"` filters by test name.
- `bun run typecheck` — runs shared, web, and root/scripts tsconfigs; use it instead of ad-hoc `tsc`.
- `pwsh scripts/test-backend.ps1` — apply migrations and run SQL assertions locally in one transaction, then roll back. Start the isolated database-only Supabase project first.
- `pwsh scripts/test-integration.ps1 -EnvironmentSuffix mvp` — local Auth, PostgREST, RLS, RPC, concurrency, and fixture-cleanup tests. Never uses a remote fallback.
- `bun run format` — Oxfmt. Do not use Prettier or ESLint; this repo uses Oxfmt/Oxlint.
- `bun run seed` — requires root `.env` and a real Supabase project; destructive (see below).

## Layout and boundaries

- `web/` React app; `packages/shared/` Zod contracts, types, constants, gap logic; `supabase/` SQL, seed, and Edge Functions (`supabase/functions/`); `scripts/seed.ts`.
- `@musrenbang/shared` resolves directly to TypeScript source via Vite/TS aliases; it is not built separately.
- Frontend calls Supabase directly (PostgREST/Auth/RPC) with the anon key. Do not add a custom API/BFF unless explicitly requested.
- Feature queries/mutations live in `features/*/api.ts` and hooks in `features/*/queries.ts`. Components should not call Supabase directly; the auth state listener in `AuthProvider` and shared helpers in `lib/api.ts` are the known exceptions.
- Add pages under `web/src/routes/` and register a lazy route in `web/src/app/router.tsx`.
- Add query keys in `web/src/lib/query-keys.ts`; invalidate related keys after mutations.
- Parse Supabase responses with Zod (`parseWith` in `web/src/lib/api.ts`) before storing. `bigint` may arrive as a string; shared read schemas use `z.coerce`.

## Supabase and data

- Root `supabase/config.toml` is the CLI migration context (PostgreSQL 17, seed disabled); `supabase/integration/config.toml` configures the isolated HTTP integration stack. Project link metadata is local and must be checked before any remote CLI operation.
- There are 23 migrations in `supabase/migrations/`, ordered by timestamp prefix: `init`, `rls`, `views`, `rpc`, `foundation_security`, `security_advisor_hardening`, `mvp_public_stats_status_audit`, `auth_profile_metadata`, `allow_owners_delete_pending_or_rejected_proposals`, `priority_rankings`, `musrenai_rate_limit`, `musrenai_admin_autoflag`, `musrenai_shared_provider_quota`, `musrenai_admin_aspiration_summary`, `musrenai_worker_runtime`, `musrenai_provider_rolling_limits`, `admin_ai_triage`, `admin_ai_triage_failed_state`, `admin_ai_triage_pending_as_not_analyzed`, `rls_initplan_auth_uid`, `similar_proposals`, `foreign_key_indexes`, `citizen_write_rate_limits`. On 2026-11-07 all 23 were applied on the development project (`musrenbang-digital-backend`, ref `dogyibbzwfslspflsidm`). Confirm with the Supabase migration list before any remote operation; do not assume a later migration is applied.
- Never edit a migration already applied to a project; add a new numbered migration.
- RLS is the source of truth for authorization. Do not replace it with UI checks or a service-role client.
- Domain statuses: `Diajukan`, `Diverifikasi`, `Masuk APBD`, `Dikerjakan`, `Selesai`. Roles: `warga`, `admin`.
- `proposals.kategori` and `allocations.kategori` reference `categories.nama` (text), not `categories.id`.
- Change proposal status only via RPC `change_proposal_status`; a trigger rejects non-admin direct status updates.
- Save allocations only via RPC `save_allocations`; it enforces the virtual budget and replaces the user's rows atomically.
- `profiles` is auto-created by an `auth.users` trigger. Admin role is granted manually via SQL; there is no self-service role UI.
- The four foundation views use `security_invoker = true`; safe author names, vote totals, and cross-user aggregates are supplied through narrowly granted helpers in `private`. Never expose `private` through the Data API.
- Since migration `mvp_public_stats_status_audit`, `v_gap` filters APBD by configured city/year and includes only `verified_program` rows with a source URL. It uses the ratio of summed nominal allocations; PRD wording about per-user average remains unresolved.
- `proposals.moderasi` (`Menunggu`, `Disetujui`, `Ditolak`) is separate from `proposals.status`. AI triage must never change either.
- `packages/shared/src/types/database.ts` is manual, not generated. Update it alongside migrations.

## MusrenAI Edge Functions

- `supabase/functions/musrenai-chat` (citizen chat) and `supabase/functions/admin-ai-triage` (on-demand admin review of one proposal) call Gemini. Both are deployed with `verify_jwt = true`; do not turn it off. Each has a `core.ts` (pure handler, unit-tested with Bun) and an `index.ts` (Deno wiring). Personal-data detection and redaction live in `supabase/functions/_shared/pii.ts`, imported by all three functions; change it there, never copy it. When deploying through the Supabase MCP, include it as the file `../_shared/pii.ts`.
- `admin-ai-triage` flow: verify the JWT through `/auth/v1/user`, then RPC `claim_admin_ai_triage(p_admin, p_proposal_id)` (checks `profiles.peran = 'admin'`, takes a 2-minute lease), then `reserve_musrenai_provider_attempt('admin')`, then Gemini, then `finish_admin_ai_triage`. Both triage RPCs are granted to `service_role` only and receive the admin id from the Edge Function. Only `judul`, `deskripsi`, and `kategori` reach Gemini, after `redact()` removes emails, phone numbers, and 16-digit IDs. Names and addresses in free text are not redacted.
- Gemini quota is shared by both functions: 10 attempts per minute and 300 per day, enforced by `reserve_musrenai_provider_attempt`. Use the free tier only; do not enable billing.
- `admin-ai-triage` retries Gemini once for 5xx or network errors, reserving shared quota again before the retry. It never retries 429, 4xx, or malformed responses. On final failure it calls `finish(failed)`, replies 503, and logs only the stage and a fixed code (for example `provider_status=503`). Never log proposal text.
- `admin-ai-triage` sends Gemini a `responseSchema` (object with `flags` from the four allowed values, at most 3, and `reason`). `validateReview` still checks the reply and rejects it with a fixed rule code (`not_object`, `flags_type`, `flags_count`, `flags_value`, `flags_duplicate`, `reason_type`, `reason_empty`, `reason_long`), logged as `bad_schema:<rule>:finish=<reason>`.
- All three Gemini callers send a `responseSchema`; the server-side validator stays as a second layer. Keep both when changing a prompt.
- `musrenai-chat` logs only a stage and a fixed rule code (`provider unavailable|timeout`, or `output <rule>` such as `routes_value` or `answer_apbd_number`). When the model states an APBD figure, the chat replies 200 with a fixed pointer to `/apbd` instead of an error, because figures must come from `apbd_items`, not from the model.
- Triage scope (prompt in `admin-ai-triage/index.ts`): spam, promotion, irrelevant, plus `needs_review` for an unclear need, a clearly wrong category (the prompt lists the ten official categories; keep it in sync with `categories`), or abusive/SARA language. Harsh criticism of government is allowed. Gemini never receives `lokasi`, so never add location-based criteria. Reviews are cached per content hash: changing the prompt does not re-analyze old reviews; delete them to re-run.
- Citizen write limits (trigger `private.limit_citizen_writes`): at most 5 comments per minute and 50 per day, and 5 proposals per day, per citizen. Admins and sessionless SQL are exempt. Comment `dibuat_pada` is forced to `now()` because `authenticated` could otherwise backdate it. Demo data must not create more than 5 proposals per account in a day through the API.
- `bun run predemo` is a read-only readiness check (anon key, no login, no Gemini): site and database reachable, config year matches verified APBD rows, Gap has participants, enough public proposals, and all three Edge Functions boot (OPTIONS 204) and reject anonymous calls (401). Exit code 1 on any failure. Run it the day before a demo; a Free-plan project pauses after about a week of inactivity.
- `bun run load:test` hits four public read endpoints with the anon key (max 1000 requests, 50 concurrent) and prints p50/p95 and error counts. Run it outside demo hours.
- `get_similar_proposals(p_proposal_id, p_limit)` (admin only) finds likely duplicates without AI: pg_trgm text similarity >= 0.3, or the same category within 500 m with similarity >= 0.15. It returns similarity and distance in meters.
- `finish_admin_ai_triage` marks a failed run as the last attempt, so the review ends in state `failed` (not `pending`) and the admin can run it again.
- `supabase/functions/musrenai-cost-hint` (deployed 2026-11-05, used by the proposal form) gives a citizen a rough cost range to help fill `estimasi_biaya`. It reuses `consume_musrenai_quota` (per-citizen limit) and `reserve_musrenai_provider_attempt('warga')`. The server accepts only a range: integers, `min < max`, `max <= 10 * min`, within Rp100 thousand to Rp100 billion; anything else is rejected. The reply always carries a label saying it is an estimate, not an official figure. Disabled unless `MUSRENAI_COST_HINT_ENABLED` is `true`.
- Edge Function secrets (names only): `GEMINI_API_KEY`, `GEMINI_MODEL`, `MUSRENAI_ALLOWED_ORIGIN`, `MUSRENAI_FAQ_APPROVED`, `MUSRENAI_GEMINI_ENABLED`, `MUSRENAI_ADMIN_TRIAGE_ENABLED`, `MUSRENAI_COST_HINT_ENABLED`. Flags must equal the exact string `true`; the allowed origin must match the site origin exactly, without a trailing slash. Never print secret values; compare SHA-256 digests from the dashboard instead.
- Never send real citizen proposals to Gemini for testing. Use synthetic text, or your own test proposal, and filter the admin queue to that proposal before pressing the bulk "Analisis AI" button, because it analyzes every listed proposal.
- `get_proposal_ai_review` reports a queued `pending` review as `not_analyzed` (the enqueue trigger creates `pending` for every new proposal and no worker runs), so the admin UI never locks the "Analisis AI" button on a proposal nobody is analyzing.

## Environment and seed hazards

- Root `.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `KOTA`, `TAHUN_ANGGARAN`, `VIRTUAL_BUDGET_PER_WARGA` — seed only.
- `web/.env`: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are required. `VITE_MUSRENAI_ENABLED=true` is an optional build-time flag that shows the citizen assistant. Never expose the service-role key to Vite.
- Vite env is read at build time; `web/src/lib/env.ts` throws on missing or invalid values.
- `bun run seed` deletes all `apbd_items`, then deletes only proposals with `pengusul_id IS NULL` and reloads 20 samples. It preserves real user proposals. Never run it against data you cannot reset. Do not run it against the development project now: it would delete the APBD 2025 rows (Perda DKI No. 9/2024) loaded on 2026-11-05 and overwrite `config.tahun_anggaran` (now 2025) with the 2026 sample data.
- `bun run demo:accounts` creates 40 confirmed demo citizens (names end in D1 to D40, emails `name.dN@demo.test`) from root `.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_PASSWORD`). It skips existing emails and never prints the password. Demo proposals, comments, votes, allocations, and rankings for the competition are linked to these accounts, Deleting the accounts removes their profiles, comments, votes, allocations, and rankings, but NOT the proposals: `proposals.pengusul_id` is `ON DELETE SET NULL`, so delete the demo proposals first (`DELETE FROM proposals WHERE pengusul_id IN (SELECT id FROM auth.users WHERE email LIKE '%@demo.test')`), which cascades to their comments and votes, then delete the accounts.

## Conventions

- Keep Indonesian domain names and UI copy (`usulan`, `alokasi`, `peran`, etc.); tests and messages are Indonesian.
- Oxfmt: 2 spaces, 100 columns, single quotes, trailing commas.
- Bun unit tests are colocated (`*.test.ts`). SQL assertions live in `supabase/tests/` (`foundation_security.sql`, `admin_ai_triage.sql`, `musrenai_rate_limit.sql`); `scripts/test-backend.ps1` executes only `foundation_security.sql`. Edge Function handlers have colocated Bun tests (`supabase/functions/*/core.test.ts`). Isolated local integration tests use Auth, PostgREST, Mailpit, and HTTP requests for allocation concurrency. A green unit suite alone does not prove database authorization.
- `bun run build` outputs to `web/dist` (ignored). Tailwind 4 is configured through `@tailwindcss/vite`, not a `tailwind.config` file.
