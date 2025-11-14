# Football Minutes Beta2 – Rebuild Plan

> Goal: Keep the existing UI/UX and local data intact while rebuilding persistence, docs, and deployment under the new `Football-Minutes-Beta2` repo.

## 0. Safeguards (Must-Haves Before Coding)
- [ ] Export latest production browser data via `/migrate-data.html` and place it in `data/seed/football-minutes-seed-YYYY-MM-DD.json`.
- [ ] Update `data/seed/seed-manifest.json` with match/player counts and checksum.
- [ ] Capture UI snapshots (or Loom walkthrough) covering Match, Season Stats, Management tabs for regression comparison.
- [ ] Obtain confirmation that losing local data is unacceptable; cancel any risky change until a fresh export exists.

## 1. Repository Reset
- [ ] Create GitHub repo `Football-Minutes-Beta2` (private until stable) and push current code as baseline.
- [ ] Remove all "Fair Football Minutes" references from README/docs/app text (except legitimate fairness copy in UI).
- [ ] Add CODEOWNERS + CONTRIBUTING stub referencing new processes.
- [ ] Configure required branch protection and PR template once GitHub repo exists.

## 2. Documentation & ADRs
- [x] ADR 003 – Seed Data Preservation.
- [ ] ADR 004 – Serverless Persistence (Prisma + Vercel functions) replacing Express wrapper.
- [ ] ADR 005 – Testing & QA Gates (lint/typecheck/vitest + manual checklist before deploy).
- [ ] Update README + docs/ARCHITECTURE.md + DEPLOYMENT.md to match the new plan.

## 3. Codebase Cleanup
- [x] Delete unused Express server (`server/dev-server.ts`, `server/production-server.ts`, `server/services/**`) after migrating needed logic (done in commit 065f2af; rely on `vercel dev` going forward).
- [ ] Prune stale docs (`HANDOVER*.md`, legacy next-session notes) once content is folded into ADRs/to-do.
- [ ] Simplify `package.json` scripts (remove build:backend, express-specific commands) while keeping current Vite build identical.
- [ ] Ensure `npm run build` runs `tsc --noEmit`, `prisma generate`, and `vite build`.

## 4. Persistence Rebuild
- [ ] Finalize Prisma schema aligned with required UI data; run `npx prisma migrate dev`.
- [ ] Write seed import script (`scripts/db/seed-from-json.ts`) that loads `data/seed/*.json` into Postgres.
- [ ] Implement Vercel functions for:
  - [ ] `GET/POST /players`, `PATCH/DELETE /players/:id`, `POST /players/:id/restore`.
  - [ ] `GET/POST /fixtures`, `PATCH/DELETE /fixtures/:id`, `PUT /fixtures/:id/lineup`, `PUT /fixtures/:id/result`.
  - [ ] `GET /stats/team`, `GET /stats/players`, `GET /audit` (if needed).
- [ ] Configure `vercel.json` to include Prisma artifacts and increase function memory/timeouts.

## 5. Frontend Alignment
- [ ] Verify `src/lib/persistence.ts` + `src/lib/roster.ts` map exactly to the rebuilt endpoints (remove unused fallback logic once backend is reliable).
- [ ] Add Vitest coverage for persistence fallbacks, GK selector, drag/drop editing, and match summary analytics.
- [ ] Document manual QA script (log in, add player, create match, verify season stats) referencing UI snapshots.

## 6. Tooling & Deployment
- [ ] Set up GitHub Actions (lint → typecheck → vitest) and fail builds on errors.
- [ ] Create Vercel project `football-minutes-beta2`, configure env vars (DATABASE_URL, VITE_*). Add `VERCEL-ENV-SETUP.md` for new project.
- [ ] Add smoke tests hitting deployed `/api/health`, `/api/players`, `/api/fixtures` before approving release.
- [ ] Plan cutover: keep old beta live until Beta2 persistence verified with exported data (brownout plan documented).

## 7. Future Enhancements (Post-Rebuild Ideas)
- Match timeline / live commentary blocks inspired by BBC fixtures.
- Last-five form widget + league table card on Season Stats tab.
- Squad availability tracker (injuries, attendance) to help with selection decisions.

> For every checkbox above, call out if implementation risks changing UX/data before proceeding. Keep this file updated as tasks progress.
