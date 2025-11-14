import type { VercelRequest, VercelResponse } from '@vercel/node';
import { toFixtureDetail, ensureMatch } from '../../fixtures/_helpers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const fixtureId = req.query.fixtureId;
    if (typeof fixtureId !== 'string') {
      return res.status(400).json({ error: 'fixtureId is required' });
    }
    const match = await ensureMatch(fixtureId);
    return res.status(200).json({ data: toFixtureDetail(match) });
  } catch (error) {
    console.error('Fixtures detail API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
