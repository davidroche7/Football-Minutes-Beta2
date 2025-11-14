import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../../server/db/prisma';

const requirePlayerId = (req: VercelRequest): string => {
  const playerId = typeof req.query.playerId === 'string' ? req.query.playerId : null;
  if (!playerId) {
    throw new Error('playerId parameter is required');
  }
  return playerId;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const playerId = requirePlayerId(req);
    const player = await prisma.player.update({
      where: { id: playerId },
      data: { removedAt: null, updatedAt: new Date() },
    });
    return res.status(200).json({ data: player });
  } catch (error) {
    console.error('Player restore API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
