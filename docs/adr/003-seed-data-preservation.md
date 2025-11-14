# ADR 003: Seed Data Preservation Strategy

## Status
Proposed

## Context
The current beta deployment (https://football-minutes-beta.vercel.app/) stores all authoritative match and roster data in browser localStorage because serverless persistence is still being rebuilt. We must capture that data before restructuring the project or spinning up a new deployment (`Football-Minutes-Beta2`) so existing results, awards, and historical allocations are not lost.

## Decision
1. Treat the live browser export (`/migrate-data.html`) as the canonical seed until server persistence is restored.
2. Store each export in `data/seed/` with a timestamped filename and a manifest describing match/player counts plus provenance.
3. Require any environment rebuild (local, staging, prod) to ingest the latest seed before QA so UI parity (7 matches, current roster) can be verified.
4. Block destructive changes (schema rewrites, component removal) unless a fresh export is captured or we have migrated the previous seed into the database.

## Consequences
- We always have a restorable snapshot aligned with the UI the user validated.
- Git history clearly records when data changed and why.
- Additional discipline: before merging backend changes we must confirm the seed can still load, otherwise flag the regression explicitly to the user.

## Next Steps
- Capture `football-minutes-seed-<today>.json` via `/migrate-data.html` and store it under `data/seed/` alongside a `seed-manifest.json` file.
- Document the restore script/process once Prisma persistence is ready (expected to load the JSON into Postgres via a migration script).
