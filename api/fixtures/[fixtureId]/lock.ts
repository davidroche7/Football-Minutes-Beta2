import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../../server/db/prisma.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const fixtureId = req.query.fixtureId;
    if (typeof fixtureId !== 'string') {
      return res.status(400).json({ error: 'fixtureId is required' });
    }
    await prisma.match.update({
      where: { id: fixtureId },
      data: { status: 'CONFIRMED' },
    });
    return res.status(200).json({ data: { id: fixtureId } });
  } catch (error) {
    console.error('Fixtures lock API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
