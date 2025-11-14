# Potentially Removable Assets (pending confirmation)

These files/folders appear unused in the new serverless architecture. Do **not** delete until the following conditions are met:

| Path | Purpose | Replacement | Pre-removal checks |
|------|---------|-------------|--------------------|
| ~~`server/dev-server.ts`~~ | Removed (commit 065f2af) | `vercel dev` + direct API handlers | Update docs/scripts to reference `vercel dev` ✔ |
| ~~`server/production-server.ts`~~ | Removed (commit 065f2af) | Vercel serverless deployment | Ensure Dockerfile/Procfile are archived |
| ~~`server/services/*`~~ | Removed (commit 065f2af) | Prisma client inside API functions | Incorporate required business logic into new handlers |
| ~~`server/db/client.ts`~~ | Removed (commit 065f2af) | Prisma client | Confirm no code depends on the old pg Pool approach |
| `Dockerfile`, `Procfile` | Container/Heroku deploys | Vercel serverless | Decide if alternative deployment targets are required |
| `docs/HANDOVER*.md`, `NEXT-SESSION*.md` | Stale session notes | REBUILD-TODO + ADRs | Mine for useful info before deletion |
| `dist/verify-config.html`, `dist/check-env.html` | Legacy env checks | TBD | Ensure Vite build remains intact if removed |

Document actual deletions in ADR or detailed commit message once confirmed.
