# Handoff: Supabase Secrets Rotation & Hardcoded Secret Remediation

**Date:** 2026-06-15
**Project:** Puras Cinderelas (`/Users/pamaral/Lab/puras_cinderelas`)
**Repo:** `lockemind/puras_cinderelas` (GitHub, public)
**Commit:** `99677d0` — `fix: remove hardcoded secrets from cron jobs and edge functions`

---

## Context

GitGuardian flagged a Supabase Service Role JWT exposed in `supabase/migrations/009_fix_sync_results_auth.sql`. An audit revealed two secrets hardcoded across 4 migration files (005, 007, 008, 009):

1. **Supabase Service Role JWT** — full admin access to the project
2. **`x-sync-secret` HMAC key** — authenticates cron→edge-function calls

Both were committed to a public GitHub repo.

## Decisions Made

### 1. Rotate secrets instead of rewriting git history
Since both secrets can be rotated, we opted to rotate and move on rather than rewrite git history with `git filter-repo` or BFG. The old values in history are now dead credentials.

### 2. Migrate to Supabase's new API key system
Supabase introduced `sb_publishable_*` / `sb_secret_*` keys to replace the legacy JWT-based `anon` and `service_role` keys. We:
- Updated Vercel and `.env.local` env vars to the new key format
- Disabled legacy JWT-based API keys in the Supabase dashboard
- Updated edge functions to read `SUPABASE_SECRET_KEYS` (JSON dict) instead of deprecated `SUPABASE_SERVICE_ROLE_KEY`

### 3. Use Supabase Vault for cron job secrets
Cron jobs (pg_cron + pg_net) previously had secrets baked into the SQL string at schedule time. Now they resolve secrets at runtime via `vault.decrypted_secrets`. Two vault entries:
- `sync_secret` — the rotated `x-sync-secret` value
- `anon_key` — the `sb_publishable_*` key (needed by Supabase API gateway even when `verify_jwt=false`)

### 4. Disable JWT verification on `sync-results` edge function
Previously `sync-results` had `verify_jwt=true` while `sync-fixtures` had `verify_jwt=false`. Since the new `sb_secret_*` keys aren't JWTs, we disabled JWT verification on `sync-results` too. Both edge functions now authenticate solely via `x-sync-secret` header.

### 5. API gateway still requires Authorization header
Even with `verify_jwt=false`, the Supabase API gateway rejects requests without an `Authorization: Bearer <key>` header. The cron jobs now include the publishable key from vault for this purpose. The `snapshot-rankings-daily` cron targets Vercel (not Supabase gateway) so it doesn't need this header.

## What Changed

### Files modified (commit `99677d0`)
- `supabase/functions/sync-results/index.ts` — use `SUPABASE_SECRET_KEYS` env var
- `supabase/functions/sync-fixtures/index.ts` — use `SUPABASE_SECRET_KEYS` env var
- `supabase/migrations/010_cron_secrets_to_vault.sql` — vault entries + cron jobs using vault
- `supabase/migrations/011_drop_jwt_from_cron.sql` — remove Authorization header from sync-results cron
- `supabase/migrations/012_cron_add_anon_header.sql` — add anon key header for API gateway

### Dashboard changes (manual, not in code)
- **API Keys → Legacy tab** — "Disable JWT-based API keys" clicked
- **Edge Functions → sync-results → Settings** — "Enforce JWT Verification" turned off
- **Integrations → Vault → Secrets** — `sync_secret` and `anon_key` values set

### Env var changes
- **Vercel:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `sb_publishable_*`, `SUPABASE_SERVICE_ROLE_KEY` → `sb_secret_*`, `SYNC_SECRET` → new rotated value
- **`.env.local`:** same changes applied locally
- **Supabase edge function secrets:** `SYNC_SECRET` set via `supabase secrets set`

## Verification Done

- Local dev server loads correctly with new keys (no errors, 200 responses)
- `sync-fixtures` edge function tested manually via curl — returned `{"synced":104,"teamsLinked":0}` with 200
- Edge functions deployed via `supabase functions deploy`
- Production deploy triggered via `git push`

## Known Gaps / Follow-up

- **Production verification** — the Vercel redeploy was triggered but not verified in this session. The cron jobs fire at :00/:30 and :10/:40 — check the first cycle after deploy.
- **`actions/fixtures.ts` and `actions/results.ts`** — these server actions also call edge functions with `x-sync-secret` from `process.env.SYNC_SECRET`. They should work since Vercel env vars were updated, but worth verifying.
- **`lib/supabase/admin.ts`** — uses `SUPABASE_SERVICE_ROLE_KEY` from process.env. The Vercel env var was updated to `sb_secret_*` format. Verify the Supabase JS client accepts this key format for admin operations.
- **Migration 010 has stale content on disk** — it was edited after being pushed (to remove the service_role_key vault entry and Authorization header). The on-disk version differs from what was actually applied. Migrations 011 and 012 correct this, but the 010 file in the repo doesn't match what ran. Cosmetic issue only.

## Suggested Skills

- `/verify` — to confirm production works end-to-end after the Vercel redeploy
- `/security-review` — to audit the codebase for any remaining secret exposure
- `/code-review` — to review the changes in commit `99677d0`
