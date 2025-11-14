import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../../server/db/prisma.ts';
import { ensureMatch } from '../_helpers';

interface LineupSlot {
  quarterNumber: number;
  wave: 'FULL' | 'FIRST' | 'SECOND';
  position: 'GK' | 'DEF' | 'ATT';
  playerId: string;
  minutes: number;
  isSubstitution?: boolean;
}

const normaliseWave = (slot: LineupSlot) => {
  if (slot.position === 'GK') return 'FULL';
  if (slot.wave === 'FIRST' || slot.wave === 'SECOND') return slot.wave;
  return 'FULL';
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
    const slots: LineupSlot[] = Array.isArray(req.body?.slots) ? req.body.slots : [];
    if (slots.length === 0) {
      return res.status(400).json({ error: 'slots are required' });
    }
    const match = await ensureMatch(fixtureId);
    const playerNameMap = new Map<string, string>();
    match.players.forEach((entry) => {
      if (entry.playerId) {
        playerNameMap.set(entry.playerId, entry.player?.displayName ?? 'Unknown');
      }
    });

    const allocationQuarters: Array<{ quarter: number; slots: any[] }> = [];
    const summary = new Map<string, number>();
    const playerMinutes = new Map<string, number>();
    const playerPositions = new Map<string, Set<string>>();

    slots.forEach((slot) => {
      const name = playerNameMap.get(slot.playerId);
      if (!name) {
        throw new Error(`Unknown player ${slot.playerId} in lineup payload`);
      }
      let quarter = allocationQuarters.find((q) => q.quarter === slot.quarterNumber);
      if (!quarter) {
        quarter = { quarter: slot.quarterNumber, slots: [] };
        allocationQuarters.push(quarter);
      }
      quarter.slots.push({
        player: name,
        playerId: slot.playerId,
        position: slot.position,
        minutes: slot.minutes,
        wave: normaliseWave(slot) === 'FIRST' ? 'first' : normaliseWave(slot) === 'SECOND' ? 'second' : undefined,
        isSubstitution: Boolean(slot.isSubstitution),
      });
      summary.set(name, (summary.get(name) ?? 0) + slot.minutes);
      playerMinutes.set(slot.playerId, (playerMinutes.get(slot.playerId) ?? 0) + slot.minutes);
      if (!playerPositions.has(slot.playerId)) {
        playerPositions.set(slot.playerId, new Set());
      }
      playerPositions.get(slot.playerId)!.add(slot.position);
    });

    await prisma.match.update({
      where: { id: fixtureId },
      data: {
        allocation: {
          quarters: allocationQuarters.sort((a, b) => a.quarter - b.quarter),
          summary: Object.fromEntries(summary.entries()),
          warnings: [],
        },
      },
    });

    for (const entry of match.players) {
      const minutes = playerMinutes.get(entry.playerId) ?? 0;
      const positions = Array.from(playerPositions.get(entry.playerId) ?? []);
      await prisma.matchPlayer.update({
        where: { id: entry.id },
        data: { minutes, positions },
      });
    }

    return res.status(200).json({ data: { id: fixtureId } });
  } catch (error) {
    console.error('Fixtures lineup API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
