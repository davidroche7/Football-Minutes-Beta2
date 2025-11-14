# ADR 004: Prisma-Powered Serverless API on Vercel

## Status
Proposed

## Context
The previous beta combined an Express wrapper, server/services logic, and ad-hoc Vercel API routes. That hybrid approach never shipped a working deployment (Prisma client wasn’t bundled, functions timed out, and the express dev server referenced files that no longer existed). We need a predictable, modern backend that:
- Keeps the existing React/Vite SPA untouched.
- Uses the new seed data as source of truth.
- Runs entirely on Vercel serverless functions with Prisma for data access.

## Decision
1. Adopt Prisma ORM + Postgres as the single data access layer.
2. Implement each API endpoint as an independent Vercel serverless function under `api/`.
3. Configure `vercel.json` to include `node_modules/.prisma/**` and allocate sufficient memory/timeouts.
4. Drop the Express dev/prod servers; local dev will use `vercel dev` or lightweight wrappers that import the same handlers.

## Consequences
- Consistency: Frontend calls the same endpoints locally and in production.
- Simplicity: No duplicated service layer; serverless functions talk directly to Prisma.
- Deployment reliability: Prisma client is bundled explicitly, preventing runtime `MODULE_NOT_FOUND` errors.
- Dev experience: Hot reload via `vercel dev`, fewer scripts to maintain.

## Implementation Notes
- Keep existing request/response shapes in `src/lib/persistence.ts`, `src/lib/roster.ts`, `src/lib/statsClient.ts` to avoid frontend rewrites.
- Shared logic (validation, auth, helpers) lives in `api/_lib/` to prevent duplication.
- Vercel functions must handle authentication headers (x-ffm-actor, x-ffm-session, etc.) in line with the current client expectations.
- Testing: add Vitest suites for API handlers (using `@vercel/node` mock request/response) and integration smoke tests hitting the deployed endpoints.

## Risks / Mitigations
- **Schema drift:** lock down Prisma schema with migrations and document changes in seed manifest.
- **Cold starts:** allocate >512MB memory and keep functions minimal to reduce boot time; consider using the Prisma Data Proxy if needed.
- **Local dev:** ensure `vercel dev` instructions are documented so team members don’t rely on removed Express scripts.

## Next Steps
- Finalize Prisma schema and migrations.
- Scaffold API folders (`api/players`, `api/fixtures`, `api/stats`, etc.) with placeholders returning 501 until implemented.
- Update `vercel.json`, README, DEPLOYMENT guide, and CI plan to reflect the new architecture.
