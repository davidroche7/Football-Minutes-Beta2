# ADR 005: Testing & QA Gates

## Status
Proposed

## Context
We want parity with the original Beta app while rebuilding persistence. To avoid regressions, every change must run through a documented test suite and deployment checklist.

## Decision
1. **Standard Test Commands**
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test -- --run`
   - `npx vitest run api/*.test.ts`
   - `npm run db:seed -- data/seed/football-minutes-seed-YYYY-MM-DD.json` (when DB needs canonical data)
2. **Automation**: GitHub Actions workflow (`.github/workflows/ci.yml`) runs the entire suite on every push/PR.
3. **Manual QA Checklist** (before deploying):
   - Seed the DB, run `vercel dev`, walk through match creation/editing/season stats, and confirm UI parity with screenshots.
   - Hit `/api/players` and `/api/fixtures` endpoints via curl to verify persistence.
   - Export new seed snapshot if data changed.

## Consequences
- Every feature ships with automated coverage, reducing regressions.
- Developers follow the same commands locally as CI runs, making failures reproducible.
- Manual QA ensures new deployments keep the “flashy” UX identical to the existing beta.

## Next Steps
- Reference this ADR in README/Development doc.
- Enforce CI status checks before merging into main.
