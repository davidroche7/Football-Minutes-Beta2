import { Prisma, MatchStatus, VenueType } from '@prisma/client';
import { prisma } from '../../server/db/prisma.ts';

type MatchWithRelations = Prisma.MatchGetPayload<{
  include: {
    players: { include: { player: true } };
    awards: true;
  };
}>;

type FixtureStatus = 'DRAFT' | 'LOCKED' | 'FINAL';

type FixtureRole = 'STARTER' | 'BENCH';

type LineupWave = 'FULL' | 'FIRST' | 'SECOND';

type LineupPosition = 'GK' | 'DEF' | 'ATT';

type ResultCode = 'WIN' | 'DRAW' | 'LOSS' | 'ABANDONED' | 'VOID';

export interface ApiFixtureSummary {
  id: string;
  teamId: string;
  opponent: string;
  fixtureDate: string;
  kickoffTime: string | null;
  venueType: VenueType;
  status: FixtureStatus;
  createdAt: string;
  updatedAt: string;
  result?: {
    resultCode: ResultCode;
    teamGoals: number | null;
    opponentGoals: number | null;
  } | null;
}

export interface ApiFixtureDetail {
  fixture: ApiFixtureSummary;
  squad: Array<{
    id: string;
    playerId: string;
    displayName: string;
    role: FixtureRole;
    notes: string | null;
    removedAt: string | null;
  }>;
  quarters: Array<{
    id: string;
    fixtureId: string;
    quarterNumber: number;
    wave: LineupWave;
    position: LineupPosition;
    playerId: string;
    playerName: string;
    minutes: number;
    isSubstitution: boolean;
    squadRole: FixtureRole;
  }>;
  result: {
    result_code: ResultCode;
    team_goals: number | null;
    opponent_goals: number | null;
    player_name: string | null;
  } | null;
  awards: Array<{
    id: string;
    fixture_id: string;
    player_id: string | null;
    playerName: string | null;
    awardType: 'SCORER' | 'HONORABLE_MENTION' | 'ASSIST';
    count: number;
  }>;
}

const mapStatus = (status: MatchStatus): FixtureStatus => {
  if (status === 'FINAL') return 'FINAL';
  if (status === 'CONFIRMED') return 'LOCKED';
  return 'DRAFT';
};

const mapResultCode = (result?: any): ResultCode => {
  const code = typeof result?.result === 'string' ? result.result.toUpperCase() : null;
  if (code === 'WIN' || code === 'DRAW' || code === 'LOSS') {
    return code as ResultCode;
  }
  return 'VOID';
};

export const loadMatch = async (matchId: string): Promise<MatchWithRelations | null> => {
  return prisma.match.findUnique({
    where: { id: matchId },
    include: {
      players: { include: { player: true } },
      awards: true,
    },
  });
};

export const toFixtureSummary = (match: MatchWithRelations): ApiFixtureSummary => ({
  id: match.id,
  teamId: match.teamId,
  opponent: match.opponent,
  fixtureDate: match.fixtureDate.toISOString(),
  kickoffTime: match.kickoffTime,
  venueType: match.venue,
  status: mapStatus(match.status),
  createdAt: match.createdAt.toISOString(),
  updatedAt: match.updatedAt.toISOString(),
  result: match.result
    ? {
        resultCode: mapResultCode(match.result),
        teamGoals: typeof match.result.goalsFor === 'number' ? match.result.goalsFor : null,
        opponentGoals: typeof match.result.goalsAgainst === 'number' ? match.result.goalsAgainst : null,
      }
    : null,
});

const toLineupWave = (slot: any): LineupWave => {
  if (slot.position === 'GK') return 'FULL';
  if (slot.wave === 'first') return 'FIRST';
  if (slot.wave === 'second') return 'SECOND';
  return 'FULL';
};

export const toFixtureDetail = (match: MatchWithRelations): ApiFixtureDetail => {
  const allocation = (match.allocation ?? {}) as any;
  const squad = match.players.map((entry) => ({
    id: entry.id,
    playerId: entry.playerId,
    displayName: entry.player?.displayName ?? 'Unknown',
    role: entry.role,
    notes: null,
    removedAt: entry.player?.removedAt?.toISOString() ?? null,
  }));

  const quarters: ApiFixtureDetail['quarters'] = [];
  allocation?.quarters?.forEach((quarter: any) => {
    quarter.slots?.forEach((slot: any, index: number) => {
      quarters.push({
        id: `${match.id}_${quarter.quarter}_${index}`,
        fixtureId: match.id,
        quarterNumber: quarter.quarter,
        wave: toLineupWave(slot),
        position: slot.position,
        playerId: slot.playerId ?? '',
        playerName: slot.player,
        minutes: slot.minutes,
        isSubstitution: Boolean(slot.isSubstitution),
        squadRole: 'STARTER',
      });
    });
  });

  const result = match.result
    ? {
        result_code: mapResultCode(match.result),
        team_goals: typeof match.result.goalsFor === 'number' ? match.result.goalsFor : null,
        opponent_goals: typeof match.result.goalsAgainst === 'number' ? match.result.goalsAgainst : null,
        player_name: match.result.playerOfMatch ?? null,
      }
    : null;

  const awards = match.awards.map((award) => ({
    id: award.id,
    fixture_id: award.matchId,
    player_id: award.playerId,
    playerName: match.players.find((p) => p.playerId === award.playerId)?.player?.displayName ?? null,
    awardType: award.type,
    count: award.count,
  }));

  return {
    fixture: toFixtureSummary(match),
    squad,
    quarters,
    result,
    awards,
  };
};

export const ensureMatch = async (matchId: string) => {
  const match = await loadMatch(matchId);
  if (!match) {
    throw new Error('Match not found');
  }
  return match;
};

export const ensureTeamPlayer = async (teamId: string, playerId: string) => {
  const player = await prisma.player.findFirst({ where: { id: playerId, teamId } });
  if (!player) {
    throw new Error(`Player ${playerId} not found for team ${teamId}`);
  }
  return player;
};
