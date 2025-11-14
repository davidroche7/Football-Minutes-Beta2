import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../server/db/prisma.ts';

const requirePlayerId = (req: VercelRequest): string => {
  const playerId = typeof req.query.playerId === 'string' ? req.query.playerId : null;
  if (!playerId) {
    throw new Error('playerId parameter is required');
  }
  return playerId;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const playerId = requirePlayerId(req);

    if (req.method === 'GET') {
      const player = await prisma.player.findUnique({ where: { id: playerId } });
      if (!player) return res.status(404).json({ error: 'Player not found' });
      return res.status(200).json({ data: player });
    }

    if (req.method === 'PATCH') {
      const updates: Record<string, unknown> = {};
      if (typeof req.body?.displayName === 'string') {
        updates.displayName = req.body.displayName.trim();
      }
      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'squadNumber')) {
        updates.squadNumber = typeof req.body?.squadNumber === 'number' ? req.body.squadNumber : null;
      }
      if (Array.isArray(req.body?.preferredPositions)) {
        updates.preferredPositions = req.body.preferredPositions.map((pos: string) => pos.trim());
      }
      const player = await prisma.player.update({
        where: { id: playerId },
        data: updates,
      });
      return res.status(200).json({ data: player });
    }

    if (req.method === 'DELETE') {
      const player = await prisma.player.update({
        where: { id: playerId },
        data: { removedAt: new Date(), updatedAt: new Date() },
      });
      return res.status(200).json({ data: player });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Player detail API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
