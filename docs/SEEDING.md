# Seeding & Migration Plan

## Goals
- Load the canonical browser export (`data/seed/football-minutes-seed-2025-11-14.json`) into the new Prisma schema.
- Keep the seed process repeatable so future exports can be applied safely.

## Steps
1. **Migrations**
   - Run `npx prisma migrate dev --name init_beta2` to create the tables defined in `prisma/schema.prisma`.
   - Commit the generated SQL under `prisma/migrations/`.

2. **Seed Script (`scripts/db/seed-from-json.ts`)**
   - Read the JSON file path from CLI (`node scripts/db/seed-from-json.ts data/seed/football-minutes-seed-2025-11-14.json`).
   - Load/validate the structure (playersData.players, playersData.audit, matches[]).
   - Upsert Team (single record for now). Use existing TEAM_ID from env.
   - Upsert Players: preserve IDs from JSON, map props to Prisma `Player` fields.
   - Insert Matches: preserve IDs, store allocation/result/editHistory JSON.
   - Insert related `MatchPlayer` + `MatchAward` rows derived from allocation/result where useful.
   - Record operation in a `SeedSnapshot` table (id, checksum, appliedAt) for auditing.

3. **Verification**
   - Run `npx prisma studio` to confirm records.
   - Hit temporary API endpoints (or direct Prisma queries) to list players/matches.
   - Update `data/seed/seed-manifest.json` if the canonical data changes.

## Future Enhancements
- Add CLI options for dry-run vs apply.
- Support incremental updates (diff between seed versions).
- Integrate with CI to ensure migrations + seeding succeed before deployment.
