import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../server/db/prisma.ts';
import { ensureTeamPlayer, toFixtureSummary, loadMatch } from './_helpers';

const requireTeamId = (req: VercelRequest): string => {
  if (typeof req.query.teamId === 'string') {
    return req.query.teamId;
  }
  if (typeof req.body?.teamId === 'string') {
    return req.body.teamId;
  }
  throw new Error('teamId is required');
};

const parseDate = (value: unknown): Date => {
  if (typeof value !== 'string') {
    throw new Error('fixtureDate must be a string');
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('fixtureDate is invalid');
  }
  return date;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const teamId = requireTeamId(req);
      const matches = await prisma.match.findMany({
        where: { teamId },
        orderBy: { fixtureDate: 'desc' },
        include: {
          players: { include: { player: true } },
          awards: true,
        },
      });
      return res.status(200).json({ data: matches.map(toFixtureSummary) });
    }

    if (req.method === 'POST') {
      const teamId = requireTeamId(req);
      const opponent = typeof req.body?.opponent === 'string' ? req.body.opponent.trim() : null;
      if (!opponent) {
        return res.status(400).json({ error: 'opponent is required' });
      }
      const fixtureDate = parseDate(req.body?.fixtureDate);
      const kickoffTime = typeof req.body?.kickoffTime === 'string' ? req.body.kickoffTime : null;
      const venueType = typeof req.body?.venueType === 'string' ? req.body.venueType : 'HOME';
      const match = await prisma.match.create({
        data: {
          teamId,
          fixtureDate,
          kickoffTime,
          opponent,
          venue: venueType,
          status: 'DRAFT',
          allocation: {},
          result: null,
          editHistory: [],
        },
      });

      if (Array.isArray(req.body?.squad)) {
        const entries = [] as Array<{ matchId: string; playerId: string; role: 'STARTER' | 'BENCH' }>;
        for (const player of req.body.squad) {
          if (typeof player?.playerId !== 'string') continue;
          await ensureTeamPlayer(teamId, player.playerId);
          entries.push({ matchId: match.id, playerId: player.playerId, role: player.role === 'BENCH' ? 'BENCH' : 'STARTER' });
        }
        if (entries.length > 0) {
          await prisma.matchPlayer.createMany({ data: entries });
        }
      }

      const created = await loadMatch(match.id);
      if (!created) {
        throw new Error('Failed to load match after creation');
      }
      return res.status(201).json({ data: toFixtureSummary(created) });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Fixtures/index API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
