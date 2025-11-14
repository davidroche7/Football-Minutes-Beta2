import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../server/db/prisma';

const requireTeamId = (req: VercelRequest): string => {
  const teamId = typeof req.query.teamId === 'string' ? req.query.teamId : null;
  if (!teamId) {
    throw new Error('teamId query parameter is required');
  }
  return teamId;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const teamId = requireTeamId(req);
    const matches = await prisma.match.findMany({
      where: { teamId },
      orderBy: { fixtureDate: 'desc' },
      include: {
        players: { include: { player: true } },
        awards: true,
      },
    });

    const matchesDTO = matches.map((match) => {
      const allocation = match.allocation as any;
      const playerNames = new Set<string>();
      match.players.forEach((entry) => {
        if (entry.player?.displayName) {
          playerNames.add(entry.player.displayName);
        }
      });
      allocation?.quarters?.forEach((quarter: any) => {
        quarter.slots?.forEach((slot: any) => {
          if (slot.player) {
            playerNames.add(slot.player);
          }
        });
      });

      const result = match.result as Record<string, any> | null;
      return {
        id: match.id,
        date: match.fixtureDate.toISOString(),
        opponent: match.opponent,
        players: Array.from(playerNames),
        allocation,
        result,
        createdAt: match.createdAt.toISOString(),
        lastModifiedAt: match.updatedAt.toISOString(),
      };
    });

    return res.status(200).json({ data: matchesDTO });
  } catch (error) {
    console.error('Fixtures API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
