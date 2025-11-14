import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../server/db/prisma';

const requireTeamId = (req: VercelRequest): string => {
  const teamId = typeof req.query.teamId === 'string' ? req.query.teamId : null;
  if (!teamId) {
    throw new Error('teamId query parameter is required');
  }
  return teamId;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const teamId = requireTeamId(req);
      const includeRemoved = req.query.includeRemoved === 'true';
      const players = await prisma.player.findMany({
        where: {
          teamId,
          ...(includeRemoved ? {} : { removedAt: null }),
        },
        orderBy: { displayName: 'asc' },
      });
      return res.status(200).json({ data: players });
    }

    if (req.method === 'POST') {
      const teamId = requireTeamId(req);
      const { displayName, squadNumber, preferredPositions } = req.body ?? {};
      if (!displayName || typeof displayName !== 'string') {
        return res.status(400).json({ error: 'displayName is required' });
      }
      const player = await prisma.player.create({
        data: {
          id: req.body?.id ?? undefined,
          teamId,
          displayName: displayName.trim(),
          squadNumber: typeof squadNumber === 'number' ? squadNumber : null,
          preferredPositions: Array.isArray(preferredPositions)
            ? preferredPositions.map((pos: string) => pos.trim())
            : [],
        },
      });
      return res.status(201).json({ data: player });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Players API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
