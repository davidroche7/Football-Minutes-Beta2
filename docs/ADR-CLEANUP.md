# Potentially Removable Assets (pending confirmation)

These files/folders appear unused in the new serverless architecture. Do **not** delete until the following conditions are met:

| Path | Purpose | Replacement | Pre-removal checks |
|------|---------|-------------|--------------------|
| `server/dev-server.ts` | Express wrapper for local dev | `vercel dev` + direct API handlers | Ensure no npm script references it (`npm run dev` update) |
| `server/production-server.ts` | Express server for Railway/Heroku | Vercel serverless deployment | Confirm Dockerfile/Procfile no longer depend on it |
| `server/services/*` | Legacy PG services | Prisma client inside API functions | Migrate any business logic needed; ensure no imports remain |
| `server/db/client.ts` | pg Pool client | Prisma client | Verify no code imports `server/db/client` |
| `Dockerfile`, `Procfile` | Container/Heroku deploys | Vercel serverless | Decide if alternative deployment targets are required |
| `docs/HANDOVER*.md`, `NEXT-SESSION*.md` | Stale session notes | REBUILD-TODO + ADRs | Mine for useful info before deletion |
| `dist/verify-config.html`, `dist/check-env.html` | Legacy env checks | TBD | Ensure Vite build remains intact if removed |

Document actual deletions in ADR or detailed commit message once confirmed.
