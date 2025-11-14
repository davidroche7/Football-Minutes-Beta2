# Football Minutes (Beta2)

> Comprehensive team management tool for tracking your football season - lineups, stats, and fair playing time distribution.

This repository powers the refreshed “Football Minutes Beta2” deployment. It keeps the UI/UX you see at https://football-minutes-beta.vercel.app/ while rebuilding the backend around Prisma + Vercel serverless functions so match data persists consistently across browsers.

## ✨ Features

- **Smart Allocation**: Automatic fair distribution of playing minutes across 4 quarters
- **Flexible Rosters**: Support for 5-15 players with GK rotation and mandatory outfield time
- **Interactive Editor**: Drag/drop quarter editor with real-time validation
- **Match Management**: Complete flow for recording matches, scores, awards, and lineups
- **Season Analytics**: Player stats, minutes tracking, goals, awards, and audit history
- **Data Import**: Import historical data from Excel spreadsheets
- **Secure Auth**: Session-based authentication with CSRF protection
- **Rules Engine**: Configurable fairness rules and timing constraints

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ and npm
- **PostgreSQL** 15+ (via Docker, local, or cloud)

### Installation

```bash
# Clone and install
git clone git@github.com:davidroche7/Football-Minutes-Beta2.git
cd Football-Minutes-Beta2
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database URL and session secrets

# Generate Prisma client (runs in postinstall too)
npx prisma generate

# Start Vite dev server
npm run dev

# Optional: run `vercel dev` if you need local serverless endpoints
```

The Vite dev server runs on **http://localhost:3000**. For API testing, use `vercel dev` in a separate terminal to run the serverless functions locally.

### Default Credentials

Two accounts are pre-configured:

- **Coach**: `coach` / `CoachSecure1!`
- **Manager**: `manager` / `ManagerSecure2@`

## 📖 Documentation

- **[Development Guide](./docs/DEVELOPMENT.md)** - Local development setup, workflows, and troubleshooting
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Deploy to Vercel, Railway, Heroku, Docker, or VPS
- **[Architecture Decision Records](./docs/adr/)** - Key architectural decisions and rationale
- **[API Documentation](./docs/api-surface-v2.md)** - REST API endpoints reference
- **[Security Guide](./docs/security.md)** - Authentication, CSRF, and session management
- **Seed Snapshots**: See `data/seed/README.md` + `docs/adr/003-seed-data-preservation.md` for how we preserve the live dataset

## 🏗️ Architecture

```
## 🌱 Seed Data & Migration

- The latest canonical export lives in `data/seed/football-minutes-seed-2025-11-14.json` (7 matches, 15 players).
- Update `data/seed/seed-manifest.json` whenever you capture a fresh export via `/migrate-data.html`.
- Planned scripts (`scripts/db/seed-from-json.ts`) will hydrate Postgres via Prisma migrations; until then, never delete the seed files.

Frontend (Vite + React)     API Layer (Vercel Functions)      Database
┌────────────────────────┐  ┌─────────────────────────────┐   ┌──────────────┐
│ React SPA (TypeScript) │──▶ players.ts / fixtures.ts ...│──▶│ PostgreSQL   │
│ Tailwind, Vitest       │  │ Prisma Client per function  │   │ (Neon/Vercel)│
└────────────────────────┘  └─────────────────────────────┘   └──────────────┘
             ▲                          ▲
             │                          │
     Local dev via Vite        Seed data ↔ Prisma migrations
```

We are in the middle of migrating from an Express wrapper (`server/dev-server.ts`, `server/services/**`) to native serverless handlers described in [ADR 004](./docs/adr/004-serverless-prisma-vercel.md). See `docs/ADR-CLEANUP.md` for the list of legacy assets scheduled for removal.

### Tech Stack

**Frontend**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS
- Vitest (testing)

**Backend (target state)**
- Node.js 20 + TypeScript
- Prisma ORM + PostgreSQL
- Vercel Serverless Functions (`api/**/*.ts`)
- Zod (validation helpers)

