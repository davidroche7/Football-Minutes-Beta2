import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../../server/db/prisma.ts';
import { ensureMatch } from '../_helpers';

const mapResultText = (code: string | null): string | undefined => {
  if (!code) return undefined;
  const value = code.toLowerCase();
  if (value === 'win' || value === 'draw' || value === 'loss') {
    return value;
  }
  return undefined;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const fixtureId = req.query.fixtureId;
    if (typeof fixtureId !== 'string') {
      return res.status(400).json({ error: 'fixtureId is required' });
    }
    const { resultCode, teamGoals, opponentGoals, playerOfMatchId, awards } = req.body ?? {};
    const match = await ensureMatch(fixtureId);
    if (!resultCode || resultCode === 'VOID') {
      await prisma.match.update({
        where: { id: fixtureId },
        data: { result: null, status: 'CONFIRMED' },
      });
      await prisma.matchAward.deleteMany({ where: { matchId: fixtureId } });
      return res.status(200).json({ data: { id: fixtureId } });
    }

    let playerOfMatchName: string | undefined;
    if (playerOfMatchId) {
      const player = await prisma.player.findFirst({ where: { id: playerOfMatchId, teamId: match.teamId } });
      if (!player) {
        return res.status(400).json({ error: 'Unknown playerOfMatchId' });
      }
      playerOfMatchName = player.displayName;
    }

    const scorerNames: string[] = [];
    const honorableMentions: string[] = [];
    const awardCreates: Array<{ matchId: string; playerId: string | null; type: 'SCORER' | 'HONORABLE_MENTION' | 'ASSIST'; count: number }> = [];

    if (Array.isArray(awards)) {
      for (const award of awards) {
        if (!award) continue;
        if (award.awardType === 'SCORER') {
          const player = await prisma.player.findFirst({ where: { id: award.playerId, teamId: match.teamId } });
          if (!player) continue;
          for (let i = 0; i < (award.count ?? 1); i += 1) {
            scorerNames.push(player.displayName);
          }
          awardCreates.push({
            matchId: fixtureId,
            playerId: player.id,
            type: 'SCORER',
            count: award.count ?? 1,
          });
        } else if (award.awardType === 'HONORABLE_MENTION') {
          const player = await prisma.player.findFirst({ where: { id: award.playerId, teamId: match.teamId } });
          if (!player) continue;
          honorableMentions.push(player.displayName);
          awardCreates.push({
            matchId: fixtureId,
            playerId: player.id,
            type: 'HONORABLE_MENTION',
            count: 1,
          });
        }
      }
    }

    await prisma.match.update({
      where: { id: fixtureId },
      data: {
        status: 'FINAL',
        result: {
          result: mapResultText(resultCode),
          goalsFor: typeof teamGoals === 'number' ? teamGoals : null,
          goalsAgainst: typeof opponentGoals === 'number' ? opponentGoals : null,
          playerOfMatch: playerOfMatchName,
          honorableMentions,
          scorers: scorerNames,
        },
      },
    });

    await prisma.matchAward.deleteMany({ where: { matchId: fixtureId } });
    if (awardCreates.length > 0) {
      await prisma.matchAward.createMany({ data: awardCreates });
    }

    return res.status(200).json({ data: { id: fixtureId } });
  } catch (error) {
    console.error('Fixtures result API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
