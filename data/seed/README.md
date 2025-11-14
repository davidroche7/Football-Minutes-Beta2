# Seed Data Instructions

This folder stores canonical snapshots of the production browser data so we can rebuild environments without losing historical matches.

1. Open the deployed app (current URL: https://football-minutes-beta.vercel.app/).
2. Navigate to `/migrate-data.html` (link in footer or append to the base URL).
3. Click **Download Backup** and save the JSON as `football-minutes-seed-<date>.json`.
4. Drop the file in this folder and commit it (omit sensitive tokens if any appear).
5. Record the snapshot details (date, match count, player count) in `seed-manifest.json`.

For now this folder is empty—once the export is captured, add:
- `seed-manifest.json` describing provenance.
- `football-minutes-seed-YYYY-MM-DD.json` with the actual data.

Do not modify these files manually; instead, re-export from the live app when the dataset changes.