**DevOps**
- Docker support
- Railway/Heroku ready
- Vercel deployment
- GitHub Actions ready

## 🧪 Testing & Quality

Before committing or deploying, run the full suite:

```bash
npm run lint
npm run typecheck
npm run test -- --run
npm run test:coverage   # optional
npx vitest run api/*.test.ts  # focused serverless API tests
```

A deployment checklist will eventually include automated smoke tests hitting `/api/players` and `/api/fixtures` to ensure Prisma bundles correctly on Vercel.

## 📁 Project Structure

```
Football-Minutes-Beta2/
├── src/                 # React application
│   ├── components/
│   ├── lib/
│   └── config/
├── api/                 # Vercel serverless handlers (Prisma)
│   ├── players.ts
│   ├── fixtures.ts
│   └── …
├── server/db/prisma.ts  # Prisma client singleton (shared)
├── prisma/              # Prisma schema & migrations
├── data/seed/           # Canonical browser exports
├── docs/                # README, ADRs, guides
└── scripts/             # Tooling (imports, builds, etc.)
```

## How It Works

### Match Structure

- **4 quarters** × **10 minutes** each
- **5 positions per quarter**: 1 GK, 2 DEF, 2 ATT

### Time Blocks

- **GK**: Plays the full 10-minute quarter
- **Outfield (DEF/ATT)**: Two 5-minute shifts (0–5 minutes and 5–10 minutes)
- **Sub**: Not playing (0 minutes)

### Fairness Rules

1. Minimize variance between player total minutes
2. No player plays more than 5 minutes more than another (where possible)
3. Players assigned GK must get at least one 5-minute outfield block
4. All quarters must be fully staffed

## ⚙️ Configuration

### Fairness Rules

Rule settings are configured in `src/config/rules.ts` and can be overridden via the Rules Engine tab in the UI. Changes persist to the database when using API mode.

### Environment Variables

See `.env.example` for all configuration options. Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `FFM_SESSION_SECRET` - Session signing secret (32+ characters)
- `VITE_USE_API` - Enable backend API mode (vs. localStorage)
- `VITE_TEAM_ID` - Team UUID for API requests

For detailed environment setup, see the [Development Guide](./docs/DEVELOPMENT.md).

## 🚢 Deployment

See the **[Deployment Guide](./docs/DEPLOYMENT.md)** for platform-specific instructions:

- **Vercel** - Zero-config serverless deployment
- **Railway** - One-click deploy with PostgreSQL
- **Heroku** - Traditional PaaS deployment
- **Docker** - Container-based deployment
- **VPS** - Self-hosted with PM2 and Nginx

Quick deploy to Vercel:

```bash
vercel --prod
```

## 📊 Data Import

Import historical match data from Excel:

```bash
# Parse Excel file to JSON
npm run import:legacy

# Seed database from JSON
node scripts/db/seed-from-json.cjs
```

See [Development Guide](./docs/DEVELOPMENT.md#database-operations) for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes and test: `npm test && npm run typecheck`
4. Commit with clear messages
5. Push and create a pull request

See [Development Guide](./docs/DEVELOPMENT.md) for detailed workflow.

## 📝 License

MIT - see [LICENSE](./LICENSE) file for details

## 🐛 Support

- **Issues**: [GitHub Issues](https://github.com/davidroche7/Football-Minutes-Beta/issues)
- **Discussions**: [GitHub Discussions](https://github.com/davidroche7/Football-Minutes-Beta/discussions)
- **Documentation**: [docs/](./docs/)

## 📚 Further Reading

- [Architecture Decision Records](./docs/adr/) - Why we made key technical decisions
- [API Documentation](./docs/api-surface-v2.md) - REST API reference
- [Security Guide](./docs/security.md) - Authentication and security model
- [Data Model](./docs/data-model-v2.md) - Database schema and relationships
# Trigger rebuild with correct env vars
