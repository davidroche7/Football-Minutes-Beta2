#!/usr/bin/env tsx
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { PrismaClient, type Prisma, VenueType, MatchStatus, SquadRole, AwardType } from '@prisma/client';

interface SeedPlayer {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  removedAt?: string | null;
}

interface SeedMatch {
  id: string;
  date: string;
  opponent: string;
  players: string[];
  allocation?: {
    quarters?: Array<{
      quarter: number;
      slots?: Array<{ player: string; position: string; minutes: number; wave?: string }>;
    }>;
    summary?: Record<string, number>;
    warnings?: string[];
  };
  createdAt?: string;
  lastModifiedAt?: string;
  editHistory?: unknown;
  result?: {
    venue?: string;
    result?: string;
    goalsFor?: number;
    goalsAgainst?: number;
    playerOfMatch?: string;
    honorableMentions?: string[];
    scorers?: string[];
  };
}

interface SeedPayload {
  matches?: SeedMatch[];
  playersData?: {
    players?: SeedPlayer[];
    audit?: unknown;
  };
}

const prisma = new PrismaClient();

const normaliseName = (value: string) => value.trim().toLowerCase();

const resolveVenue = (seedVenue?: string): VenueType => {
  if (!seedVenue) return VenueType.HOME;
  const token = seedVenue.trim().toUpperCase();
  if (token === 'AWAY') return VenueType.AWAY;
  if (token === 'NEUTRAL') return VenueType.NEUTRAL;
  return VenueType.HOME;
};

const resolveStatus = (match: SeedMatch): MatchStatus => {
  return match.result ? MatchStatus.FINAL : MatchStatus.DRAFT;
};

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    throw new Error('Usage: tsx scripts/db/seed-from-json.ts <path-to-seed-json>');
  }

  const teamId =
    process.env.SEED_TEAM_ID ?? process.env.VITE_TEAM_ID ?? process.env.TEAM_ID ?? null;
  if (!teamId) {
    throw new Error('SEED_TEAM_ID (or VITE_TEAM_ID) environment variable is required.');
  }
  const teamName = process.env.SEED_TEAM_NAME ?? 'Football Minutes Team';

  const resolvedPath = resolve(fileArg);
  const raw = await readFile(resolvedPath, 'utf8');
  const payload: SeedPayload = JSON.parse(raw);
  const players = payload.playersData?.players ?? [];
  const matches = payload.matches ?? [];

  console.log(`Seeding team ${teamName} (${teamId}) from ${resolvedPath}`);
  console.log(`Players: ${players.length}, Matches: ${matches.length}`);

  await prisma.$transaction([
    prisma.matchAward.deleteMany({ where: { match: { teamId } } }),
    prisma.matchPlayer.deleteMany({ where: { match: { teamId } } }),
    prisma.match.deleteMany({ where: { teamId } }),
    prisma.player.deleteMany({ where: { teamId } }),
  ]);

  await prisma.team.upsert({
    where: { id: teamId },
    update: {
      name: teamName,
      updatedAt: new Date(),
    },
    create: {
      id: teamId,
      name: teamName,
    },
  });

  const playerIdByName = new Map<string, string>();

  for (const player of players) {
    const key = normaliseName(player.name);
    const created = await prisma.player.create({
      data: {
        id: player.id,
        teamId,
        displayName: player.name,
        createdAt: player.createdAt ? new Date(player.createdAt) : undefined,
        updatedAt: player.updatedAt ? new Date(player.updatedAt) : undefined,
        removedAt: player.removedAt ? new Date(player.removedAt) : null,
      },
    });
    playerIdByName.set(key, created.id);
  }

  const ensurePlayer = async (name: string): Promise<string> => {
    const key = normaliseName(name);
    const existing = playerIdByName.get(key);
    if (existing) return existing;
    throw new Error(`Unknown player "${name}" while seeding matches.`);
  };

  for (const match of matches) {
    const fixtureDate = new Date(match.date);
    const createdAt = match.createdAt ? new Date(match.createdAt) : undefined;
    const updatedAt = match.lastModifiedAt ? new Date(match.lastModifiedAt) : createdAt;
    const matchRecord = await prisma.match.create({
      data: {
        id: match.id,
        teamId,
        fixtureDate,
        kickoffTime: match.time ?? null,
        opponent: match.opponent || 'Unknown',
        venue: resolveVenue(match.result?.venue),
        status: resolveStatus(match),
        allocation: match.allocation ?? {},
        result: match.result ?? {},
        editHistory: match.editHistory ?? [],
        createdAt,
        updatedAt,
      },
    });

    const allocationSummary = match.allocation?.summary ?? {};
    const positionsMap = new Map<string, Set<string>>();
    match.allocation?.quarters?.forEach((quarter) => {
      quarter.slots?.forEach((slot) => {
        const key = normaliseName(slot.player);
        if (!positionsMap.has(key)) {
          positionsMap.set(key, new Set());
        }
        positionsMap.get(key)!.add(slot.position);
      });
    });
    const matchPlayerNames = new Set<string>([
      ...match.players,
      ...Object.keys(allocationSummary),
    ]);
    const matchPlayersData: Prisma.MatchPlayerCreateManyInput[] = [];
    for (const name of matchPlayerNames) {
      const playerId = await ensurePlayer(name);
      const key = normaliseName(name);
      matchPlayersData.push({
        id: `${match.id}_${playerId}`,
        matchId: matchRecord.id,
        playerId,
        role: SquadRole.STARTER,
        minutes: allocationSummary[name] ?? 0,
        positions: Array.from(positionsMap.get(key) ?? []),
      });
    }
    if (matchPlayersData.length > 0) {
      await prisma.matchPlayer.createMany({ data: matchPlayersData });
    }

    const awardsData: Prisma.MatchAwardCreateManyInput[] = [];
    const scorerCounts = new Map<string, number>();
    match.result?.scorers?.forEach((name) => {
      scorerCounts.set(name, (scorerCounts.get(name) ?? 0) + 1);
    });
    for (const [name, count] of scorerCounts.entries()) {
      const playerId = await ensurePlayer(name);
      awardsData.push({
        id: `${match.id}_${playerId}_SCORER`,
        matchId: matchRecord.id,
        playerId,
        type: AwardType.SCORER,
        count,
      });
    }
    const hmList = match.result?.honorableMentions ?? [];
    for (const name of hmList) {
      const playerId = await ensurePlayer(name);
      awardsData.push({
        id: `${match.id}_${playerId}_HM`,
        matchId: matchRecord.id,
        playerId,
        type: AwardType.HONORABLE_MENTION,
        count: 1,
      });
    }
    if (awardsData.length > 0) {
      await prisma.matchAward.createMany({ data: awardsData });
    }
  }

  console.log(`Seed complete: ${players.length} players, ${matches.length} matches`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
